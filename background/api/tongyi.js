/**
 * 通义千问 API 实现
 */

export default class TongyiAPI {
  /**
   * 验证 API Key
   */
  async verifyApiKey(provider) {
    try {
      const response = await fetch(`${provider.baseURL}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: { messages: [{ role: 'user', content: 'test' }] },
          parameters: { max_tokens: 1 }
        })
      });
      
      return response.ok || response.status === 400;
    } catch (error) {
      console.error('Tongyi API key verification failed:', error);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels(provider) {
    // 通义千问没有公开的模型列表 API
    // 尝试调用一个测试请求来验证 API Key
    try {
      const response = await fetch(`${provider.baseURL}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: { messages: [{ role: 'user', content: 'test' }] },
          parameters: { max_tokens: 1 }
        })
      });
      
      // API Key 有效，但无法自动获取模型列表
      // 返回空数组，让用户手动输入模型名称
      if (response.ok || response.status === 400) {
        return [];
      }
    } catch (error) {
      console.error('Tongyi API test failed:', error);
    }
    
    // 返回空数组，表示需要手动配置
    return [];
  }

  /**
   * 获取推荐的模型列表（供用户参考）
   */
  getRecommendedModels() {
    return [
      {
        id: 'qwen-turbo',
        name: '通义千问-Turbo',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: true
        },
        maxTokens: 6000,
        contextWindow: 8000
      },
      {
        id: 'qwen-plus',
        name: '通义千问-Plus',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: true
        },
        maxTokens: 6000,
        contextWindow: 32000
      },
      {
        id: 'qwen-max',
        name: '通义千问-Max',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: true
        },
        maxTokens: 6000,
        contextWindow: 8000
      },
      {
        id: 'qwen-long',
        name: '通义千问-Long（长文本）',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: false
        },
        maxTokens: 6000,
        contextWindow: 1000000
      },
      {
        id: 'qwen2-72b-instruct',
        name: 'Qwen2-72B-Instruct',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: false
        },
        maxTokens: 6000,
        contextWindow: 32000
      },
      {
        id: 'qwen2-7b-instruct',
        name: 'Qwen2-7B-Instruct',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: false
        },
        maxTokens: 6000,
        contextWindow: 32000
      },
      {
        id: 'qwen2-1.5b-instruct',
        name: 'Qwen2-1.5B-Instruct',
        providerId: provider.id,
        enabled: true,
        capabilities: {
          chat: true,
          streaming: true,
          functionCall: false
        },
        maxTokens: 6000,
        contextWindow: 32000
      },
      {
        id: 'qwen-vl-plus',
        name: '通义千问-VL-Plus（多模态）',
        providerId: provider.id,
        enabled: false,
        capabilities: {
          chat: true,
          streaming: false,
          functionCall: false
        },
        maxTokens: 6000,
        contextWindow: 8000
      },
      {
        id: 'qwen-vl-max',
        name: '通义千问-VL-Max（多模态）',
        providerId: provider.id,
        enabled: false,
        capabilities: {
          chat: true,
          streaming: false,
          functionCall: false
        },
        maxTokens: 6000,
        contextWindow: 8000
      }
    ];
  }

  /**
   * 聊天对话
   */
  async chat({ model, apiKey, baseURL, messages }) {
    try {
      const response = await fetch(`${baseURL}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: { messages: messages },
          parameters: {
            temperature: 0.7,
            max_tokens: 4000,
            result_format: 'message'
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.output.choices[0].message.content;
    } catch (error) {
      console.error('Tongyi chat failed:', error);
      throw error;
    }
  }

  /**
   * 流式聊天对话
   */
  async *chatStream({ model, apiKey, baseURL, messages }) {
    try {
      const response = await fetch(`${baseURL}/services/aigc/text-generation/generation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable'
        },
        body: JSON.stringify({
          model: model,
          input: { messages: messages },
          parameters: {
            temperature: 0.7,
            max_tokens: 4000,
            result_format: 'message',
            incremental_output: true
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            
            try {
              const json = JSON.parse(data);
              const content = json.output?.choices?.[0]?.message?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Tongyi chat stream failed:', error);
      throw error;
    }
  }
}

