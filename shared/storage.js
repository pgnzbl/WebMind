/**
 * WebMind 存储管理模块
 * 统一管理所有数据的存储和读取
 */

import { DEFAULT_PROVIDERS, DEFAULT_SETTINGS } from './models.js';

// 存储键名常量
const STORAGE_KEYS = {
  PROVIDERS: 'providers',
  AGENTS: 'agents',
  HISTORY: 'history',
  SETTINGS: 'settings'
};

/**
 * 存储管理类
 */
class StorageManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 初始化存储
   */
  async initialize() {
    const data = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
    
    // 初始化默认值
    if (!data[STORAGE_KEYS.PROVIDERS]) {
      await this.setProviders(DEFAULT_PROVIDERS);
    }
    
    if (!data[STORAGE_KEYS.AGENTS]) {
      await this.setAgents([]);
    }
    
    if (!data[STORAGE_KEYS.HISTORY]) {
      await this.setHistory([]);
    }
    
    if (!data[STORAGE_KEYS.SETTINGS]) {
      await this.setSettings(DEFAULT_SETTINGS);
    }
    
    return true;
  }

  /**
   * 获取所有 AI 平台配置
   * @returns {Promise<AIProvider[]>}
   */
  async getProviders() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.PROVIDERS);
    return data[STORAGE_KEYS.PROVIDERS] || DEFAULT_PROVIDERS;
  }

  /**
   * 保存 AI 平台配置
   * @param {AIProvider[]} providers 
   */
  async setProviders(providers) {
    await chrome.storage.local.set({ [STORAGE_KEYS.PROVIDERS]: providers });
    this.cache.delete(STORAGE_KEYS.PROVIDERS);
  }

  /**
   * 获取单个平台配置
   * @param {string} providerId 
   * @returns {Promise<AIProvider|null>}
   */
  async getProvider(providerId) {
    const providers = await this.getProviders();
    return providers.find(p => p.id === providerId) || null;
  }

  /**
   * 更新平台配置
   * @param {string} providerId 
   * @param {Partial<AIProvider>} updates 
   */
  async updateProvider(providerId, updates) {
    const providers = await this.getProviders();
    const index = providers.findIndex(p => p.id === providerId);
    
    if (index !== -1) {
      providers[index] = { ...providers[index], ...updates };
      await this.setProviders(providers);
    }
  }

  /**
   * 获取所有智能代理
   * @returns {Promise<Agent[]>}
   */
  async getAgents() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.AGENTS);
    return data[STORAGE_KEYS.AGENTS] || [];
  }

  /**
   * 保存智能代理列表
   * @param {Agent[]} agents 
   */
  async setAgents(agents) {
    await chrome.storage.local.set({ [STORAGE_KEYS.AGENTS]: agents });
    this.cache.delete(STORAGE_KEYS.AGENTS);
  }

  /**
   * 获取单个代理
   * @param {string} agentId 
   * @returns {Promise<Agent|null>}
   */
  async getAgent(agentId) {
    const agents = await this.getAgents();
    return agents.find(a => a.id === agentId) || null;
  }

  /**
   * 添加新代理
   * @param {Agent} agent 
   */
  async addAgent(agent) {
    const agents = await this.getAgents();
    agents.push(agent);
    await this.setAgents(agents);
  }

  /**
   * 更新代理
   * @param {string} agentId 
   * @param {Partial<Agent>} updates 
   */
  async updateAgent(agentId, updates) {
    const agents = await this.getAgents();
    const index = agents.findIndex(a => a.id === agentId);
    
    if (index !== -1) {
      agents[index] = { 
        ...agents[index], 
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await this.setAgents(agents);
    }
  }

  /**
   * 删除代理
   * @param {string} agentId 
   */
  async deleteAgent(agentId) {
    const agents = await this.getAgents();
    const filtered = agents.filter(a => a.id !== agentId);
    await this.setAgents(filtered);
  }

  /**
   * 获取任务历史记录
   * @param {number} limit 
   * @returns {Promise<TaskRecord[]>}
   */
  async getHistory(limit = null) {
    const data = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    let history = data[STORAGE_KEYS.HISTORY] || [];
    
    // 按时间倒序排列
    history.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    if (limit) {
      history = history.slice(0, limit);
    }
    
    return history;
  }

  /**
   * 保存任务历史记录
   * @param {TaskRecord[]} history 
   */
  async setHistory(history) {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
    this.cache.delete(STORAGE_KEYS.HISTORY);
  }

  /**
   * 添加任务记录
   * @param {TaskRecord} record 
   */
  async addHistory(record) {
    const history = await this.getHistory();
    history.unshift(record);
    
    // 检查是否需要清理
    const settings = await this.getSettings();
    if (settings.autoCleanHistory && history.length > settings.maxHistorySize) {
      history.splice(settings.maxHistorySize);
    }
    
    await this.setHistory(history);
  }

  /**
   * 清空历史记录
   */
  async clearHistory() {
    await this.setHistory([]);
  }

  /**
   * 获取应用设置
   * @returns {Promise<AppSettings>}
   */
  async getSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return data[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  /**
   * 保存应用设置
   * @param {AppSettings} settings 
   */
  async setSettings(settings) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    this.cache.delete(STORAGE_KEYS.SETTINGS);
  }

  /**
   * 更新部分设置
   * @param {Partial<AppSettings>} updates 
   */
  async updateSettings(updates) {
    const settings = await this.getSettings();
    const newSettings = { ...settings, ...updates };
    await this.setSettings(newSettings);
  }

  /**
   * 获取 RAG 后端 URL
   * @returns {Promise<string>}
   */
  async getRAGBackendUrl() {
    const settings = await this.getSettings();
    return settings.ragBackendUrl || 'http://localhost:8000';
  }

  /**
   * 设置 RAG 后端 URL
   * @param {string} url 
   */
  async setRAGBackendUrl(url) {
    await this.updateSettings({ ragBackendUrl: url });
  }

  /**
   * 获取 RAG 后端 API 密钥
   * @returns {Promise<string>}
   */
  async getRAGApiKey() {
    const settings = await this.getSettings();
    return settings.ragApiKey || '';
  }

  /**
   * 设置 RAG 后端 API 密钥
   * @param {string} apiKey 
   */
  async setRAGApiKey(apiKey) {
    await this.updateSettings({ ragApiKey: apiKey });
  }

  /**
   * 获取所有已启用的模型
   * @returns {Promise<AIModel[]>}
   */
  async getEnabledModels() {
    const providers = await this.getProviders();
    const models = [];
    
    for (const provider of providers) {
      if (provider.enabled && provider.models) {
        const enabledModels = provider.models.filter(m => m.enabled);
        models.push(...enabledModels);
      }
    }
    
    return models;
  }

  /**
   * 导出所有数据
   * @returns {Promise<StorageData>}
   */
  async exportData() {
    const [providers, agents, history, settings] = await Promise.all([
      this.getProviders(),
      this.getAgents(),
      this.getHistory(),
      this.getSettings()
    ]);
    
    return {
      providers,
      agents,
      history,
      settings,
      exportTime: new Date().toISOString()
    };
  }

  /**
   * 导入数据
   * @param {StorageData} data 
   */
  async importData(data) {
    if (data.providers) await this.setProviders(data.providers);
    if (data.agents) await this.setAgents(data.agents);
    if (data.history) await this.setHistory(data.history);
    if (data.settings) await this.setSettings(data.settings);
  }

  /**
   * 清空所有数据
   */
  async clearAll() {
    await chrome.storage.local.clear();
    this.cache.clear();
    await this.initialize();
  }
}

// 创建单例
const storage = new StorageManager();

export default storage;

