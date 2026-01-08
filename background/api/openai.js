/**
 * OpenAI API 实现
 */

export default class OpenAIAPI {
  /**
   * 验证 API Key
   */
  async verifyApiKey(provider) {
    try {
      const response = await fetch(`${provider.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('OpenAI API key verification failed:', error);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels(provider) {
    try {
      const response = await fetch(`${provider.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // 过滤出 GPT 模型
      return data.data
        .filter(model => model.id.startsWith('gpt-'))
        .map(model => ({
          id: model.id,
          name: model.id,
          providerId: provider.id,
          enabled: true,
          capabilities: {
            chat: true,
            streaming: true,
            functionCall: true
          },
          maxTokens: this.getMaxTokens(model.id),
          contextWindow: this.getContextWindow(model.id)
        }));
    } catch (error) {
      console.error('Failed to list OpenAI models:', error);
      throw error;
    }
  }

  /**
   * 获取模型最大 token 数
   */
  getMaxTokens(modelId) {
    const tokenMap = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 4096,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    };
    
    for (const [key, value] of Object.entries(tokenMap)) {
      if (modelId.includes(key)) {
        return value;
      }
    }
    
    return 4096;
  }

  /**
   * 获取模型上下文窗口大小
   */
  getContextWindow(modelId) {
    if (modelId.includes('gpt-4-32k')) return 32768;
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('16k')) return 16384;
    return 4096;
  }

  /**
   * 聊天对话
   */
  async chat({ model, apiKey, baseURL, messages }) {
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI chat failed:', error);
      throw error;
    }
  }

  /**
   * 流式聊天对话
   */
  async *chatStream({ model, apiKey, baseURL, messages }) {
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: true
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content;
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
      console.error('OpenAI chat stream failed:', error);
      throw error;
    }
  }
}

