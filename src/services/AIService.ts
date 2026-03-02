import { requestUrl, Platform } from 'obsidian';
import {
  EvergreenAISettings,
  AIStreamChunk,
  AIResponse,
  PROVIDER_DEFAULTS
} from '../types';

// Debug logging - only enabled in development
const DEBUG = false;
function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.debug('Wonderland AI -', ...args);
  }
}

// Error types for better error handling
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly retryable: boolean = false,
    public readonly retryAfter?: number // seconds
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export enum AIErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

export class AIService {
  private settings: EvergreenAISettings;
  private retryConfig: RetryConfig;

  constructor(settings: EvergreenAISettings, retryConfig?: Partial<RetryConfig>) {
    this.settings = settings;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
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
    // Check for Ollama on mobile (won't work - localhost isn't accessible)
    if (Platform.isMobile && this.settings.aiProvider === 'ollama') {
      throw new AIServiceError(
        'Ollama (local AI) is not supported on mobile devices. Please use OpenAI, Anthropic, or a cloud-based custom endpoint.',
        AIErrorCode.UNKNOWN,
        false
      );
    }

    return this.executeWithRetry(async () => {
      const { endpoint, headers, body } = this.buildRequest(prompt, systemPrompt, false);

      debugLog(' Making request to:', endpoint);
      debugLog(' Using model:', body.model);

      try {
        const response = await requestUrl({
          url: endpoint,
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        debugLog(' Response status:', response.status);

        if (response.status >= 400) {
          console.error('AIService: Error response:', response.json);
          throw this.parseErrorResponse(response.status, response.json);
        }

        return this.parseResponse(response.json);
      } catch (error) {
        // Handle network errors specifically
        if (this.isNetworkError(error)) {
          throw new AIServiceError(
            'Network error - please check your internet connection',
            AIErrorCode.NETWORK_ERROR,
            true
          );
        }

        // Re-throw AIServiceErrors as-is
        if (error instanceof AIServiceError) {
          throw error;
        }

        // Wrap unknown errors
        console.error('AIService: Request failed:', error);
        throw new AIServiceError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          AIErrorCode.UNKNOWN,
          false
        );
      }
    });
  }

  async generateStream(
    prompt: string,
    systemPrompt: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<void> {
    // On mobile, streaming is not well supported - fall back to non-streaming
    // Also check for Ollama on mobile (won't work - localhost isn't accessible)
    if (Platform.isMobile) {
      if (this.settings.aiProvider === 'ollama') {
        throw new AIServiceError(
          'Ollama (local AI) is not supported on mobile devices. Please use OpenAI, Anthropic, or a cloud-based custom endpoint.',
          AIErrorCode.UNKNOWN,
          false
        );
      }

      // Fall back to non-streaming on mobile for better compatibility
      const response = await this.generate(prompt, systemPrompt);
      onChunk(response.content);
      onComplete();
      return;
    }

    // Use requestUrl for streaming - Obsidian's API handles it
    const { endpoint, headers, body } = this.buildRequest(prompt, systemPrompt, true);

    try {
      const response = await requestUrl({
        url: endpoint,
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (response.status >= 400) {
        throw this.parseErrorResponse(response.status, response.json);
      }

      // requestUrl returns the full response - parse it as streamed chunks
      const text = typeof response.text === 'string' ? response.text : JSON.stringify(response.json);
      const lines = text.split('\n');

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

      // If we got here without a done signal, try to extract content from JSON response
      if (response.json) {
        const parsed = this.parseResponse(response.json);
        if (parsed.content) {
          onChunk(parsed.content);
        }
      }

      onComplete();
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      if (this.isNetworkError(error)) {
        throw new AIServiceError(
          'Network error - please check your internet connection',
          AIErrorCode.NETWORK_ERROR,
          true
        );
      }

      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown streaming error',
        AIErrorCode.UNKNOWN,
        false
      );
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AIServiceError) {
          // Don't retry non-retryable errors
          if (!error.retryable) {
            throw error;
          }

          // Check if we've exhausted retries
          if (attempt >= this.retryConfig.maxRetries) {
            throw error;
          }

          // Calculate delay with exponential backoff
          let delayMs = this.retryConfig.baseDelayMs * Math.pow(2, attempt);

          // Use retry-after header if available
          if (error.retryAfter) {
            delayMs = error.retryAfter * 1000;
          }

          // Cap the delay
          delayMs = Math.min(delayMs, this.retryConfig.maxDelayMs);

          debugLog(` Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} after ${delayMs}ms delay`);
          await this.delay(delayMs);
        } else {
          // Unknown error type, don't retry
          throw error;
        }
      }
    }

    throw lastError || new AIServiceError('Retry limit exceeded', AIErrorCode.UNKNOWN, false);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      const networkErrorMessages = [
        'fetch failed',
        'network',
        'Failed to fetch',
        'NetworkError',
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ECONNRESET',
        'ERR_NETWORK',
      ];

      return networkErrorMessages.some(msg =>
        error.message.toLowerCase().includes(msg.toLowerCase()) ||
        error.name.toLowerCase().includes(msg.toLowerCase())
      );
    }
    return false;
  }

  private parseErrorResponse(status: number, body: Record<string, unknown>): AIServiceError {
    // Extract error message from various provider formats
    let message = 'API request failed';
    let errorCode = AIErrorCode.UNKNOWN;
    let retryable = false;
    let retryAfter: number | undefined;

    // Try to extract error message from response body
    const errorObj = body.error as Record<string, unknown> | undefined;
    if (errorObj?.message) {
      message = String(errorObj.message);
    } else if (body.message) {
      message = String(body.message);
    } else if (body.detail) {
      message = String(body.detail);
    }

    // Parse based on status code
    switch (status) {
      case 400:
        // Bad request - could be context length
        if (message.toLowerCase().includes('context') ||
            message.toLowerCase().includes('token') ||
            message.toLowerCase().includes('length')) {
          errorCode = AIErrorCode.CONTEXT_LENGTH_EXCEEDED;
          message = 'Content too long - try with shorter text or break it into smaller parts';
        }
        break;

      case 401:
        errorCode = AIErrorCode.INVALID_API_KEY;
        message = 'Invalid API key - please check your API key in settings';
        break;

      case 403:
        errorCode = AIErrorCode.INVALID_API_KEY;
        message = 'Access denied - your API key may not have the required permissions';
        break;

      case 404:
        errorCode = AIErrorCode.MODEL_NOT_FOUND;
        message = 'Model not found - please check the model name in settings';
        break;

      case 429:
        errorCode = AIErrorCode.RATE_LIMIT;
        retryable = true;

        // Check for quota exceeded vs rate limit
        if (message.toLowerCase().includes('quota') ||
            message.toLowerCase().includes('billing') ||
            message.toLowerCase().includes('limit exceeded')) {
          errorCode = AIErrorCode.QUOTA_EXCEEDED;
          message = 'API quota exceeded - please check your billing/usage limits';
          retryable = false;
        } else {
          message = 'Rate limit reached - waiting and retrying...';

          // Try to extract retry-after
          const retryMatch = message.match(/try again in (\d+)/i);
          if (retryMatch) {
            retryAfter = parseInt(retryMatch[1], 10);
          } else {
            retryAfter = 60; // Default to 60 seconds for rate limits
          }
        }
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = AIErrorCode.SERVER_ERROR;
        retryable = true;
        message = `Server error (${String(status)}) - the AI service may be experiencing issues. Retrying...`;
        retryAfter = 5; // Short retry for server errors
        break;

      default:
        if (status >= 500) {
          errorCode = AIErrorCode.SERVER_ERROR;
          retryable = true;
        }
    }

    return new AIServiceError(message, errorCode, retryable, retryAfter);
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
      default: {
        const unknownProvider: string = provider;
        throw new AIServiceError(`Unknown provider: ${unknownProvider}`, AIErrorCode.UNKNOWN, false);
      }
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

  // Utility method to get user-friendly error message
  static getUserFriendlyError(error: unknown): string {
    if (error instanceof AIServiceError) {
      return error.message;
    }

    if (error instanceof Error) {
      // Clean up common error messages
      const message = error.message;

      if (message.includes('fetch failed') || message.includes('Failed to fetch')) {
        return 'Network error - please check your internet connection';
      }

      if (message.includes('timeout') || message.includes('Timeout')) {
        return 'Request timed out - try again or check your connection';
      }

      return message;
    }

    return 'An unexpected error occurred';
  }
}
