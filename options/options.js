/**
 * WebMind Options Page Script
 */

import storage from '../shared/storage.js';
import { createAgent, validateAgent, generateId } from '../shared/models.js';
import { formatDate, downloadFile, safeJSONParse } from '../shared/utils.js';
import kbService from '../shared/kb-service.js';
import version from '../shared/version.js';

// DOM 元素
const elements = {
  // 导航
  navItems: document.querySelectorAll('.nav-item'),
  contentSections: document.querySelectorAll('.content-section'),
  
  // 代理管理
  agentsGrid: document.getElementById('agentsGrid'),
  agentsEmpty: document.getElementById('agentsEmpty'),
  createAgentBtn: document.getElementById('createAgentBtn'),
  
  // 提供商配置
  providersList: document.getElementById('providersList'),
  detectAllModelsBtn: document.getElementById('detectAllModelsBtn'),
  
  // 设置
  defaultAgentSelect: document.getElementById('defaultAgentSelect'),
  maxHistorySize: document.getElementById('maxHistorySize'),
  autoCleanHistory: document.getElementById('autoCleanHistory'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataBtn: document.getElementById('importDataBtn'),
  importFileInput: document.getElementById('importFileInput'),
  
  // 模态框
  agentModal: document.getElementById('agentModal'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  cancelAgentBtn: document.getElementById('cancelAgentBtn'),
  modalTitle: document.getElementById('modalTitle'),
  agentForm: document.getElementById('agentForm'),
  agentId: document.getElementById('agentId'),
  agentName: document.getElementById('agentName'),
  agentDescription: document.getElementById('agentDescription'),
  agentSystemPrompt: document.getElementById('agentSystemPrompt'),
  agentPromptTemplate: document.getElementById('agentPromptTemplate'),
  modelsList: document.getElementById('modelsList'),
  saveAgentBtn: document.getElementById('saveAgentBtn'),
  enableKnowledgeBase: document.getElementById('enableKnowledgeBase'),
  knowledgeBaseSelectGroup: document.getElementById('knowledgeBaseSelectGroup'),
  knowledgeBaseSelect: document.getElementById('knowledgeBaseSelect'),
  kbInfo: document.getElementById('kbInfo'),
  
  // 知识库管理
  ragBackendUrl: document.getElementById('ragBackendUrl'),
  checkRAGBackendBtn: document.getElementById('checkRAGBackendBtn'),
  ragStatus: document.getElementById('ragStatus'),
  ragApiKey: document.getElementById('ragApiKey'),
  toggleApiKeyVisibility: document.getElementById('toggleApiKeyVisibility'),
  saveRAGApiKeyBtn: document.getElementById('saveRAGApiKeyBtn'),
  newKBName: document.getElementById('newKBName'),
  createKBBtn: document.getElementById('createKBBtn'),
  knowledgeBasesList: document.getElementById('knowledgeBasesList')
};

// 当前状态
let currentAgent = null;

/**
 * 初始化
 */
async function initialize() {
  // 初始化存储
  await storage.initialize();
  
  // 加载版本号
  loadVersion();
  
  // 绑定事件
  bindEvents();
  
  // 加载数据
  await loadAgents();
  await loadProviders();
  await loadSettings();
  await loadRAGApiKey();
  await loadKnowledgeBases();
  await checkRAGBackendHealth();
  
  console.log('Options page initialized');
}

/**
 * 加载并显示版本号（从 manifest.json 统一读取）
 */
function loadVersion() {
  try {
    // 使用统一的版本管理模块
    version.updateVersionElements('#app-version', 'v');
    version.updateVersionElements('#app-version-info', 'cn');
    version.updateVersionElements('#app-version-update', 'v');
    
    console.log('Version loaded:', version.getVersion());
  } catch (error) {
    console.error('Failed to load version:', error);
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 导航切换
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => switchSection(item.dataset.section));
  });
  
  // 创建代理
  elements.createAgentBtn.addEventListener('click', () => openAgentModal());
  
  // 保存代理
  elements.saveAgentBtn.addEventListener('click', handleSaveAgent);
  
  // 关闭模态框
  elements.modalOverlay.addEventListener('click', closeAgentModal);
  elements.modalCloseBtn.addEventListener('click', closeAgentModal);
  elements.cancelAgentBtn.addEventListener('click', closeAgentModal);
  
  // 检测模型
  elements.detectAllModelsBtn.addEventListener('click', handleDetectAllModels);
  
  // 保存设置
  elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
  
  // 导出数据
  elements.exportDataBtn.addEventListener('click', handleExportData);
  
  // 导入数据
  elements.importDataBtn.addEventListener('click', () => elements.importFileInput.click());
  elements.importFileInput.addEventListener('change', handleImportData);
  
  // 主题切换
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', handleThemeChange);
  });
  
  // 知识库启用开关
  elements.enableKnowledgeBase.addEventListener('change', handleKnowledgeBaseToggle);
  
  // 知识库管理
  elements.ragBackendUrl.addEventListener('blur', handleRAGBackendUrlChange);
  elements.checkRAGBackendBtn.addEventListener('click', handleCheckRAGBackend);
  elements.toggleApiKeyVisibility.addEventListener('click', handleToggleApiKeyVisibility);
  elements.saveRAGApiKeyBtn.addEventListener('click', handleSaveRAGApiKey);
  elements.createKBBtn.addEventListener('click', handleCreateKB);
}

/**
 * 切换页面
 */
function switchSection(sectionName) {
  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionName);
  });
  
  elements.contentSections.forEach(section => {
    section.classList.toggle('active', section.id === `${sectionName}Section`);
  });
}

/**
 * 加载代理列表
 */
async function loadAgents() {
  const agents = await storage.getAgents();
  
  elements.agentsGrid.innerHTML = '';
  
  if (agents.length === 0) {
    elements.agentsEmpty.classList.remove('hidden');
    elements.agentsGrid.classList.add('hidden');
    return;
  }
  
  elements.agentsEmpty.classList.add('hidden');
  elements.agentsGrid.classList.remove('hidden');
  
  agents.forEach(agent => {
    const card = createAgentCard(agent);
    elements.agentsGrid.appendChild(card);
  });
  
  // 更新默认代理选择框
  await updateDefaultAgentSelect();
}

/**
 * 创建代理卡片
 */
function createAgentCard(agent) {
  const div = document.createElement('div');
  div.className = 'agent-card';
  
  // 解析模型ID（格式: providerId:modelName）
  const modelParts = agent.modelId ? agent.modelId.split(':') : [];
  const modelDisplay = modelParts.length === 2 ? `${modelParts[0]}/${modelParts[1]}` : '未配置';
  
  // 格式化时间，确保有效
  const timeStr = agent.updatedAt ? formatDate(agent.updatedAt, 'MM-DD HH:mm') : formatDate(new Date(), 'MM-DD HH:mm');
  
  div.innerHTML = `
    <div class="agent-card-header">
      <div>
        <h3 class="agent-card-title">${agent.name}</h3>
      </div>
    </div>
    <p class="agent-card-description">${agent.description || '暂无描述'}</p>
    <div class="agent-card-meta">
      <span class="agent-card-badge">🤖 ${modelDisplay}</span>
      <span class="agent-card-badge">⏰ ${timeStr}</span>
    </div>
    <div class="agent-card-actions">
      <button class="btn btn-secondary btn-small edit-btn">编辑</button>
      <button class="btn btn-danger btn-small delete-btn">删除</button>
    </div>
  `;
  
  // 绑定编辑按钮
  div.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openAgentModal(agent);
  });
  
  // 绑定删除按钮
  div.querySelector('.delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm(`确定要删除代理"${agent.name}"吗？`)) {
      await storage.deleteAgent(agent.id);
      await loadAgents();
    }
  });
  
  return div;
}

/**
 * 打开代理编辑模态框
 */
async function openAgentModal(agent = null) {
  currentAgent = agent;
  
  // 加载可用模型
  await loadModelsForSelection();
  
  if (agent) {
    // 编辑模式
    elements.modalTitle.textContent = '编辑智能代理';
    elements.agentId.value = agent.id;
    elements.agentName.value = agent.name;
    elements.agentDescription.value = agent.description || '';
    elements.agentSystemPrompt.value = agent.systemPrompt;
    elements.agentPromptTemplate.value = agent.config?.promptTemplate || '';
    
    // 选中模型（单选）
    const radio = document.querySelector(`#modelsList input[type="radio"][value="${agent.modelId}"]`);
    if (radio) {
      radio.checked = true;
    }
    
    // 模式选择
    const mode = agent.mode || 'document';
    document.getElementById('agentModeDocument').checked = mode === 'document';
    document.getElementById('agentModeChat').checked = mode === 'chat';
    
    // 知识库配置
    elements.enableKnowledgeBase.checked = agent.enableKnowledgeBase || false;
    if (agent.enableKnowledgeBase) {
      elements.knowledgeBaseSelectGroup.classList.remove('hidden');
      await loadKnowledgeBasesForAgent();
      if (agent.knowledgeBaseName) {
        elements.knowledgeBaseSelect.value = agent.knowledgeBaseName;
        await updateKBInfo(agent.knowledgeBaseName);
      }
    } else {
      elements.knowledgeBaseSelectGroup.classList.add('hidden');
    }
  } else {
    // 创建模式
    elements.modalTitle.textContent = '创建智能代理';
    elements.agentForm.reset();
    elements.agentId.value = '';
    elements.agentPromptTemplate.value = '请分析以下网页内容：\n\n{{content}}';
    document.getElementById('agentModeDocument').checked = true;
    document.getElementById('agentModeChat').checked = false;
    elements.enableKnowledgeBase.checked = false;
    elements.knowledgeBaseSelectGroup.classList.add('hidden');
  }
  
  elements.agentModal.classList.remove('hidden');
}

/**
 * 关闭代理编辑模态框
 */
function closeAgentModal() {
  elements.agentModal.classList.add('hidden');
  currentAgent = null;
}

/**
 * 加载模型列表供选择
 */
async function loadModelsForSelection() {
  // 获取所有已启用的平台
  const providers = await storage.getProviders();
  const enabledProviders = providers.filter(p => p.enabled);
  
  elements.modelsList.innerHTML = '';
  
  if (enabledProviders.length === 0) {
    elements.modelsList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
        <p>暂无可用平台</p>
        <p style="font-size: 12px; margin-top: 8px;">请先在"API 配置"中配置 AI 平台</p>
      </div>
    `;
    return;
  }
  
  let totalModels = 0;
  
  // 遍历每个平台，显示所有模型（自动检测 + 手动添加）
  enabledProviders.forEach(provider => {
    const autoModels = provider.models || [];
    const customModels = provider.customModels || [];
    
    // 显示自动检测的模型
    autoModels.forEach(model => {
      const label = document.createElement('label');
      label.className = 'model-item';
      label.innerHTML = `
        <input type="radio" name="selectedModel" value="${provider.id}:${model.id}">
        <div class="model-item-content">
          <span class="model-item-name">${model.name}</span>
          <span class="model-item-provider">${provider.name}</span>
        </div>
      `;
      elements.modelsList.appendChild(label);
      totalModels++;
    });
    
    // 显示手动添加的模型
    customModels.forEach(modelName => {
      const label = document.createElement('label');
      label.className = 'model-item';
      label.innerHTML = `
        <input type="radio" name="selectedModel" value="${provider.id}:${modelName}">
        <div class="model-item-content">
          <span class="model-item-name">${modelName} <span style="color: var(--warning-color); font-size: 11px;">自定义</span></span>
          <span class="model-item-provider">${provider.name}</span>
        </div>
      `;
      elements.modelsList.appendChild(label);
      totalModels++;
    });
  });
  
  if (totalModels === 0) {
    elements.modelsList.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
        <p>暂无可用模型</p>
        <p style="font-size: 12px; margin-top: 8px;">请在"API 配置"中检测模型或手动添加模型</p>
      </div>
    `;
  }
}


/**
 * 保存代理
 */
async function handleSaveAgent() {
  // 收集表单数据
  const name = elements.agentName.value.trim();
  const description = elements.agentDescription.value.trim();
  const systemPrompt = elements.agentSystemPrompt.value.trim();
  const promptTemplate = elements.agentPromptTemplate.value.trim();
  
  // 获取选中的模型（单选）
  const selectedRadio = elements.modelsList.querySelector('input[type="radio"]:checked');
  const modelId = selectedRadio ? selectedRadio.value : '';
  
  // 模式选择
  const mode = document.querySelector('input[name="agentMode"]:checked')?.value || 'document';
  
  // 知识库配置
  const enableKnowledgeBase = elements.enableKnowledgeBase.checked;
  const knowledgeBaseName = enableKnowledgeBase ? elements.knowledgeBaseSelect.value : null;
  
  // 创建或更新代理对象
  const agentData = {
    name,
    description,
    systemPrompt,
    modelId,
    mode,
    enableKnowledgeBase,
    knowledgeBaseName,
    config: {
      promptTemplate
    }
  };
  
  // 如果是编辑模式，添加 ID
  if (currentAgent) {
    agentData.id = currentAgent.id;
  }
  
  const agent = createAgent(agentData);
  
  // 验证
  const validation = validateAgent(agent);
  if (!validation.valid) {
    alert('验证失败：\n' + validation.errors.join('\n'));
    return;
  }
  
  // 保存
  try {
    if (currentAgent) {
      // 更新时保持 createdAt，更新 updatedAt
      agent.createdAt = currentAgent.createdAt;
      agent.updatedAt = new Date().toISOString();
      await storage.updateAgent(agent.id, agent);
    } else {
      // 新建时设置时间戳
      agent.createdAt = new Date().toISOString();
      agent.updatedAt = new Date().toISOString();
      await storage.addAgent(agent);
    }
    
    closeAgentModal();
    await loadAgents();
  } catch (error) {
    console.error('Failed to save agent:', error);
    alert('保存失败: ' + error.message);
  }
}

/**
 * 加载提供商配置
 */
async function loadProviders() {
  const providers = await storage.getProviders();
  
  elements.providersList.innerHTML = '';
  
  providers.forEach(provider => {
    const card = createProviderCard(provider);
    elements.providersList.appendChild(card);
  });
}

/**
 * 创建提供商卡片
 */
function createProviderCard(provider) {
  const div = document.createElement('div');
  div.className = 'provider-card';
  
  const modelsCount = provider.models?.length || 0;
  const customModelsCount = provider.customModels?.length || 0;
  const totalModelsCount = modelsCount + customModelsCount;
  
  div.innerHTML = `
    <div class="provider-header">
      <h3 class="provider-name">${provider.name}</h3>
      <span class="provider-status ${provider.enabled ? 'active' : ''}">
        ${provider.enabled ? '✅ 已启用' : '⚪ 未配置'}
      </span>
    </div>
    <div class="provider-body">
      <div class="form-group">
        <label class="form-label">API Key</label>
        <input 
          type="password" 
          class="form-input api-key-input" 
          placeholder="输入你的 ${provider.name} API Key"
          value="${provider.apiKey || ''}"
        >
        <p class="form-help">Base URL: ${provider.baseURL}</p>
      </div>

      ${totalModelsCount > 0 ? `
        <div class="provider-models">
          <div class="provider-models-title">可用模型 (${totalModelsCount})</div>
          <div class="provider-models-list">
            ${modelsCount > 0 ? provider.models.map(m => `
              <span class="model-badge">${m.name}</span>
            `).join('') : ''}
            ${customModelsCount > 0 ? provider.customModels.map((modelName, index) => `
              <span class="model-badge custom-badge">
                ${modelName}
                <button class="model-badge-remove" data-model-index="${index}" title="删除">×</button>
              </span>
            `).join('') : ''}
          </div>
        </div>
      ` : ''}

      ${provider.enabled && modelsCount === 0 ? `
        <div class="form-group">
          <label class="form-label">手动添加模型</label>
          <div class="custom-model-input-inline">
            <input 
              type="text" 
              class="form-input custom-model-name-input" 
              placeholder="输入模型名称，如: qwen3-plus"
            >
            <button class="btn btn-secondary btn-small add-custom-model-btn">添加</button>
          </div>
          <p class="form-help">该平台无法自动获取模型列表，请手动添加模型名称</p>
        </div>
      ` : ''}
    </div>
  `;
  
  // 绑定 API Key 输入事件
  const apiKeyInput = div.querySelector('.api-key-input');
  apiKeyInput.addEventListener('blur', async () => {
    const apiKey = apiKeyInput.value.trim();
    await storage.updateProvider(provider.id, {
      apiKey,
      enabled: apiKey !== ''
    });
    await loadProviders();
  });
  
  // 绑定添加自定义模型按钮
  const addBtn = div.querySelector('.add-custom-model-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const input = div.querySelector('.custom-model-name-input');
      const modelName = input.value.trim();
      
      if (!modelName) {
        alert('请输入模型名称');
        return;
      }
      
      // 检查是否已存在
      const customModels = provider.customModels || [];
      if (customModels.includes(modelName)) {
        alert('该模型已存在');
        return;
      }
      
      // 添加模型
      await storage.updateProvider(provider.id, {
        customModels: [...customModels, modelName]
      });
      
      input.value = '';
      await loadProviders();
    });
  }
  
  // 绑定删除自定义模型按钮
  div.querySelectorAll('.model-badge-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.modelIndex);
      const customModels = [...(provider.customModels || [])];
      customModels.splice(index, 1);
      
      await storage.updateProvider(provider.id, {
        customModels
      });
      
      await loadProviders();
    });
  });
  
  return div;
}

/**
 * 检测所有模型
 */
async function handleDetectAllModels() {
  elements.detectAllModelsBtn.disabled = true;
  elements.detectAllModelsBtn.textContent = '检测中...';
  
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
    elements.detectAllModelsBtn.disabled = false;
    elements.detectAllModelsBtn.textContent = '🔍 检测所有模型';
  }
}

/**
 * 加载设置
 */
async function loadSettings() {
  const settings = await storage.getSettings();
  
  // 默认代理
  if (settings.defaultAgentId) {
    elements.defaultAgentSelect.value = settings.defaultAgentId;
  }
  
  // 主题
  document.querySelector(`input[name="theme"][value="${settings.theme}"]`).checked = true;
  
  // 历史记录
  elements.maxHistorySize.value = settings.maxHistorySize;
  elements.autoCleanHistory.checked = settings.autoCleanHistory;
}

/**
 * 更新默认代理选择框
 */
async function updateDefaultAgentSelect() {
  const agents = await storage.getAgents();
  const settings = await storage.getSettings();
  
  elements.defaultAgentSelect.innerHTML = '<option value="">无</option>';
  
  agents.forEach(agent => {
    const option = document.createElement('option');
    option.value = agent.id;
    option.textContent = agent.name;
    if (agent.id === settings.defaultAgentId) {
      option.selected = true;
    }
    elements.defaultAgentSelect.appendChild(option);
  });
}

/**
 * 保存设置
 */
async function handleSaveSettings() {
  const settings = {
    defaultAgentId: elements.defaultAgentSelect.value,
    theme: document.querySelector('input[name="theme"]:checked').value,
    maxHistorySize: parseInt(elements.maxHistorySize.value),
    autoCleanHistory: elements.autoCleanHistory.checked
  };
  
  try {
    await storage.setSettings(settings);
    alert('设置已保存！');
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('保存失败: ' + error.message);
  }
}

/**
 * 主题切换
 */
function handleThemeChange(e) {
  const theme = e.target.value;
  // 这里可以实现主题切换逻辑
  console.log('Theme changed to:', theme);
}

/**
 * 导出数据
 */
async function handleExportData() {
  try {
    const data = await storage.exportData();
    const json = JSON.stringify(data, null, 2);
    const filename = `webmind-backup-${Date.now()}.json`;
    downloadFile(json, filename, 'application/json');
  } catch (error) {
    console.error('Failed to export data:', error);
    alert('导出失败: ' + error.message);
  }
}

/**
 * 导入数据
 */
async function handleImportData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = safeJSONParse(text);
    
    if (!data) {
      throw new Error('无效的 JSON 文件');
    }
    
    if (!confirm('导入数据将覆盖当前所有设置，确定继续吗？')) {
      return;
    }
    
    await storage.importData(data);
    alert('导入成功！页面将刷新。');
    location.reload();
  } catch (error) {
    console.error('Failed to import data:', error);
    alert('导入失败: ' + error.message);
  } finally {
    e.target.value = ''; // 清空文件选择
  }
}

// ============= 知识库相关功能 =============

/**
 * 知识库启用开关切换
 */
function handleKnowledgeBaseToggle() {
  const enabled = elements.enableKnowledgeBase.checked;
  if (enabled) {
    elements.knowledgeBaseSelectGroup.classList.remove('hidden');
    loadKnowledgeBasesForAgent();
  } else {
    elements.knowledgeBaseSelectGroup.classList.add('hidden');
    elements.knowledgeBaseSelect.value = '';
    elements.kbInfo.innerHTML = '';
  }
}

/**
 * 为 Agent 编辑加载知识库列表
 */
async function loadKnowledgeBasesForAgent() {
  try {
    const kbs = await kbService.listKnowledgeBases();
    elements.knowledgeBaseSelect.innerHTML = '<option value="">请选择知识库...</option>';
    
    if (kbs.success && kbs.knowledge_bases) {
      kbs.knowledge_bases.forEach(kb => {
        const option = document.createElement('option');
        option.value = kb.name;
        option.textContent = `${kb.name} (${kb.document_count || 0} 个文档)`;
        elements.knowledgeBaseSelect.appendChild(option);
      });
    }
    
    // 如果正在编辑代理，选中已配置的知识库
    if (currentAgent && currentAgent.knowledgeBaseName) {
      elements.knowledgeBaseSelect.value = currentAgent.knowledgeBaseName;
      await updateKBInfo(currentAgent.knowledgeBaseName);
    }
    
    // 监听选择变化
    elements.knowledgeBaseSelect.addEventListener('change', async (e) => {
      const kbName = e.target.value;
      if (kbName) {
        await updateKBInfo(kbName);
      } else {
        elements.kbInfo.innerHTML = '';
      }
    });
  } catch (error) {
    console.error('加载知识库列表失败:', error);
    elements.knowledgeBaseSelect.innerHTML = '<option value="">加载失败</option>';
  }
}

/**
 * 更新知识库信息显示
 */
async function updateKBInfo(kbName) {
  try {
    const kbs = await kbService.listKnowledgeBases();
    const kb = kbs.knowledge_bases?.find(k => k.name === kbName);
    if (kb) {
      elements.kbInfo.innerHTML = `📚 文档数量: ${kb.document_count || 0}`;
    }
  } catch (error) {
    console.error('获取知识库信息失败:', error);
  }
}

/**
 * 检查 RAG 后端健康状态
 */
async function checkRAGBackendHealth() {
  const url = elements.ragBackendUrl.value.trim() || await storage.getRAGBackendUrl();
  if (url) {
    elements.ragBackendUrl.value = url;
    kbService.resetBaseURL();
    await storage.setRAGBackendUrl(url);
  }
  
  await handleCheckRAGBackend();
}

/**
 * 检查 RAG 后端连接
 */
async function handleCheckRAGBackend() {
  const url = elements.ragBackendUrl.value.trim();
  if (!url) {
    elements.ragStatus.textContent = '请先输入后端地址';
    elements.ragStatus.className = 'rag-status error';
    return;
  }
  
  elements.checkRAGBackendBtn.disabled = true;
  elements.checkRAGBackendBtn.textContent = '检查中...';
  elements.ragStatus.textContent = '';
  
  try {
    await storage.setRAGBackendUrl(url);
    kbService.resetBaseURL();
    
    const result = await kbService.healthCheck();
    if (result.status === 'ok') {
      elements.ragStatus.textContent = '✅ 连接正常';
      elements.ragStatus.className = 'rag-status success';
    } else {
      throw new Error(result.error || '连接失败');
    }
  } catch (error) {
    elements.ragStatus.textContent = '❌ 连接失败: ' + error.message;
    elements.ragStatus.className = 'rag-status error';
  } finally {
    elements.checkRAGBackendBtn.disabled = false;
    elements.checkRAGBackendBtn.textContent = '检查连接';
  }
}

/**
 * RAG 后端 URL 变更
 */
async function handleRAGBackendUrlChange() {
  const url = elements.ragBackendUrl.value.trim();
  if (url) {
    await storage.setRAGBackendUrl(url);
    kbService.resetBaseURL();
  }
}

/**
 * 切换 API 密钥显示/隐藏
 */
function handleToggleApiKeyVisibility() {
  const input = elements.ragApiKey;
  if (input.type === 'password') {
    input.type = 'text';
    elements.toggleApiKeyVisibility.textContent = '🙈';
    elements.toggleApiKeyVisibility.title = '隐藏';
  } else {
    input.type = 'password';
    elements.toggleApiKeyVisibility.textContent = '👁️';
    elements.toggleApiKeyVisibility.title = '显示';
  }
}

/**
 * 保存 RAG API 密钥
 */
async function handleSaveRAGApiKey() {
  const apiKey = elements.ragApiKey.value.trim();
  
  try {
    await storage.setRAGApiKey(apiKey);
    
    // 显示成功提示
    const originalText = elements.saveRAGApiKeyBtn.textContent;
    elements.saveRAGApiKeyBtn.textContent = '✓ 已保存';
    elements.saveRAGApiKeyBtn.disabled = true;
    
    setTimeout(() => {
      elements.saveRAGApiKeyBtn.textContent = originalText;
      elements.saveRAGApiKeyBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error('保存API密钥失败:', error);
    alert('保存失败: ' + error.message);
  }
}

/**
 * 加载 RAG API 密钥配置
 */
async function loadRAGApiKey() {
  try {
    const apiKey = await storage.getRAGApiKey();
    if (apiKey) {
      elements.ragApiKey.value = apiKey;
    }
  } catch (error) {
    console.error('加载API密钥失败:', error);
  }
}

/**
 * 加载知识库列表
 */
async function loadKnowledgeBases() {
  try {
    const result = await kbService.listKnowledgeBases();
    elements.knowledgeBasesList.innerHTML = '';
    
    if (result.success && result.knowledge_bases) {
      if (result.knowledge_bases.length === 0) {
        elements.knowledgeBasesList.innerHTML = '<div class="empty-state">暂无知识库</div>';
        return;
      }
      
      result.knowledge_bases.forEach(kb => {
        const card = createKBCard(kb);
        elements.knowledgeBasesList.appendChild(card);
      });
    }
  } catch (error) {
    console.error('加载知识库列表失败:', error);
    elements.knowledgeBasesList.innerHTML = '<div class="empty-state error">加载失败: ' + error.message + '</div>';
  }
}

/**
 * 创建知识库卡片
 */
function createKBCard(kb) {
  const div = document.createElement('div');
  div.className = 'kb-card';
  
  div.innerHTML = `
    <div class="kb-card-header">
      <h3 class="kb-card-title">${kb.name}</h3>
      <span class="kb-card-badge">${kb.document_count || 0} 个文档</span>
    </div>
    <div class="kb-card-body">
      <div class="kb-upload-section">
        <input type="file" class="kb-file-input" id="kbFile_${kb.name}" accept=".pdf,.txt,.docx,.md" style="display: none;">
        <button class="btn btn-secondary btn-small kb-upload-btn" data-kb-name="${kb.name}">上传文件</button>
        <button class="btn btn-secondary btn-small kb-view-docs-btn" data-kb-name="${kb.name}">查看文档</button>
        <button class="btn btn-danger btn-small kb-delete-btn" data-kb-name="${kb.name}">删除知识库</button>
      </div>
      
      <!-- 文件上传配置（默认隐藏） -->
      <div class="kb-upload-config hidden" id="kbUploadConfig_${kb.name}">
        <div class="form-group" style="margin-top: 12px;">
          <label class="form-label" style="font-size: 12px;">切分策略：</label>
          <select class="form-select kb-split-strategy" id="kbSplitStrategy_${kb.name}" style="font-size: 12px; padding: 4px 8px;">
            <option value="">加载中...</option>
          </select>
          <span class="strategy-description" id="kbStrategyDesc_${kb.name}" style="display: block; margin-top: 4px; font-size: 11px; color: var(--text-secondary);"></span>
        </div>
        
        <details class="advanced-settings" style="margin-top: 8px;">
          <summary style="font-size: 12px; cursor: pointer;">高级设置</summary>
          <div class="settings-content" style="margin-top: 8px;">
            <div class="form-group" style="margin: 8px 0;">
              <label class="form-label" style="font-size: 12px; display: inline-block; width: 120px;">Chunk大小：</label>
              <input type="number" class="form-input kb-chunk-size" id="kbChunkSize_${kb.name}" value="400" min="50" max="2000" style="width: 80px; font-size: 12px; padding: 4px;">
              <span style="font-size: 11px; color: var(--text-secondary); margin-left: 4px;">字符</span>
            </div>
            <div class="form-group" style="margin: 8px 0;">
              <label class="form-label" style="font-size: 12px; display: inline-block; width: 120px;">重叠大小：</label>
              <input type="number" class="form-input kb-chunk-overlap" id="kbChunkOverlap_${kb.name}" value="50" min="0" max="500" style="width: 80px; font-size: 12px; padding: 4px;">
              <span style="font-size: 11px; color: var(--text-secondary); margin-left: 4px;">字符</span>
            </div>
          </div>
        </details>
        
        <div style="margin-top: 8px;">
          <button class="btn btn-primary btn-small kb-confirm-upload-btn" data-kb-name="${kb.name}" style="font-size: 12px; padding: 4px 12px;">确认上传</button>
          <button class="btn btn-secondary btn-small kb-cancel-upload-btn" data-kb-name="${kb.name}" style="font-size: 12px; padding: 4px 12px; margin-left: 8px;">取消</button>
        </div>
      </div>
      
      <div class="kb-docs-list hidden" id="kbDocs_${kb.name}">
        <!-- 文档列表将在这里显示 -->
      </div>
    </div>
  `;
  
  // 绑定上传按钮
  const uploadBtn = div.querySelector('.kb-upload-btn');
  const fileInput = div.querySelector('.kb-file-input');
  const uploadConfig = div.querySelector('.kb-upload-config');
  const confirmUploadBtn = div.querySelector('.kb-confirm-upload-btn');
  const cancelUploadBtn = div.querySelector('.kb-cancel-upload-btn');
  
  // 加载切分策略列表
  loadSplitStrategiesForKB(kb.name);
  
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      // 显示上传配置
      uploadConfig.classList.remove('hidden');
    }
  });
  
  // 确认上传
  confirmUploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      alert('请先选择文件');
      return;
    }
    
    const splitStrategy = div.querySelector(`#kbSplitStrategy_${kb.name}`).value;
    const chunkSize = parseInt(div.querySelector(`#kbChunkSize_${kb.name}`).value);
    const chunkOverlap = parseInt(div.querySelector(`#kbChunkOverlap_${kb.name}`).value);
    
    if (!splitStrategy) {
      alert('请选择切分策略');
      return;
    }
    
    if (chunkSize <= 0) {
      alert('Chunk大小必须大于0');
      return;
    }
    
    if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
      alert('重叠大小必须大于等于0且小于Chunk大小');
      return;
    }
    
    // 显示上传进度提示
    const originalBtnText = confirmUploadBtn.textContent;
    const originalCancelText = cancelUploadBtn.textContent;
    confirmUploadBtn.disabled = true;
    cancelUploadBtn.disabled = true;
    confirmUploadBtn.textContent = '上传中...';
    
    // 创建进度提示元素
    let progressElement = uploadConfig.querySelector('.upload-progress');
    if (!progressElement) {
      progressElement = document.createElement('div');
      progressElement.className = 'upload-progress';
      progressElement.style.cssText = 'margin-top: 12px; padding: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; font-size: 12px;';
      uploadConfig.appendChild(progressElement);
    }
    progressElement.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span>正在上传文件 "${file.name}"，请稍候...</span>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: #6b7280;">
        文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB | 切分策略: ${splitStrategy} | 这可能需要一些时间，请耐心等待
      </div>
    `;
    
    try {
      await handleUploadFile(kb.name, file, splitStrategy, chunkSize, chunkOverlap);
      
      // 清空并隐藏
      fileInput.value = '';
      uploadConfig.classList.add('hidden');
      if (progressElement) {
        progressElement.remove();
      }
    } catch (error) {
      // 上传失败，保持界面显示以便重试
      console.error('上传失败:', error);
    } finally {
      // 恢复按钮状态
      confirmUploadBtn.disabled = false;
      cancelUploadBtn.disabled = false;
      confirmUploadBtn.textContent = originalBtnText;
      cancelUploadBtn.textContent = originalCancelText;
      if (progressElement && progressElement.parentNode) {
        progressElement.remove();
      }
    }
  });
  
  // 取消上传
  cancelUploadBtn.addEventListener('click', () => {
    fileInput.value = '';
    uploadConfig.classList.add('hidden');
  });
  
  // 监听策略选择变化
  const strategySelect = div.querySelector(`#kbSplitStrategy_${kb.name}`);
  strategySelect.addEventListener('change', (e) => {
    updateStrategyDescription(kb.name, e.target.value);
  });
  
  // 绑定查看文档按钮
  div.querySelector('.kb-view-docs-btn').addEventListener('click', async () => {
    await toggleKBDocs(kb.name);
  });
  
  // 绑定删除按钮
  div.querySelector('.kb-delete-btn').addEventListener('click', async () => {
    if (confirm(`确定要删除知识库"${kb.name}"吗？这将删除所有文档。`)) {
      await handleDeleteKB(kb.name);
    }
  });
  
  return div;
}

/**
 * 切换知识库文档显示
 */
async function toggleKBDocs(kbName) {
  const docsList = document.getElementById(`kbDocs_${kbName}`);
  if (docsList.classList.contains('hidden')) {
    // 显示加载状态
    docsList.innerHTML = '<div class="kb-docs-loading">正在加载文档列表...</div>';
    docsList.classList.remove('hidden');
    
    // 加载文档列表（不包含预览，快速加载）
    try {
      const result = await kbService.getKnowledgeBaseDocs(kbName, {
        includePreview: false
      });
      
      if (result.success && result.files) {
        let html = '<div class="kb-docs-header">文档列表:</div>';
        // 存储文件数据，用于删除时获取文档ID
        const fileDataMap = new Map();
        // 记录已加载详情的文件
        const loadedDetails = new Set();
        
        result.files.forEach((file, fileIndex) => {
          const fileKey = `file_${fileIndex}`;
          fileDataMap.set(fileKey, {
            filename: file.filename,
            chunksCount: file.chunks_count || 0,
            docIds: [], // 初始为空，展开时加载
            loaded: false
          });
          
          html += `
            <div class="kb-doc-item" data-file-key="${fileKey}">
              <div class="kb-doc-header" data-file-key="${fileKey}">
                <span class="kb-doc-expand-icon">▶</span>
                <span class="kb-doc-name">${file.filename}</span>
                <span class="kb-doc-chunks">${file.chunks_count || 0} 个片段</span>
                <button class="btn btn-danger btn-small kb-delete-doc-btn" data-kb-name="${kbName}" data-file-key="${fileKey}">删除</button>
              </div>
              <div class="kb-doc-details hidden" id="kbDocDetails_${fileKey}">
                <div class="kb-doc-details-content">
                  <!-- 详情内容将在这里动态加载 -->
                </div>
              </div>
            </div>
          `;
        });
        
        docsList.innerHTML = html;
        
        // 将文件数据存储到元素上，以便后续使用
        docsList._fileDataMap = fileDataMap;
        docsList._loadedDetails = loadedDetails;
        
        // 绑定文档展开/折叠
        docsList.querySelectorAll('.kb-doc-header').forEach(header => {
          header.addEventListener('click', async (e) => {
            // 如果点击的是删除按钮，不展开
            if (e.target.classList.contains('kb-delete-doc-btn')) {
              return;
            }
            
            const fileKey = header.getAttribute('data-file-key');
            await toggleFileDetails(kbName, fileKey);
          });
        });
        
        // 绑定删除文档按钮
        docsList.querySelectorAll('.kb-delete-doc-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              const fileKey = btn.getAttribute('data-file-key');
              const kbName = btn.getAttribute('data-kb-name');
              
              if (!fileKey || !kbName) {
                alert('无法获取文档信息');
                return;
              }
              
              // 从存储的Map中获取文档ID
              const fileData = docsList._fileDataMap?.get(fileKey);
              if (!fileData) {
                alert('无法获取文档数据，请刷新页面后重试');
                return;
              }
              
              // 如果还没有加载详情，先加载
              if (!fileData.loaded || fileData.docIds.length === 0) {
                await loadFileDetails(kbName, fileKey);
                // 重新获取数据
                const updatedData = docsList._fileDataMap?.get(fileKey);
                if (!updatedData || updatedData.docIds.length === 0) {
                  alert('无法获取文档片段ID，请刷新页面后重试');
                  return;
                }
                fileData.docIds = updatedData.docIds;
              }
              
              const docIds = fileData.docIds;
              if (!Array.isArray(docIds) || docIds.length === 0) {
                alert('没有可删除的文档片段');
                return;
              }
              
              if (confirm(`确定要删除文件"${fileData.filename}"的所有片段吗？共 ${docIds.length} 个片段`)) {
                await handleDeleteDocuments(kbName, docIds);
                // 重新加载文档列表
                await toggleKBDocs(kbName);
                await toggleKBDocs(kbName); // 再次调用以刷新显示
              }
            } catch (error) {
              console.error('删除文档失败:', error);
              alert('删除失败: ' + error.message);
            }
          });
        });
      } else {
        docsList.innerHTML = '<div class="kb-docs-empty">暂无文档</div>';
      }
    } catch (error) {
      docsList.innerHTML = `<div class="kb-docs-error">加载文档列表失败: ${error.message}</div>`;
      console.error('加载文档列表失败:', error);
    }
  } else {
    docsList.classList.add('hidden');
  }
}

/**
 * 切换文件详情显示/隐藏
 */
async function toggleFileDetails(kbName, fileKey) {
  const docItem = document.querySelector(`[data-file-key="${fileKey}"]`)?.closest('.kb-doc-item');
  if (!docItem) return;
  
  const detailsDiv = docItem.querySelector('.kb-doc-details');
  const expandIcon = docItem.querySelector('.kb-doc-expand-icon');
  const detailsContent = docItem.querySelector('.kb-doc-details-content');
  const docsList = docItem.closest('.kb-docs-list');
  
  if (detailsDiv.classList.contains('hidden')) {
    // 展开
    detailsDiv.classList.remove('hidden');
    expandIcon.textContent = '▼';
    
    // 检查是否已加载
    const fileData = docsList._fileDataMap?.get(fileKey);
    if (!fileData || !fileData.loaded) {
      // 显示加载状态
      detailsContent.innerHTML = '<div class="kb-doc-loading">正在加载文档详情...</div>';
      await loadFileDetails(kbName, fileKey);
    }
  } else {
    // 折叠
    detailsDiv.classList.add('hidden');
    expandIcon.textContent = '▶';
  }
}

/**
 * 加载文件详情（chunks预览）
 */
async function loadFileDetails(kbName, fileKey) {
  const docsList = document.querySelector(`#kbDocs_${kbName}`);
  if (!docsList) return;
  
  const fileData = docsList._fileDataMap?.get(fileKey);
  if (!fileData) return;
  
  // 如果已加载，直接显示
  if (fileData.loaded && fileData.chunks && fileData.chunks.length > 0) {
    renderFileDetails(fileKey, fileData);
    return;
  }
  
  try {
    // 加载包含预览的文档列表
    const result = await kbService.getKnowledgeBaseDocs(kbName, {
      includePreview: true,
      maxPreviewChunks: 10
    });
    
    if (result.success && result.files) {
      // 找到对应的文件
      const file = result.files.find(f => f.filename === fileData.filename);
      if (file) {
        // 更新文件数据
        fileData.chunks = file.chunks || [];
        fileData.docIds = file.chunks?.map(c => c.id) || [];
        fileData.loaded = true;
        
        // 更新Map
        docsList._fileDataMap.set(fileKey, fileData);
        
        // 渲染详情
        renderFileDetails(fileKey, fileData);
      }
    }
  } catch (error) {
    console.error('加载文件详情失败:', error);
    const detailsContent = document.querySelector(`#kbDocDetails_${fileKey} .kb-doc-details-content`);
    if (detailsContent) {
      detailsContent.innerHTML = `<div class="kb-doc-error">加载失败: ${error.message}</div>`;
    }
  }
}

/**
 * 渲染文件详情
 */
function renderFileDetails(fileKey, fileData) {
  const detailsContent = document.querySelector(`#kbDocDetails_${fileKey} .kb-doc-details-content`);
  if (!detailsContent) return;
  
  if (!fileData.chunks || fileData.chunks.length === 0) {
    detailsContent.innerHTML = '<div class="kb-doc-empty">暂无预览内容</div>';
    return;
  }
  
  let html = '<div class="kb-doc-chunks-list">';
  fileData.chunks.forEach((chunk, index) => {
    html += `
      <div class="kb-doc-chunk-item">
        <div class="kb-doc-chunk-header">
          <span class="kb-doc-chunk-index">片段 ${chunk.chunk_index + 1}</span>
          ${chunk.score !== undefined ? `<span class="kb-doc-chunk-score">相似度: ${(chunk.score * 100).toFixed(1)}%</span>` : ''}
        </div>
        <div class="kb-doc-chunk-text">${escapeHtml(chunk.text_preview || chunk.text || '')}</div>
      </div>
    `;
  });
  html += '</div>';
  
  if (fileData.chunksCount > fileData.chunks.length) {
    html += `<div class="kb-doc-chunks-more">显示 ${fileData.chunks.length} / ${fileData.chunksCount} 个片段（预览模式）</div>`;
  }
  
  detailsContent.innerHTML = html;
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 创建知识库
 */
async function handleCreateKB() {
  const name = elements.newKBName.value.trim();
  if (!name) {
    alert('请输入知识库名称');
    return;
  }
  
  elements.createKBBtn.disabled = true;
  elements.createKBBtn.textContent = '创建中...';
  
  try {
    const result = await kbService.createKnowledgeBase(name);
    if (result.success) {
      elements.newKBName.value = '';
      await loadKnowledgeBases();
      alert('知识库创建成功！');
    } else {
      alert('创建失败: ' + result.message);
    }
  } catch (error) {
    alert('创建失败: ' + error.message);
  } finally {
    elements.createKBBtn.disabled = false;
    elements.createKBBtn.textContent = '创建知识库';
  }
}

/**
 * 删除知识库
 */
async function handleDeleteKB(kbName) {
  try {
    const result = await kbService.deleteKnowledgeBase(kbName);
    if (result.success) {
      await loadKnowledgeBases();
      alert('知识库删除成功！');
    } else {
      alert('删除失败: ' + result.message);
    }
  } catch (error) {
    alert('删除失败: ' + error.message);
  }
}

/**
 * 上传文件
 */
/**
 * 加载切分策略列表
 */
async function loadSplitStrategiesForKB(kbName) {
  try {
    const result = await kbService.getSplitStrategies();
    const select = document.getElementById(`kbSplitStrategy_${kbName}`);
    if (!select) return;
    
    select.innerHTML = '';
    
    if (result.success && result.strategies) {
      for (const [key, description] of Object.entries(result.strategies)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${key} - ${description}`;
        select.appendChild(option);
      }
      
      // 设置默认值
      select.value = 'fixed';
      updateStrategyDescription(kbName, 'fixed', result.strategies);
    }
  } catch (error) {
    console.error('加载切分策略失败:', error);
    const select = document.getElementById(`kbSplitStrategy_${kbName}`);
    if (select) {
      select.innerHTML = '<option value="">加载失败</option>';
    }
  }
}

/**
 * 更新策略说明
 */
function updateStrategyDescription(kbName, strategy, strategies = null) {
  const descElement = document.getElementById(`kbStrategyDesc_${kbName}`);
  if (!descElement) return;
  
  if (!strategies) {
    // 如果没有传入策略列表，尝试从select中获取
    const select = document.getElementById(`kbSplitStrategy_${kbName}`);
    if (select && select.options.length > 0) {
      const option = Array.from(select.options).find(opt => opt.value === strategy);
      if (option) {
        const parts = option.textContent.split(' - ');
        if (parts.length > 1) {
          descElement.textContent = parts.slice(1).join(' - ');
          return;
        }
      }
    }
    descElement.textContent = '';
    return;
  }
  
  if (strategies[strategy]) {
    descElement.textContent = strategies[strategy];
  } else {
    descElement.textContent = '';
  }
}

/**
 * 上传文件
 * @param {string} kbName - 知识库名称
 * @param {File} file - 文件对象
 * @param {string} splitStrategy - 切分策略
 * @param {number} chunkSize - Chunk大小
 * @param {number} chunkOverlap - Chunk重叠大小
 */
async function handleUploadFile(kbName, file, splitStrategy = 'fixed', chunkSize = 400, chunkOverlap = 50) {
  try {
    const result = await kbService.uploadFile(kbName, file, splitStrategy, chunkSize, chunkOverlap);
    if (result.success) {
      await loadKnowledgeBases();
      alert(`文件上传成功！\n文件：${result.filename}\n切分为 ${result.chunks_count} 个片段`);
    } else {
      alert('上传失败: ' + result.message);
    }
  } catch (error) {
    alert('上传失败: ' + error.message);
  }
}

/**
 * 删除文档
 */
async function handleDeleteDocuments(kbName, docIds) {
  try {
    if (!Array.isArray(docIds) || docIds.length === 0) {
      alert('没有可删除的文档片段');
      return;
    }
    
    const result = await kbService.deleteDocuments(kbName, docIds);
    if (result.success) {
      // 刷新知识库列表
      await loadKnowledgeBases();
      alert(`文档删除成功！已删除 ${result.deleted_count || docIds.length} 个片段`);
    } else {
      alert('删除失败: ' + (result.message || '未知错误'));
    }
  } catch (error) {
    console.error('删除文档错误:', error);
    alert('删除失败: ' + error.message);
  }
}

// 启动应用
initialize();

