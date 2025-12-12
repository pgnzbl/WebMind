/**
 * WebMind Background Service Worker
 * 处理所有后台任务和 API 调用
 */

import storage from '../shared/storage.js';
import { createTaskRecord } from '../shared/models.js';
import AIService from './services/ai-service.js';

console.log('WebMind Background Service Worker started');

// 存储活跃的流式连接
const streamingConnections = new Map();

// 初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  // 初始化存储
  await storage.initialize();
  
  if (details.reason === 'install') {
    // 首次安装，打开欢迎页面
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

// 监听长连接（用于流式输出）
chrome.runtime.onConnect.addListener((port) => {
  console.log('New connection:', port.name);
  
  if (port.name === 'streaming') {
    const connectionId = Date.now().toString();
    streamingConnections.set(connectionId, { port, stopped: false });
    
    port.onMessage.addListener(async (message) => {
      if (message.type === 'GENERATE_STREAM') {
        await handleStreamingGenerate(connectionId, message.data, port);
      } else if (message.type === 'STOP_STREAM') {
        const conn = streamingConnections.get(connectionId);
        if (conn) {
          conn.stopped = true;
        }
      }
    });
    
    port.onDisconnect.addListener(() => {
      console.log('Connection disconnected:', connectionId);
      streamingConnections.delete(connectionId);
    });
  }
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.type);
  
  // 使用 Promise 处理异步操作
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理消息
 */
async function handleMessage(message, sender) {
  switch (message.type) {
    case 'DETECT_MODELS':
      return await handleDetectModels();
    
    case 'GENERATE_DOCUMENT':
      return await handleGenerateDocument(message.data);
    
    case 'VERIFY_API_KEY':
      return await handleVerifyApiKey(message.data);
    
    default:
      throw new Error('Unknown message type: ' + message.type);
  }
}

/**
 * 检测可用模型
 */
async function handleDetectModels() {
  try {
    const providers = await storage.getProviders();
    let totalModels = 0;
    
    for (const provider of providers) {
      if (!provider.apiKey || !provider.enabled) {
        continue;
      }
      
      try {
        const models = await AIService.detectModels(provider);
        await storage.updateProvider(provider.id, { models });
        totalModels += models.length;
      } catch (error) {
        console.error(`Failed to detect models for ${provider.name}:`, error);
      }
    }
    
    return {
      success: true,
      totalModels
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 流式生成文档
 */
async function handleStreamingGenerate(connectionId, data, port) {
  const { agentId, content, url, title } = data;
  
  // 创建任务记录
  const taskRecord = createTaskRecord({
    agentId,
    url,
    title,
    content,
    status: 'processing'
  });
  
  try {
    // 获取代理配置
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      throw new Error('代理不存在');
    }
    
    // 解析模型 ID（格式: providerId:modelName）
    if (!agent.modelId) {
      throw new Error('代理未配置模型');
    }
    
    const [providerId, modelName] = agent.modelId.split(':');
    if (!providerId || !modelName) {
      throw new Error('模型 ID 格式错误');
    }
    
    // 获取 provider 信息
    const provider = await storage.getProvider(providerId);
    if (!provider || !provider.apiKey) {
      throw new Error('AI 平台配置不完整，请检查 API Key');
    }
    
    // 尝试从已检测的模型中查找
    const models = await storage.getEnabledModels();
    let availableModel = models.find(m => m.id === modelName && m.providerId === providerId);
    
    // 如果未找到，可能是手动添加的模型
    if (!availableModel) {
      availableModel = {
        id: modelName,
        name: modelName,
        providerId: providerId,
        enabled: true
      };
    }
    
    taskRecord.modelId = agent.modelId;
    
    // 构建提示词
    const prompt = buildPrompt(agent, content);
    
    // 使用流式 API
    let fullContent = '';
    const connection = streamingConnections.get(connectionId);
    
    try {
      const stream = AIService.chatStream({
        model: availableModel,
        provider: provider,
        systemPrompt: agent.systemPrompt,
        userPrompt: prompt
      });
      
      for await (const chunk of stream) {
        // 检查是否被停止
        if (connection && connection.stopped) {
          console.log('Stream stopped by user');
          break;
        }
        
        fullContent += chunk;
        
        // 发送数据块给前端
        try {
          port.postMessage({
            type: 'STREAM_CHUNK',
            data: chunk
          });
        } catch (e) {
          console.error('Failed to send chunk:', e);
          break;
        }
      }
      
      // 检查是否被停止
      if (connection && connection.stopped) {
        taskRecord.status = 'cancelled';
        taskRecord.endTime = new Date().toISOString();
        await storage.addHistory(taskRecord);
        return;
      }
      
      // 发送完成消息
      port.postMessage({
        type: 'STREAM_COMPLETE',
        data: fullContent
      });
      
      // 更新任务记录
      taskRecord.status = 'completed';
      taskRecord.result = fullContent;
      taskRecord.endTime = new Date().toISOString();
      await storage.addHistory(taskRecord);
      
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      throw streamError;
    }
    
  } catch (error) {
    console.error('Stream generate failed:', error);
    
    // 发送错误消息
    try {
      port.postMessage({
        type: 'STREAM_ERROR',
        error: error.message
      });
    } catch (e) {
      console.error('Failed to send error:', e);
    }
    
    taskRecord.status = 'failed';
    taskRecord.error = error.message;
    taskRecord.endTime = new Date().toISOString();
    await storage.addHistory(taskRecord);
  }
}

/**
 * 生成文档（非流式，保留兼容性）
 */
async function handleGenerateDocument(data) {
  const { agentId, content, url, title, outputFormat } = data;
  
  // 创建任务记录
  const taskRecord = createTaskRecord({
    agentId,
    url,
    title,
    content,
    status: 'processing'
  });
  
  try {
    // 获取代理配置
    const agent = await storage.getAgent(agentId);
    if (!agent) {
      throw new Error('代理不存在');
    }
    
    // 解析模型 ID（格式: providerId:modelName）
    if (!agent.modelId) {
      throw new Error('代理未配置模型');
    }
    
    const [providerId, modelName] = agent.modelId.split(':');
    if (!providerId || !modelName) {
      throw new Error('模型 ID 格式错误');
    }
    
    // 获取 provider 信息（包含 API Key 和 baseURL）
    const provider = await storage.getProvider(providerId);
    if (!provider || !provider.apiKey) {
      throw new Error('AI 平台配置不完整，请检查 API Key');
    }
    
    // 尝试从已检测的模型中查找
    const models = await storage.getEnabledModels();
    let availableModel = models.find(m => m.id === modelName && m.providerId === providerId);
    
    // 如果未找到，可能是手动添加的模型
    if (!availableModel) {
      availableModel = {
        id: modelName,
        name: modelName,
        providerId: providerId,
        enabled: true
      };
    }
    
    taskRecord.modelId = agent.modelId;
    
    // 构建提示词
    const prompt = buildPrompt(agent, content);
    
    // 调用 AI 服务
    const result = await AIService.chat({
      model: availableModel,
      provider: provider,
      systemPrompt: agent.systemPrompt,
      userPrompt: prompt
    });
    
    // 格式化输出
    let formattedResult = result;
    if (outputFormat === 'docx') {
      // 这里可以添加 Word 格式转换逻辑
      // formattedResult = await convertToDocx(result);
    }
    
      // 更新任务记录
      taskRecord.status = 'completed';
      taskRecord.result = formattedResult;
      taskRecord.endTime = new Date().toISOString();
      
      await storage.addHistory(taskRecord);
    
    return {
      success: true,
      result: {
        content: formattedResult,
        taskId: taskRecord.id
      }
    };
  } catch (error) {
    console.error('Generate document failed:', error);
    
    taskRecord.status = 'failed';
    taskRecord.error = error.message;
    taskRecord.endTime = new Date().toISOString();
    
    await storage.addHistory(taskRecord);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 验证 API Key
 */
async function handleVerifyApiKey(data) {
  const { providerId, apiKey } = data;
  
  try {
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      throw new Error('提供商不存在');
    }
    
    const isValid = await AIService.verifyApiKey({
      ...provider,
      apiKey
    });
    
    return {
      success: true,
      valid: isValid
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 构建提示词
 */
function buildPrompt(agent, content) {
  let prompt = agent.config.promptTemplate || '请分析以下网页内容：\n\n{{content}}';
  prompt = prompt.replace('{{content}}', content);
  return prompt;
}

/**
 * 保持 Service Worker 活跃
 */
let keepAliveInterval;

function startKeepAlive() {
  keepAliveInterval = setInterval(() => {
    console.log('Keep alive ping');
  }, 20000); // 每 20 秒
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
}

// 启动保活
startKeepAlive();

// 监听扩展卸载
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service Worker suspending');
  stopKeepAlive();
});

