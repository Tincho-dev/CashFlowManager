// LLM Service Interface and Implementations
import { appConfig, isLLMEnabled } from '../config/appConfig';
import LoggingService, { LogCategory } from './LoggingService';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// LLM Provider Interface
export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  chat(messages: LLMMessage[]): Promise<LLMResponse>;
  complete(prompt: string): Promise<string>;
}

// ChatGPT Provider
class ChatGPTProvider implements LLMProvider {
  name = 'ChatGPT';
  
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;
  
  constructor() {
    this.apiKey = appConfig.llm.apiKey || '';
    this.apiEndpoint = appConfig.llm.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    this.model = appConfig.llm.model || 'gpt-3.5-turbo';
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`ChatGPT API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }
  
  async complete(prompt: string): Promise<string> {
    const response = await this.chat([{ role: 'user', content: prompt }]);
    return response.content;
  }
}

// Ollama Provider (local LLM)
class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  
  private apiEndpoint: string;
  private model: string;
  
  constructor() {
    this.apiEndpoint = appConfig.llm.apiEndpoint || 'http://localhost:11434';
    this.model = appConfig.llm.model || 'llama2';
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Convert messages to Ollama format
    const prompt = messages.map(m => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    }).join('\n');
    
    const response = await fetch(`${this.apiEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      content: data.response,
      model: this.model,
    };
  }
  
  async complete(prompt: string): Promise<string> {
    const response = await this.chat([{ role: 'user', content: prompt }]);
    return response.content;
  }
}

// Gemini Provider
class GeminiProvider implements LLMProvider {
  name = 'Gemini';
  
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;
  
  constructor() {
    this.apiKey = appConfig.llm.apiKey || '';
    this.model = appConfig.llm.model || 'gemini-pro';
    this.apiEndpoint = appConfig.llm.apiEndpoint || 
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }
  
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
    
    // Add system message as context if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: `Context: ${systemMessage.content}` }],
      });
    }
    
    const response = await fetch(`${this.apiEndpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: contents,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      model: this.model,
    };
  }
  
  async complete(prompt: string): Promise<string> {
    const response = await this.chat([{ role: 'user', content: prompt }]);
    return response.content;
  }
}

// Fallback provider (uses local keyword-based responses)
class LocalProvider implements LLMProvider {
  name = 'Local';
  
  async isAvailable(): Promise<boolean> {
    return true;
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    // Return a simple response for local mode
    const lastMessage = messages[messages.length - 1];
    return {
      content: `I'm running in local mode without an LLM backend. Your message was: "${lastMessage.content}"`,
      model: 'local-fallback',
    };
  }
  
  async complete(prompt: string): Promise<string> {
    return `Local mode response for: ${prompt}`;
  }
}

// LLM Service - Main service class
class LLMService {
  private provider: LLMProvider;
  private isInitialized = false;
  
  constructor() {
    this.provider = this.createProvider();
  }
  
  private createProvider(): LLMProvider {
    if (!isLLMEnabled()) {
      return new LocalProvider();
    }
    
    switch (appConfig.llm.provider) {
      case 'chatgpt':
        return new ChatGPTProvider();
      case 'ollama':
        return new OllamaProvider();
      case 'gemini':
        return new GeminiProvider();
      default:
        return new LocalProvider();
    }
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    const isAvailable = await this.provider.isAvailable();
    if (!isAvailable) {
      LoggingService.warning(LogCategory.SYSTEM, 'LLM_PROVIDER_UNAVAILABLE', {
        provider: this.provider.name,
      });
      // Fallback to local provider
      this.provider = new LocalProvider();
    }
    
    LoggingService.info(LogCategory.SYSTEM, 'LLM_SERVICE_INITIALIZED', {
      provider: this.provider.name,
      isLocal: appConfig.isLocal,
    });
    
    this.isInitialized = true;
  }
  
  getProviderName(): string {
    return this.provider.name;
  }
  
  isRemoteProvider(): boolean {
    return !appConfig.isLocal && appConfig.llm.provider !== 'none';
  }
  
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    await this.initialize();
    
    try {
      const response = await this.provider.chat(messages);
      LoggingService.info(LogCategory.USER, 'LLM_CHAT_COMPLETE', {
        provider: this.provider.name,
        messageCount: messages.length,
        responseLength: response.content.length,
      });
      return response;
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'LLM_CHAT_ERROR', {
        provider: this.provider.name,
        error: String(error),
      });
      throw error;
    }
  }
  
  async complete(prompt: string): Promise<string> {
    await this.initialize();
    
    try {
      return await this.provider.complete(prompt);
    } catch (error) {
      LoggingService.error(LogCategory.SYSTEM, 'LLM_COMPLETE_ERROR', {
        provider: this.provider.name,
        error: String(error),
      });
      throw error;
    }
  }
  
  // Helper method for financial data analysis
  async analyzeFinancialData(data: {
    accounts: { name: string; balance: string; currency: string }[];
    transactions: { amount: number; date: string; description?: string }[];
  }): Promise<string> {
    const prompt = `Analyze the following financial data and provide insights:

Accounts:
${data.accounts.map(a => `- ${a.name}: ${a.balance} ${a.currency}`).join('\n')}

Recent Transactions:
${data.transactions.slice(0, 10).map(t => 
  `- ${new Date(t.date).toLocaleDateString()}: $${t.amount.toFixed(2)}${t.description ? ` - ${t.description}` : ''}`
).join('\n')}

Please provide:
1. A summary of the financial status
2. Spending patterns if visible
3. Recommendations for improvement`;

    return this.complete(prompt);
  }
}

// Export singleton instance
export const llmService = new LLMService();
export { isLLMEnabled };
export default llmService;
