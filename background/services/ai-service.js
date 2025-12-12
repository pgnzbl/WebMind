/**
 * AI 服务统一接口
 * 处理所有 AI 平台的 API 调用
 */

import DeepSeekAPI from '../api/deepseek.js';
import TongyiAPI from '../api/tongyi.js';
import SiliconFlowAPI from '../api/siliconflow.js';
import OpenAIAPI from '../api/openai.js';

class AIService {
  constructor() {
    this.apis = {
      deepseek: new DeepSeekAPI(),
      tongyi: new TongyiAPI(),
      siliconflow: new SiliconFlowAPI(),
      openai: new OpenAIAPI()
    };
  }

  /**
   * 获取对应的 API 实例
   */
  getAPI(providerId) {
    const api = this.apis[providerId];
    if (!api) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    return api;
  }

  /**
   * 验证 API Key
   */
  async verifyApiKey(provider) {
    const api = this.getAPI(provider.id);
    return await api.verifyApiKey(provider);
  }

  /**
   * 检测可用模型
   */
  async detectModels(provider) {
    const api = this.getAPI(provider.id);
    return await api.listModels(provider);
  }

  /**
   * 聊天对话
   */
  async chat({ model, provider, systemPrompt, userPrompt }) {
    const api = this.getAPI(model.providerId);
    
    return await api.chat({
      model: model.id,
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
  }

  /**
   * 流式聊天对话
   */
  async *chatStream({ model, provider, systemPrompt, userPrompt }) {
    const api = this.getAPI(model.providerId);
    
    yield* api.chatStream({
      model: model.id,
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
  }
}

export default new AIService();

