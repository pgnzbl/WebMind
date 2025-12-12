/**
 * WebMind Options Page Script
 */

import storage from '../shared/storage.js';
import { createAgent, validateAgent, generateId } from '../shared/models.js';
import { formatDate, downloadFile, safeJSONParse } from '../shared/utils.js';

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
  saveAgentBtn: document.getElementById('saveAgentBtn')
};

// 当前状态
let currentAgent = null;

/**
 * 初始化
 */
async function initialize() {
  // 初始化存储
  await storage.initialize();
  
  // 绑定事件
  bindEvents();
  
  // 加载数据
  await loadAgents();
  await loadProviders();
  await loadSettings();
  
  console.log('Options page initialized');
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
  } else {
    // 创建模式
    elements.modalTitle.textContent = '创建智能代理';
    elements.agentForm.reset();
    elements.agentId.value = '';
    elements.agentPromptTemplate.value = '请分析以下网页内容：\n\n{{content}}';
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
  
  // 创建或更新代理对象
  const agentData = {
    name,
    description,
    systemPrompt,
    modelId,
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

// 启动应用
initialize();

