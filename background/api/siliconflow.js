/**
 * 硅基流动 API 实现
 * 使用 OpenAI 兼容接口
 */

export default class SiliconFlowAPI {
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
      console.error('SiliconFlow API key verification failed:', error);
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
      
      // 过滤出聊天模型
      return data.data
        .filter(model => model.id.includes('chat') || model.id.includes('qwen') || model.id.includes('deepseek'))
        .map(model => ({
          id: model.id,
          name: model.id,
          providerId: provider.id,
          enabled: true,
          capabilities: {
            chat: true,
            streaming: true,
            functionCall: false
          },
          maxTokens: 4096,
          contextWindow: 8192
        }));
    } catch (error) {
      console.error('Failed to list SiliconFlow models:', error);
      throw error;
    }
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
      console.error('SiliconFlow chat failed:', error);
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
      console.error('SiliconFlow chat stream failed:', error);
      throw error;
    }
  }
}

