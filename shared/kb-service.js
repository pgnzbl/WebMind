/**
 * WebMind 知识库服务模块
 * 封装与 RAGBackend API 的所有交互
 */

import storage from './storage.js';

class KBService {
  constructor() {
    this.baseURL = null;
  }

  /**
   * 获取后端 API 地址
   */
  async getBaseURL() {
    if (!this.baseURL) {
      const settings = await storage.getSettings();
      this.baseURL = settings.ragBackendUrl || 'http://localhost:8000';
    }
    return this.baseURL;
  }

  /**
   * 获取 API 密钥
   */
  async getApiKey() {
    const settings = await storage.getSettings();
    return settings.ragApiKey || '';
  }

  /**
   * 检查端点是否需要认证
   */
  needsAuth(endpoint) {
    // 健康检查和根路径不需要认证
    const noAuthEndpoints = ['/', '/health'];
    return !noAuthEndpoints.some(path => endpoint === path || endpoint.startsWith(path + '?'));
  }

  /**
   * 通用请求方法
   */
  async request(endpoint, options = {}) {
    const baseURL = await this.getBaseURL();
    const url = `${baseURL}${endpoint}`;
    
    // 获取 API 密钥
    const apiKey = await this.getApiKey();
    const needsAuth = this.needsAuth(endpoint);
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // 只有需要认证的端点才添加API密钥
        ...(needsAuth && apiKey && { 'X-API-Key': apiKey }),
        ...options.headers,
      },
    };

    // 如果是 FormData，不设置 Content-Type（让浏览器自动设置）
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    } else if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      // 处理认证错误
      if (response.status === 401) {
        const error = await response.json().catch(() => ({ detail: 'Unauthorized' }));
        throw new Error(`认证失败: ${error.detail || '缺少API密钥，请在设置中配置API密钥'}`);
      }
      
      if (response.status === 403) {
        const error = await response.json().catch(() => ({ detail: 'Forbidden' }));
        throw new Error(`认证失败: ${error.detail || 'API密钥无效，请检查配置'}`);
      }
      
      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (!text) {
          throw new Error('服务器返回空响应');
        }
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('JSON解析失败:', parseError, '响应文本:', text);
          throw new Error('服务器返回的数据格式错误');
        }
      } else {
        // 非JSON响应，尝试解析为文本
        const text = await response.text();
        if (!response.ok) {
          throw new Error(text || `HTTP ${response.status}`);
        }
        return { success: true, message: text };
      }

      if (!response.ok) {
        throw new Error(data.detail || data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('KB API 请求失败:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      return await this.request('/health');
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  // ============= 知识库管理 =============
  // 注意：Embedding 配置已由后端固定管理，前端无需配置

  /**
   * 创建知识库
   */
  async createKnowledgeBase(name) {
    return await this.request('/kb/create', {
      method: 'POST',
      body: { name },
    });
  }

  /**
   * 获取知识库列表
   */
  async listKnowledgeBases() {
    return await this.request('/kb/list');
  }

  /**
   * 获取知识库文档列表
   * @param {string} kbName - 知识库名称
   * @param {object} options - 选项参数
   * @param {number|null} options.limit - 限制返回数量，null表示不限制（默认null）
   * @param {boolean} options.includePreview - 是否包含chunk预览，默认false（快速加载）
   * @param {number} options.maxPreviewChunks - 每个文件最多返回的预览数量，默认5
   */
  async getKnowledgeBaseDocs(kbName, options = {}) {
    const {
      limit = null,
      includePreview = false,
      maxPreviewChunks = 5
    } = options;
    
    const params = new URLSearchParams();
    if (limit !== null) {
      params.append('limit', limit.toString());
    }
    params.append('include_preview', includePreview.toString());
    params.append('max_preview_chunks', maxPreviewChunks.toString());
    
    return await this.request(`/kb/${encodeURIComponent(kbName)}/docs?${params}`);
  }

  /**
   * 删除知识库
   */
  async deleteKnowledgeBase(name) {
    return await this.request(`/kb/${name}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取切分策略列表
   */
  async getSplitStrategies() {
    return await this.request('/kb/split-strategies');
  }

  /**
   * 上传文件到知识库
   * @param {string} kbName - 知识库名称
   * @param {File} file - 要上传的文件
   * @param {string} splitStrategy - 切分策略，默认 'fixed'
   * @param {number} chunkSize - Chunk大小（字符数），默认 400
   * @param {number} chunkOverlap - Chunk重叠大小，默认 50
   */
  async uploadFile(kbName, file, splitStrategy = 'fixed', chunkSize = 400, chunkOverlap = 50) {
    const baseURL = await this.getBaseURL();
    const apiKey = await this.getApiKey();
    const formData = new FormData();
    formData.append('file', file);

    // 构建查询参数
    const params = new URLSearchParams({
      split_strategy: splitStrategy,
      chunk_size: chunkSize.toString(),
      chunk_overlap: chunkOverlap.toString()
    });

    const headers = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(`${baseURL}/kb/${encodeURIComponent(kbName)}/upload?${params}`, {
      method: 'POST',
      headers,
      body: formData,
      // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
    });

    // 处理认证错误
    if (response.status === 401 || response.status === 403) {
      const error = await response.json().catch(() => ({ detail: 'API密钥认证失败' }));
      throw new Error(`认证失败: ${error.detail || 'API密钥无效'}`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * 删除文档
   */
  async deleteDocuments(kbName, docIds) {
    return await this.request(`/kb/${kbName}/docs`, {
      method: 'DELETE',
      body: { doc_ids: docIds },
    });
  }

  /**
   * 查询知识库
   */
  async query(kbName, query, topK = 5) {
    return await this.request(`/kb/${kbName}/query`, {
      method: 'POST',
      body: { query, top_k: topK },
    });
  }

  /**
   * 重置 baseURL（当设置更改时调用）
   */
  resetBaseURL() {
    this.baseURL = null;
  }
}

// 创建单例
const kbService = new KBService();

export default kbService;

