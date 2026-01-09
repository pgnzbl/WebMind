/**
 * WebMind Popup 主脚本
 */

import storage from '../shared/storage.js';
import { formatDate, truncate, downloadFile, copyToClipboard, copyAsRichText } from '../shared/utils.js';
import { renderMarkdown } from '../shared/markdown-renderer.js';
import { generateWordWithImages } from '../shared/word-generator.js';

// DOM 元素
const elements = {
  // 标签页
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // 生成文档页
  agentSelect: document.getElementById('agentSelect'),
  createAgentBtn: document.getElementById('createAgentBtn'),
  generateBtn: document.getElementById('generateBtn'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  progressSection: document.getElementById('progressSection'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  streamingSection: document.getElementById('streamingSection'),
  streamingContent: document.getElementById('streamingContent'),
  streamingStatus: document.getElementById('streamingStatus'),
  stopStreamBtn: document.getElementById('stopStreamBtn'),
  resultSection: document.getElementById('resultSection'),
  resultPreview: document.getElementById('resultPreview'),
  copyResultBtn: document.getElementById('copyResultBtn'),
  copyRichTextBtn: document.getElementById('copyRichTextBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  downloadMdBtn: document.getElementById('downloadMdBtn'),
  downloadDocxBtn: document.getElementById('downloadDocxBtn'),
  
  // 聊天模式
  documentModeSection: document.getElementById('documentModeSection'),
  documentModeButtonSection: document.getElementById('documentModeButtonSection'),
  chatModeSection: document.getElementById('chatModeSection'),
  chatInput: document.getElementById('chatInput'),
  chatSendBtn: document.getElementById('chatSendBtn'),
  
  // 配置页
  providersList: document.getElementById('providersList'),
  detectModelsBtn: document.getElementById('detectModelsBtn'),
  
  // 历史页
  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  
  // 设置按钮
  openSettings: document.getElementById('openSettings')
};

// 当前状态
let currentTab = null;
let currentTask = null;
let currentResult = null;
let streamingPort = null;
let isStreaming = false;

/**
 * 初始化
 */
async function initialize() {
  // 初始化存储
  await storage.initialize();
  
  // 绑定事件
  bindEvents();
  
  // 加载当前页面信息
  await loadCurrentPageInfo();
  
  // 加载代理列表
  await loadAgents();
  
  // 加载提供商配置
  await loadProviders();
  
  // 加载历史记录
  await loadHistory();
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 标签页切换
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // 生成文档
  elements.generateBtn.addEventListener('click', handleGenerate);
  
  // 创建代理
  elements.createAgentBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Agent 选择变化
  elements.agentSelect.addEventListener('change', handleAgentChange);
  
  // 聊天发送
  elements.chatSendBtn.addEventListener('click', handleChatSend);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleChatSend();
    }
  });
  
  // 停止流式生成
  elements.stopStreamBtn.addEventListener('click', handleStopStream);
  
  // 复制结果
  elements.copyResultBtn.addEventListener('click', handleCopyResult);
  
  // 复制为富文本
  elements.copyRichTextBtn.addEventListener('click', handleCopyAsRichText);
  
  // 重新生成
  elements.regenerateBtn.addEventListener('click', handleRegenerate);
  
  // 下载文档
  elements.downloadMdBtn.addEventListener('click', () => handleDownload('markdown'));
  elements.downloadDocxBtn.addEventListener('click', () => handleDownload('docx'));
  
  // 检测模型
  elements.detectModelsBtn.addEventListener('click', handleDetectModels);
  
  // 清空历史
  elements.clearHistoryBtn.addEventListener('click', handleClearHistory);
  
  // 打开设置
  elements.openSettings.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

/**
 * 切换标签页
 */
function switchTab(tabName) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}Tab`);
  });
}

/**
 * 加载当前页面信息
 */
async function loadCurrentPageInfo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    
    if (tab) {
      elements.pageTitle.textContent = tab.title || '无标题';
      elements.pageUrl.textContent = tab.url || '';
    }
  } catch (error) {
    console.error('Failed to load page info:', error);
    elements.pageTitle.textContent = '获取失败';
  }
}

/**
 * 加载代理列表
 */
async function loadAgents() {
  const agents = await storage.getAgents();
  
  elements.agentSelect.innerHTML = '';
  
  if (agents.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '请先创建代理';
    elements.agentSelect.appendChild(option);
    elements.generateBtn.disabled = true;
    return;
  }
  
  agents.forEach(agent => {
    const option = document.createElement('option');
    option.value = agent.id;
    option.textContent = agent.name;
    elements.agentSelect.appendChild(option);
  });
  
  // 选择默认代理
  const settings = await storage.getSettings();
  if (settings.defaultAgentId) {
    elements.agentSelect.value = settings.defaultAgentId;
  }
  
  // 检查选中 Agent 的模式
  await handleAgentChange();
}

/**
 * Agent 选择变化处理
 */
async function handleAgentChange() {
  const agentId = elements.agentSelect.value;
  
  if (!agentId) {
    elements.generateBtn.disabled = true;
    elements.chatSendBtn.disabled = true;
    return;
  }
  
  const agent = await storage.getAgent(agentId);
  if (!agent) {
    return;
  }
  
  const mode = agent.mode || 'document';
  
  if (mode === 'chat') {
    switchToChatMode();
  } else {
    switchToDocumentMode();
  }
}

/**
 * 切换到文档生成模式
 */
function switchToDocumentMode() {
  elements.documentModeSection.classList.remove('hidden');
  elements.documentModeButtonSection.classList.remove('hidden');
  elements.chatModeSection.classList.add('hidden');
  elements.generateBtn.disabled = false;
  elements.chatSendBtn.disabled = true;
}

/**
 * 切换到聊天模式
 */
function switchToChatMode() {
  elements.documentModeSection.classList.add('hidden');
  elements.documentModeButtonSection.classList.add('hidden');
  elements.chatModeSection.classList.remove('hidden');
  elements.generateBtn.disabled = true;
  elements.chatSendBtn.disabled = false;
}

/**
 * 加载提供商配置
 */
async function loadProviders() {
  const providers = await storage.getProviders();
  
  elements.providersList.innerHTML = '';
  
  providers.forEach(provider => {
    const div = document.createElement('div');
    div.className = 'provider-item';
    div.innerHTML = `
      <div class="provider-header">
        <span class="provider-name">${provider.name}</span>
        <span class="provider-status ${provider.enabled ? 'active' : ''}">
          ${provider.enabled ? '已启用' : '未配置'}
        </span>
      </div>
      <input 
        type="password" 
        class="provider-input" 
        placeholder="输入 API Key"
        value="${provider.apiKey || ''}"
        data-provider-id="${provider.id}"
      >
      ${provider.models && provider.models.length > 0 ? `
        <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
          可用模型: ${provider.models.length} 个
        </div>
      ` : ''}
    `;
    
    // 绑定输入事件
    const input = div.querySelector('.provider-input');
    input.addEventListener('blur', async (e) => {
      await handleUpdateApiKey(provider.id, e.target.value);
    });
    
    elements.providersList.appendChild(div);
  });
}

/**
 * 更新 API Key
 */
async function handleUpdateApiKey(providerId, apiKey) {
  try {
    await storage.updateProvider(providerId, { 
      apiKey,
      enabled: apiKey.trim() !== ''
    });
    
    await loadProviders();
  } catch (error) {
    console.error('Failed to update API key:', error);
    alert('保存失败: ' + error.message);
  }
}

/**
 * 检测可用模型
 */
async function handleDetectModels() {
  elements.detectModelsBtn.disabled = true;
  elements.detectModelsBtn.textContent = '检测中...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DETECT_MODELS'
    });
    
    if (response.success) {
      alert(`检测完成！\n共发现 ${response.totalModels} 个可用模型`);
      await loadProviders();
    } else {
      alert('检测失败: ' + response.error);
    }
  } catch (error) {
    console.error('Failed to detect models:', error);
    alert('检测失败: ' + error.message);
  } finally {
    elements.detectModelsBtn.disabled = false;
    elements.detectModelsBtn.textContent = '🔍 检测可用模型';
  }
}

/**
 * 处理生成文档（流式输出）
 */
async function handleGenerate() {
  const agentId = elements.agentSelect.value;
  
  if (!agentId) {
    alert('请先选择一个代理');
    return;
  }
  
  // 显示进度
  elements.generateBtn.disabled = true;
  elements.progressSection.classList.remove('hidden');
  elements.resultSection.classList.add('hidden');
  elements.streamingSection.classList.add('hidden');
  setProgress(10, '正在提取网页内容...');
  
  try {
    // 提取页面内容
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查页面是否支持 Content Script
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      throw new Error('当前页面不支持内容提取，请在普通网页上使用');
    }
    
    let content;
    try {
      // 尝试发送消息给 Content Script
      content = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' });
    } catch (e) {
      // 如果 Content Script 未加载，先注入它
      console.log('Content Script not ready, injecting...');
      
      try {
        // 注入 Content Script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js']
        });
        
        // 等待一小段时间让 Content Script 初始化
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 重试发送消息
        content = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_CONTENT' });
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
        throw new Error('无法注入内容提取脚本，请刷新页面后重试');
      }
    }
    
    if (!content || !content.text) {
      throw new Error('未能提取到网页内容，请确保页面已完全加载');
    }
    
    setProgress(30, '正在连接 AI...');
    
    // 使用流式生成
    await handleStreamingGenerate(agentId, content.text, tab, false);
    
  } catch (error) {
    console.error('Generate failed:', error);
    alert('生成失败: ' + error.message);
    elements.progressSection.classList.add('hidden');
    elements.streamingSection.classList.add('hidden');
  } finally {
    elements.generateBtn.disabled = false;
  }
}

/**
 * 处理聊天发送
 */
async function handleChatSend() {
  const agentId = elements.agentSelect.value;
  const userInput = elements.chatInput.value.trim();
  
  if (!agentId) {
    alert('请先选择一个代理');
    return;
  }
  
  if (!userInput) {
    alert('请输入消息');
    return;
  }
  
  // 禁用输入和按钮
  elements.chatInput.disabled = true;
  elements.chatSendBtn.disabled = true;
  
  // 清空输入框
  elements.chatInput.value = '';
  
  // 隐藏结果区域，显示流式输出
  elements.resultSection.classList.add('hidden');
  elements.streamingSection.classList.remove('hidden');
  elements.streamingContent.textContent = '';
  elements.streamingStatus.textContent = '生成中...';
  
  try {
    // 获取当前标签页信息（用于记录）
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 使用流式生成，传入用户输入作为内容
    await handleStreamingGenerate(agentId, userInput, tab, true);
    
  } catch (error) {
    console.error('Chat send failed:', error);
    alert('发送失败: ' + error.message);
    elements.streamingSection.classList.add('hidden');
  } finally {
    elements.chatInput.disabled = false;
    elements.chatSendBtn.disabled = false;
  }
}

/**
 * 处理流式生成
 * @param {string} agentId - Agent ID
 * @param {string} content - 内容（网页内容或用户输入）
 * @param {object} tab - 标签页信息
 * @param {boolean} isChatMode - 是否为聊天模式
 */
async function handleStreamingGenerate(agentId, content, tab, isChatMode = false) {
  // 隐藏进度条，显示流式输出区域
  elements.progressSection.classList.add('hidden');
  elements.streamingSection.classList.remove('hidden');
  elements.streamingContent.textContent = '';
  elements.streamingStatus.textContent = '生成中...';
  
  isStreaming = true;
  let fullContent = '';
  let lastChunkTime = Date.now();
  const STREAM_TIMEOUT = 35000; // 35秒超时（比后端稍长）
  let timeoutId = null;
  
  // 设置前端超时检测（双重保护）
  const resetTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (isStreaming) {
        console.warn('Frontend stream timeout: no data received for 35s');
        // 超时后自动完成
        isStreaming = false;
        currentResult = { content: fullContent };
        elements.streamingStatus.textContent = '✅ 完成（超时自动结束）';
        elements.streamingSection.querySelector('.streaming-header').style.background = 
          'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        elements.stopStreamBtn.style.display = 'none';
        
        // 2秒后切换到结果显示
        setTimeout(() => {
          elements.streamingSection.classList.add('hidden');
          displayResult({ content: fullContent });
        }, 2000);
      }
    }, STREAM_TIMEOUT);
  };
  
  // 创建长连接
  streamingPort = chrome.runtime.connect({ name: 'streaming' });
  
  // 监听流式数据
  streamingPort.onMessage.addListener((message) => {
    if (message.type === 'STREAM_CHUNK') {
      // 接收到新的文本块
      lastChunkTime = Date.now();
      resetTimeout(); // 重置超时计时器
      
      fullContent += message.data;
      // 使用 Markdown 渲染（支持图片显示）
      elements.streamingContent.innerHTML = renderMarkdown(fullContent);
      
      // 自动滚动到底部
      elements.streamingContent.scrollTop = elements.streamingContent.scrollHeight;
      
    } else if (message.type === 'STREAM_COMPLETE') {
      // 清除超时计时器
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // 生成完成
      isStreaming = false;
      currentResult = { content: fullContent };
      
      // 显示完成状态
      elements.streamingStatus.textContent = '✅ 完成';
      elements.streamingSection.querySelector('.streaming-header').style.background = 
        'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      // 隐藏停止按钮
      elements.stopStreamBtn.style.display = 'none';
      
      // 所有模式统一处理：2秒后切换到结果显示
      setTimeout(() => {
        elements.streamingSection.classList.add('hidden');
        displayResult({ content: fullContent });
      }, 2000);
      
    } else if (message.type === 'STREAM_ERROR') {
      // 清除超时计时器
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // 生成错误
      isStreaming = false;
      elements.streamingStatus.textContent = '❌ 错误';
      elements.stopStreamBtn.style.display = 'none';
      alert('生成失败: ' + message.error);
      // 统一处理：隐藏流式输出区域
      elements.streamingSection.classList.add('hidden');
    }
  });
  
  // 监听连接断开
  streamingPort.onDisconnect.addListener(() => {
    console.log('Streaming port disconnected');
    
    // 清除超时计时器
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    // 如果还在流式生成中，可能是连接异常断开
    if (isStreaming && fullContent) {
      console.warn('Stream disconnected unexpectedly, completing with received content');
      isStreaming = false;
      currentResult = { content: fullContent };
      elements.streamingStatus.textContent = '✅ 完成（连接断开）';
      elements.streamingSection.querySelector('.streaming-header').style.background = 
        'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      elements.stopStreamBtn.style.display = 'none';
      
      // 2秒后切换到结果显示
      setTimeout(() => {
        elements.streamingSection.classList.add('hidden');
        displayResult({ content: fullContent });
      }, 2000);
    } else {
      isStreaming = false;
    }
  });
  
  // 发送生成请求
  streamingPort.postMessage({
    type: 'GENERATE_STREAM',
    data: {
      agentId,
      content: content,
      url: tab?.url || '',
      title: tab?.title || '',
      isChatMode: isChatMode
    }
  });
}

/**
 * 停止流式生成
 */
function handleStopStream() {
  if (streamingPort) {
    streamingPort.postMessage({ type: 'STOP_STREAM' });
    streamingPort.disconnect();
    streamingPort = null;
  }
  
  isStreaming = false;
  elements.streamingStatus.textContent = '⏹️ 已停止';
  elements.stopStreamBtn.style.display = 'none';
  
  // 统一处理：隐藏流式输出区域，恢复按钮状态
  elements.streamingSection.classList.add('hidden');
  elements.generateBtn.disabled = false;
  elements.chatSendBtn.disabled = false;
}

/**
 * 重新生成
 */
function handleRegenerate() {
  elements.resultSection.classList.add('hidden');
  handleGenerate();
}

/**
 * 设置进度
 */
function setProgress(percent, text) {
  elements.progressFill.style.width = percent + '%';
  elements.progressText.textContent = text;
}

/**
 * 显示结果（Markdown 渲染）
 */
function displayResult(result) {
  elements.resultSection.classList.remove('hidden');
  // 使用 Markdown 渲染（支持图片、链接等）
  elements.resultPreview.innerHTML = renderMarkdown(result.content);
}

/**
 * 复制结果
 */
async function handleCopyResult() {
  if (!currentResult) return;
  
  const success = await copyToClipboard(currentResult.content);
  if (success) {
    elements.copyResultBtn.textContent = '✅';
    setTimeout(() => {
      elements.copyResultBtn.textContent = '📋';
    }, 2000);
  }
}

/**
 * 复制为富文本（含 base64 图片）
 */
async function handleCopyAsRichText() {
  if (!currentResult) return;
  
  const originalText = elements.copyRichTextBtn.textContent;
  
  try {
    // 禁用按钮
    elements.copyRichTextBtn.disabled = true;
    elements.copyRichTextBtn.textContent = '准备中...';
    
    // 调用富文本复制函数，带进度回调
    await copyAsRichText(currentResult.content, (current, total, message) => {
      if (total === 0) {
        elements.copyRichTextBtn.textContent = message;
      } else {
        const percent = Math.round((current / total) * 100);
        elements.copyRichTextBtn.textContent = `${percent}%`;
      }
    });
    
    // 成功提示
    elements.copyRichTextBtn.textContent = '✅';
    setTimeout(() => {
      elements.copyRichTextBtn.textContent = originalText;
      elements.copyRichTextBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Failed to copy as rich text:', error);
    alert('复制富文本失败: ' + error.message);
    elements.copyRichTextBtn.textContent = originalText;
    elements.copyRichTextBtn.disabled = false;
  }
}

/**
 * 下载文档
 */
async function handleDownload(format) {
  if (!currentResult) return;
  
  // 生成安全的文件名
  const safeTitle = (currentTab?.title || 'document')
    .replace(/[<>:"/\\|?*]/g, '')
    .substring(0, 50);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  if (format === 'docx') {
    // Word 导出（包含图片嵌入）
    const filename = `${safeTitle}_${timestamp}.docx`;
    
    // 禁用下载按钮，显示进度
    const docxBtn = elements.downloadDocxBtn;
    const originalText = docxBtn.textContent;
    docxBtn.disabled = true;
    docxBtn.textContent = '准备中...';
    
    try {
      await generateWordWithImages(
        currentResult.content, 
        filename,
        (progress) => {
          // 更新按钮文本显示进度
          docxBtn.textContent = `${progress.message} ${Math.round(progress.progress)}%`;
        }
      );
      
      // 成功提示
      docxBtn.textContent = '✅ 完成';
      setTimeout(() => {
        docxBtn.textContent = originalText;
        docxBtn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Failed to generate Word document:', error);
      alert('Word 导出失败: ' + error.message);
      docxBtn.textContent = originalText;
      docxBtn.disabled = false;
    }
    
  } else {
    // Markdown 导出（直接下载）
    const filename = `${safeTitle}_${timestamp}.md`;
    const mimeType = 'text/markdown';
    downloadFile(currentResult.content, filename, mimeType);
  }
}

/**
 * 加载历史记录
 */
async function loadHistory() {
  const history = await storage.getHistory(20);
  
  elements.historyList.innerHTML = '';
  
  if (history.length === 0) {
    elements.historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
    return;
  }
  
  history.forEach(record => {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    // 格式化时间，提供默认值
    const timeStr = record.startTime ? formatDate(record.startTime, 'MM-DD HH:mm') : '未知时间';
    
    div.innerHTML = `
      <div class="history-title">${record.title || '无标题'}</div>
      <div class="history-meta">
        <span>${timeStr}</span>
        <span class="${record.status === 'completed' ? 'text-success' : 'text-secondary'}">
          ${record.status === 'completed' ? '✅ 成功' : '❌ 失败'}
        </span>
      </div>
    `;
    
    // 只在有结果时才允许点击
    if (record.result && record.status === 'completed') {
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        // 切换到生成标签页
        switchTab('generate');
        // 显示结果
        currentResult = { content: record.result };
        displayResult({ content: record.result });
      });
    } else {
      div.style.cursor = 'default';
      div.style.opacity = '0.6';
    }
    
    elements.historyList.appendChild(div);
  });
}

/**
 * 清空历史
 */
async function handleClearHistory() {
  if (!confirm('确定要清空所有历史记录吗？')) {
    return;
  }
  
  await storage.clearHistory();
  await loadHistory();
}

// 启动应用
initialize();

