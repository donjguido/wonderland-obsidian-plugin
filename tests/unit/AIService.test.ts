/**
 * Unit tests for AIService
 * Tests API interactions, error handling, and provider-specific logic
 */

import { requestUrl, Platform } from 'obsidian';
import { AIService, AIServiceError, AIErrorCode } from '../../src/services/AIService';
import { DEFAULT_SETTINGS, EvergreenAISettings } from '../../src/types';

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Reset Platform to desktop by default
  (Platform as any).isMobile = false;
});

describe('AIService', () => {
  const createSettings = (overrides: Partial<EvergreenAISettings> = {}): EvergreenAISettings => ({
    ...DEFAULT_SETTINGS,
    apiKey: 'test-api-key',
    ...overrides,
  });

  describe('constructor', () => {
    it('should initialize with provided settings', () => {
      const settings = createSettings();
      const service = new AIService(settings);
      expect(service).toBeDefined();
    });

    it('should accept custom retry configuration', () => {
      const settings = createSettings();
      const service = new AIService(settings, { maxRetries: 5, baseDelayMs: 2000 });
      expect(service).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    it('should update internal settings', () => {
      const settings = createSettings();
      const service = new AIService(settings);

      const newSettings = createSettings({ model: 'gpt-4' });
      service.updateSettings(newSettings);

      // Can't directly test internal state, but method should not throw
      expect(() => service.updateSettings(newSettings)).not.toThrow();
    });
  });

  describe('generate', () => {
    it('should call requestUrl with correct OpenAI format', async () => {
      const settings = createSettings({
        aiProvider: 'openai',
        model: 'gpt-4o-mini',
      });
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          choices: [{ message: { content: 'Test response' } }],
          model: 'gpt-4o-mini',
        },
      });

      const result = await service.generate('Test prompt', 'Test system');

      expect(requestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result.content).toBe('Test response');
    });

    it('should call requestUrl with correct Anthropic format', async () => {
      const settings = createSettings({
        aiProvider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      });
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          content: [{ type: 'text', text: 'Anthropic response' }],
          model: 'claude-sonnet-4-20250514',
        },
      });

      const result = await service.generate('Test prompt', 'Test system');

      expect(requestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.anthropic.com/v1/messages',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );
      expect(result.content).toBe('Anthropic response');
    });

    it('should call requestUrl with correct Ollama format', async () => {
      const settings = createSettings({
        aiProvider: 'ollama',
        model: 'llama3.2',
        apiEndpoint: 'http://localhost:11434/api/chat',
      });
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          message: { content: 'Ollama response' },
          model: 'llama3.2',
        },
      });

      const result = await service.generate('Test prompt', 'Test system');

      expect(requestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:11434/api/chat',
        })
      );
      expect(result.content).toBe('Ollama response');
    });

    it('should throw error for Ollama on mobile', async () => {
      (Platform as any).isMobile = true;

      const settings = createSettings({
        aiProvider: 'ollama',
        model: 'llama3.2',
      });
      const service = new AIService(settings);

      await expect(service.generate('Test', 'System')).rejects.toThrow(AIServiceError);
      await expect(service.generate('Test', 'System')).rejects.toThrow(/not supported on mobile/);
    });

    it('should use custom endpoint for custom provider', async () => {
      const settings = createSettings({
        aiProvider: 'custom',
        model: 'custom-model',
        apiEndpoint: 'https://custom.api.com/v1/chat',
      });
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          choices: [{ message: { content: 'Custom response' } }],
          model: 'custom-model',
        },
      });

      const result = await service.generate('Test prompt', 'Test system');

      expect(requestUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://custom.api.com/v1/chat',
        })
      );
      expect(result.content).toBe('Custom response');
    });
  });

  describe('error handling', () => {
    it('should throw AIServiceError for 401 unauthorized', async () => {
      const settings = createSettings();
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 401,
        json: { error: { message: 'Invalid API key' } },
      });

      await expect(service.generate('Test', 'System')).rejects.toThrow(AIServiceError);

      try {
        await service.generate('Test', 'System');
      } catch (error) {
        expect((error as AIServiceError).code).toBe(AIErrorCode.INVALID_API_KEY);
      }
    });

    it('should throw AIServiceError for 404 model not found', async () => {
      const settings = createSettings();
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 404,
        json: { error: { message: 'Model not found' } },
      });

      try {
        await service.generate('Test', 'System');
      } catch (error) {
        expect((error as AIServiceError).code).toBe(AIErrorCode.MODEL_NOT_FOUND);
      }
    });

    it('should throw retryable error for 429 rate limit', async () => {
      const settings = createSettings();
      const service = new AIService(settings, { maxRetries: 0 });

      (requestUrl as jest.Mock).mockResolvedValue({
        status: 429,
        json: { error: { message: 'Too many requests, try again in 60 seconds' } },
      });

      try {
        await service.generate('Test', 'System');
      } catch (error) {
        expect((error as AIServiceError).code).toBe(AIErrorCode.RATE_LIMIT);
        expect((error as AIServiceError).retryable).toBe(true);
      }
    });

    it('should throw retryable error for 500 server error', async () => {
      const settings = createSettings();
      const service = new AIService(settings, { maxRetries: 0 });

      (requestUrl as jest.Mock).mockResolvedValue({
        status: 500,
        json: { error: { message: 'Internal server error' } },
      });

      try {
        await service.generate('Test', 'System');
      } catch (error) {
        expect((error as AIServiceError).code).toBe(AIErrorCode.SERVER_ERROR);
        expect((error as AIServiceError).retryable).toBe(true);
      }
    });

    it('should detect context length exceeded errors', async () => {
      const settings = createSettings();
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 400,
        json: { error: { message: 'context_length_exceeded: max tokens' } },
      });

      try {
        await service.generate('Test', 'System');
      } catch (error) {
        expect((error as AIServiceError).code).toBe(AIErrorCode.CONTEXT_LENGTH_EXCEEDED);
      }
    });
  });

  describe('getUserFriendlyError', () => {
    it('should return message from AIServiceError', () => {
      const error = new AIServiceError('Custom error message', AIErrorCode.UNKNOWN);
      expect(AIService.getUserFriendlyError(error)).toBe('Custom error message');
    });

    it('should clean up network errors', () => {
      const error = new Error('fetch failed');
      expect(AIService.getUserFriendlyError(error)).toContain('Network error');
    });

    it('should clean up timeout errors', () => {
      const error = new Error('Request timeout');
      expect(AIService.getUserFriendlyError(error)).toContain('timed out');
    });

    it('should handle non-Error objects', () => {
      expect(AIService.getUserFriendlyError('string error')).toBe('An unexpected error occurred');
      expect(AIService.getUserFriendlyError(null)).toBe('An unexpected error occurred');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      const settings = createSettings();
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          choices: [{ message: { content: 'connected' } }],
          model: 'gpt-4o-mini',
        },
      });

      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false if response does not contain "connected"', async () => {
      const settings = createSettings();
      const service = new AIService(settings);

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          choices: [{ message: { content: 'hello' } }],
          model: 'gpt-4o-mini',
        },
      });

      const result = await service.testConnection();
      expect(result).toBe(false);
    });

    it('should throw error for failed connection', async () => {
      const settings = createSettings();
      const service = new AIService(settings, { maxRetries: 0 });

      (requestUrl as jest.Mock).mockResolvedValueOnce({
        status: 401,
        json: { error: { message: 'Invalid API key' } },
      });

      await expect(service.testConnection()).rejects.toThrow();
    });
  });
});

describe('AIServiceError', () => {
  it('should create error with correct properties', () => {
    const error = new AIServiceError('Test message', AIErrorCode.RATE_LIMIT, true, 60);

    expect(error.message).toBe('Test message');
    expect(error.code).toBe(AIErrorCode.RATE_LIMIT);
    expect(error.retryable).toBe(true);
    expect(error.retryAfter).toBe(60);
    expect(error.name).toBe('AIServiceError');
  });

  it('should default retryable to false', () => {
    const error = new AIServiceError('Test', AIErrorCode.UNKNOWN);
    expect(error.retryable).toBe(false);
  });
});

describe('AIErrorCode', () => {
  it('should have all expected error codes', () => {
    expect(AIErrorCode.RATE_LIMIT).toBe('RATE_LIMIT');
    expect(AIErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(AIErrorCode.TIMEOUT).toBe('TIMEOUT');
    expect(AIErrorCode.INVALID_API_KEY).toBe('INVALID_API_KEY');
    expect(AIErrorCode.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
    expect(AIErrorCode.MODEL_NOT_FOUND).toBe('MODEL_NOT_FOUND');
    expect(AIErrorCode.CONTEXT_LENGTH_EXCEEDED).toBe('CONTEXT_LENGTH_EXCEEDED');
    expect(AIErrorCode.SERVER_ERROR).toBe('SERVER_ERROR');
    expect(AIErrorCode.UNKNOWN).toBe('UNKNOWN');
  });
});
