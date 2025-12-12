/**
 * WebMind Popup 主脚本
 */

import storage from '../shared/storage.js';
import { formatDate, truncate, downloadFile, copyToClipboard } from '../shared/utils.js';

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
  regenerateBtn: document.getElementById('regenerateBtn'),
  downloadMdBtn: document.getElementById('downloadMdBtn'),
  downloadDocxBtn: document.getElementById('downloadDocxBtn'),
  
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
  
  // 停止流式生成
  elements.stopStreamBtn.addEventListener('click', handleStopStream);
  
  // 复制结果
  elements.copyResultBtn.addEventListener('click', handleCopyResult);
  
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
  
  elements.generateBtn.disabled = false;
  
  // 选择默认代理
  const settings = await storage.getSettings();
  if (settings.defaultAgentId) {
    elements.agentSelect.value = settings.defaultAgentId;
  }
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
    await handleStreamingGenerate(agentId, content, tab);
    
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
 * 处理流式生成
 */
async function handleStreamingGenerate(agentId, content, tab) {
  // 隐藏进度条，显示流式输出区域
  elements.progressSection.classList.add('hidden');
  elements.streamingSection.classList.remove('hidden');
  elements.streamingContent.textContent = '';
  elements.streamingStatus.textContent = '生成中...';
  
  isStreaming = true;
  let fullContent = '';
  
  // 创建长连接
  streamingPort = chrome.runtime.connect({ name: 'streaming' });
  
  // 监听流式数据
  streamingPort.onMessage.addListener((message) => {
    if (message.type === 'STREAM_CHUNK') {
      // 接收到新的文本块
      fullContent += message.data;
      elements.streamingContent.textContent = fullContent;
      
      // 自动滚动到底部
      elements.streamingContent.scrollTop = elements.streamingContent.scrollHeight;
      
    } else if (message.type === 'STREAM_COMPLETE') {
      // 生成完成
      isStreaming = false;
      currentResult = { content: fullContent };
      
      // 显示完成状态
      elements.streamingStatus.textContent = '✅ 完成';
      elements.streamingSection.querySelector('.streaming-header').style.background = 
        'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      
      // 2秒后切换到结果显示
      setTimeout(() => {
        elements.streamingSection.classList.add('hidden');
        displayResult({ content: fullContent });
      }, 2000);
      
    } else if (message.type === 'STREAM_ERROR') {
      // 生成错误
      isStreaming = false;
      elements.streamingStatus.textContent = '❌ 错误';
      alert('生成失败: ' + message.error);
      elements.streamingSection.classList.add('hidden');
    }
  });
  
  // 监听连接断开
  streamingPort.onDisconnect.addListener(() => {
    console.log('Streaming port disconnected');
    isStreaming = false;
  });
  
  // 发送生成请求
  streamingPort.postMessage({
    type: 'GENERATE_STREAM',
    data: {
      agentId,
      content: content.text,
      url: tab.url,
      title: tab.title
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
  elements.streamingSection.classList.add('hidden');
  elements.generateBtn.disabled = false;
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
 * 显示结果
 */
function displayResult(result) {
  elements.resultSection.classList.remove('hidden');
  elements.resultPreview.textContent = result.content;
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
 * 下载文档
 */
function handleDownload(format) {
  if (!currentResult) return;
  
  const extension = format === 'docx' ? 'docx' : 'md';
  const mimeType = format === 'docx' 
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : 'text/markdown';
  
  // 生成安全的文件名
  const safeTitle = (currentTab?.title || 'document')
    .replace(/[<>:"/\\|?*]/g, '')
    .substring(0, 50);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `${safeTitle}_${timestamp}.${extension}`;
  
  downloadFile(currentResult.content, filename, mimeType);
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

