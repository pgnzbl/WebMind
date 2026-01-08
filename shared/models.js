/**
 * WebMind 数据模型定义
 * 定义所有核心数据结构和接口
 */

/**
 * AI 平台配置
 * @typedef {Object} AIProvider
 * @property {string} id - 平台唯一标识
 * @property {string} name - 平台名称
 * @property {string} apiKey - API 密钥
 * @property {string} baseURL - API 基础 URL
 * @property {boolean} enabled - 是否启用
 * @property {AIModel[]} models - 可用模型列表（自动检测）
 * @property {string[]} customModels - 手动添加的模型名称列表
 * @property {Date} lastVerified - 最后验证时间
 */

/**
 * AI 模型
 * @typedef {Object} AIModel
 * @property {string} id - 模型唯一标识
 * @property {string} name - 模型名称
 * @property {string} providerId - 所属平台 ID
 * @property {boolean} enabled - 是否启用
 * @property {ModelCapabilities} capabilities - 模型能力
 * @property {number} maxTokens - 最大 token 数
 * @property {number} contextWindow - 上下文窗口大小
 */

/**
 * 模型能力
 * @typedef {Object} ModelCapabilities
 * @property {boolean} chat - 支持对话
 * @property {boolean} streaming - 支持流式输出
 * @property {boolean} functionCall - 支持函数调用
 */

/**
 * 智能代理
 * @typedef {Object} Agent
 * @property {string} id - 代理唯一标识
 * @property {string} name - 代理名称
 * @property {string} description - 代理描述
 * @property {string} systemPrompt - 系统提示词
 * @property {string} modelId - 使用的模型 ID（格式: providerId:modelName）
 * @property {AgentConfig} config - 代理配置
 * @property {boolean} enableKnowledgeBase - 是否启用知识库
 * @property {string|null} knowledgeBaseName - 选择的知识库名称
 * @property {'document'|'chat'} mode - Agent 模式（文档生成/聊天）
 * @property {Date} createdAt - 创建时间
 * @property {Date} updatedAt - 更新时间
 */

/**
 * 代理配置
 * @typedef {Object} AgentConfig
 * @property {string} outputFormat - 输出格式 (markdown|docx)
 * @property {string} promptTemplate - 提示词模板
 * @property {ContentExtractionConfig} contentExtraction - 内容提取配置
 * @property {DocumentConfig} documentConfig - 文档配置
 */

/**
 * 内容提取配置
 * @typedef {Object} ContentExtractionConfig
 * @property {string[]} includeSelectors - 包含的 CSS 选择器
 * @property {string[]} excludeSelectors - 排除的 CSS 选择器
 * @property {boolean} includeImages - 是否包含图片
 * @property {boolean} includeLinks - 是否包含链接
 * @property {number} maxLength - 最大内容长度
 */

/**
 * 文档配置
 * @typedef {Object} DocumentConfig
 * @property {string} template - 文档模板
 * @property {boolean} includeMetadata - 是否包含元数据
 * @property {string} titleFormat - 标题格式
 * @property {object} styling - 样式配置
 */

/**
 * 任务记录
 * @typedef {Object} TaskRecord
 * @property {string} id - 任务唯一标识
 * @property {string} agentId - 使用的代理 ID
 * @property {string} modelId - 使用的模型 ID
 * @property {string} url - 网页 URL
 * @property {string} title - 网页标题
 * @property {string} content - 提取的内容
 * @property {string} result - 生成的结果
 * @property {TaskStatus} status - 任务状态
 * @property {Date} startTime - 开始时间
 * @property {Date} endTime - 结束时间
 * @property {Error} error - 错误信息
 */

/**
 * 任务状态
 * @typedef {'pending'|'processing'|'completed'|'failed'} TaskStatus
 */

/**
 * 存储数据结构
 * @typedef {Object} StorageData
 * @property {AIProvider[]} providers - AI 平台列表
 * @property {Agent[]} agents - 智能代理列表
 * @property {TaskRecord[]} history - 任务历史记录
 * @property {AppSettings} settings - 应用设置
 */

/**
 * 应用设置
 * @typedef {Object} AppSettings
 * @property {string} defaultAgentId - 默认代理 ID
 * @property {string} theme - 主题 (light|dark|auto)
 * @property {number} maxHistorySize - 最大历史记录数
 * @property {boolean} autoCleanHistory - 自动清理历史
 * @property {string} ragBackendUrl - RAG 后端 API 地址
 * @property {string} ragApiKey - RAG 后端 API 密钥
 */

// 默认配置常量
export const DEFAULT_PROVIDERS = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    enabled: false,
    models: [],
    customModels: []
  },
  {
    id: 'tongyi',
    name: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/api/v1',
    enabled: false,
    models: [],
    customModels: []
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseURL: 'https://api.siliconflow.cn/v1',
    enabled: false,
    models: [],
    customModels: []
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    enabled: false,
    models: [],
    customModels: []
  }
];

export const DEFAULT_SETTINGS = {
  defaultAgentId: null,
  theme: 'auto',
  maxHistorySize: 100,
  autoCleanHistory: true,
  ragBackendUrl: 'http://localhost:8000',
  ragApiKey: ''
};

export const DEFAULT_CONTENT_EXTRACTION = {
  includeSelectors: ['article', 'main', '.content', '.post-content'],
  excludeSelectors: ['nav', 'header', 'footer', '.sidebar', '.advertisement'],
  includeImages: true,
  includeLinks: true,
  maxLength: 50000
};

export const DEFAULT_DOCUMENT_CONFIG = {
  template: 'standard',
  includeMetadata: true,
  titleFormat: '{{title}} - {{date}}',
  styling: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12pt',
    lineHeight: 1.6
  }
};

/**
 * 创建新的智能代理
 * @param {Partial<Agent>} data 
 * @returns {Agent}
 */
export function createAgent(data = {}) {
  const now = new Date().toISOString(); // 使用 ISO 字符串格式存储
  
  return {
    id: data.id || generateId(),
    name: data.name || '新代理',
    description: data.description || '',
    systemPrompt: data.systemPrompt || '',
    modelId: data.modelId || '', // 单个模型 ID
    enableKnowledgeBase: data.enableKnowledgeBase || false,
    knowledgeBaseName: data.knowledgeBaseName || null,
    mode: data.mode || 'document', // 默认文档生成模式
    config: {
      promptTemplate: data.config?.promptTemplate || '请分析以下网页内容：\n\n{{content}}',
      contentExtraction: { ...DEFAULT_CONTENT_EXTRACTION, ...data.config?.contentExtraction },
      documentConfig: { ...DEFAULT_DOCUMENT_CONFIG, ...data.config?.documentConfig }
    },
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

/**
 * 创建新的任务记录
 * @param {Partial<TaskRecord>} data 
 * @returns {TaskRecord}
 */
export function createTaskRecord(data = {}) {
  return {
    id: data.id || generateId(),
    agentId: data.agentId,
    modelId: data.modelId,
    url: data.url || '',
    title: data.title || '',
    content: data.content || '',
    result: data.result || '',
    status: data.status || 'pending',
    startTime: data.startTime || new Date().toISOString(),
    endTime: data.endTime || null,
    error: data.error || null
  };
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 验证代理配置
 * @param {Agent} agent 
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateAgent(agent) {
  const errors = [];
  
  if (!agent.name || agent.name.trim() === '') {
    errors.push('代理名称不能为空');
  }
  
  if (!agent.systemPrompt || agent.systemPrompt.trim() === '') {
    errors.push('System Prompt 不能为空');
  }
  
  if (!agent.modelId || agent.modelId.trim() === '') {
    errors.push('必须选择一个 AI 模型');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证 API 密钥格式
 * @param {string} apiKey 
 * @param {string} providerId 
 * @returns {boolean}
 */
export function validateApiKey(apiKey, providerId) {
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }
  
  // 基础格式验证
  const minLength = 20;
  return apiKey.length >= minLength;
}

