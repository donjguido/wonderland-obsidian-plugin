import { requestUrl, RequestUrlParam } from 'obsidian';
import {
  EvergreenAISettings,
  AIProvider,
  AIStreamChunk,
  AIResponse,
  PROVIDER_DEFAULTS
} from '../types';

export class AIService {
  private settings: EvergreenAISettings;

  constructor(settings: EvergreenAISettings) {
    this.settings = settings;
  }

  updateSettings(settings: EvergreenAISettings): void {
    this.settings = settings;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generate('Say "connected" and nothing else.', 'You are a helpful assistant.');
      return response.content.toLowerCase().includes('connected');
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  }

  async generate(prompt: string, systemPrompt: string): Promise<AIResponse> {
    const { endpoint, headers, body } = this.buildRequest(prompt, systemPrompt, false);

    console.log('Wonderland - Making request to:', endpoint);
    console.log('Wonderland - Using model:', body.model);

    try {
      const response = await requestUrl({
        url: endpoint,
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      console.log('Wonderland - Response status:', response.status);

      if (response.status >= 400) {
        console.error('Wonderland - Error response:', response.json);
        throw new Error(`API error ${response.status}: ${JSON.stringify(response.json)}`);
      }

      return this.parseResponse(response.json);
    } catch (error) {
      console.error('Wonderland - Request failed:', error);
      throw error;
    }
  }

  async generateStream(
    prompt: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<void> {
    const { endpoint, headers, body } = this.buildRequest(prompt, systemPrompt, true);

    // Use fetch for streaming (requestUrl doesn't support streaming)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const chunk = this.parseStreamChunk(line);
          if (chunk) {
            if (chunk.done) {
              onComplete();
              return;
            }
            if (chunk.content) {
              onChunk(chunk.content);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer) {
        const chunk = this.parseStreamChunk(buffer);
        if (chunk?.content) {
          onChunk(chunk.content);
        }
      }

      onComplete();
    } finally {
      reader.releaseLock();
    }
  }

  private buildRequest(
    prompt: string,
    systemPrompt: string,
    stream: boolean
  ): { endpoint: string; headers: Record<string, string>; body: Record<string, unknown> } {
    const provider = this.settings.aiProvider;

    switch (provider) {
      case 'openai':
        return this.buildOpenAIRequest(prompt, systemPrompt, stream);
      case 'anthropic':
        return this.buildAnthropicRequest(prompt, systemPrompt, stream);
      case 'ollama':
        return this.buildOllamaRequest(prompt, systemPrompt, stream);
      case 'custom':
        return this.buildCustomRequest(prompt, systemPrompt, stream);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private buildOpenAIRequest(
    prompt: string,
    systemPrompt: string,
    stream: boolean
  ): { endpoint: string; headers: Record<string, string>; body: Record<string, unknown> } {
    // Always use the correct OpenAI endpoint
    const endpoint = PROVIDER_DEFAULTS.openai.endpoint!;
    return {
      endpoint,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`,
      },
      body: {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        stream,
      },
    };
  }

  private buildAnthropicRequest(
    prompt: string,
    systemPrompt: string,
    stream: boolean
  ): { endpoint: string; headers: Record<string, string>; body: Record<string, unknown> } {
    // Always use the correct Anthropic endpoint
    const endpoint = PROVIDER_DEFAULTS.anthropic.endpoint!;
    return {
      endpoint,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: this.settings.model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        stream,
      },
    };
  }

  private buildOllamaRequest(
    prompt: string,
    systemPrompt: string,
    stream: boolean
  ): { endpoint: string; headers: Record<string, string>; body: Record<string, unknown> } {
    return {
      endpoint: this.settings.apiEndpoint || PROVIDER_DEFAULTS.ollama.endpoint!,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream,
        options: {
          temperature: this.settings.temperature,
          num_predict: this.settings.maxTokens,
        },
      },
    };
  }

  private buildCustomRequest(
    prompt: string,
    systemPrompt: string,
    stream: boolean
  ): { endpoint: string; headers: Record<string, string>; body: Record<string, unknown> } {
    // Default to OpenAI-compatible format for custom endpoints
    return {
      endpoint: this.settings.apiEndpoint,
      headers: {
        'Content-Type': 'application/json',
        ...(this.settings.apiKey ? { 'Authorization': `Bearer ${this.settings.apiKey}` } : {}),
      },
      body: {
        model: this.settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: this.settings.maxTokens,
        temperature: this.settings.temperature,
        stream,
      },
    };
  }

  private parseResponse(json: Record<string, unknown>): AIResponse {
    const provider = this.settings.aiProvider;

    switch (provider) {
      case 'anthropic': {
        const content = json.content as Array<{ type: string; text: string }>;
        return {
          content: content?.[0]?.text || '',
          model: json.model as string,
          usage: json.usage ? {
            promptTokens: (json.usage as Record<string, number>).input_tokens,
            completionTokens: (json.usage as Record<string, number>).output_tokens,
          } : undefined,
        };
      }
      case 'ollama': {
        const message = json.message as { content: string };
        return {
          content: message?.content || '',
          model: json.model as string,
        };
      }
      case 'openai':
      case 'custom':
      default: {
        const choices = json.choices as Array<{ message: { content: string } }>;
        return {
          content: choices?.[0]?.message?.content || '',
          model: json.model as string,
          usage: json.usage ? {
            promptTokens: (json.usage as Record<string, number>).prompt_tokens,
            completionTokens: (json.usage as Record<string, number>).completion_tokens,
          } : undefined,
        };
      }
    }
  }

  private parseStreamChunk(line: string): AIStreamChunk | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'data: [DONE]') {
      return trimmed === 'data: [DONE]' ? { content: '', done: true } : null;
    }

    const provider = this.settings.aiProvider;

    try {
      let data: Record<string, unknown>;

      if (trimmed.startsWith('data: ')) {
        data = JSON.parse(trimmed.slice(6));
      } else if (trimmed.startsWith('{')) {
        data = JSON.parse(trimmed);
      } else {
        return null;
      }

      switch (provider) {
        case 'anthropic': {
          // Anthropic uses different event types
          if (data.type === 'content_block_delta') {
            const delta = data.delta as { text?: string };
            return { content: delta?.text || '', done: false };
          }
          if (data.type === 'message_stop') {
            return { content: '', done: true };
          }
          return null;
        }
        case 'ollama': {
          const message = data.message as { content: string } | undefined;
          const done = data.done as boolean;
          return {
            content: message?.content || '',
            done: done || false,
          };
        }
        case 'openai':
        case 'custom':
        default: {
          const choices = data.choices as Array<{ delta?: { content?: string }; finish_reason?: string }>;
          if (!choices || choices.length === 0) return null;

          const choice = choices[0];
          if (choice.finish_reason === 'stop') {
            return { content: '', done: true };
          }

          return {
            content: choice.delta?.content || '',
            done: false,
          };
        }
      }
    } catch {
      // JSON parse error - skip this line
      return null;
    }
  }
}
