// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';
export type TitleStyle = 'concept' | 'question' | 'statement';
export type SuggestionFrequency = 'always' | 'daily' | 'weekly' | 'manual';

// Plugin settings
export interface EvergreenAISettings {
  // AI Configuration
  aiProvider: AIProvider;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;

  // Note Generation
  noteFolder: string;
  titleStyle: TitleStyle;
  includeMetadata: boolean;
  autoBacklinks: boolean;

  // Placeholder Settings
  maxPlaceholderLinks: number;
  placeholderIndicator: string;

  // Organization
  enableSuggestions: boolean;
  suggestionFrequency: SuggestionFrequency;
}

export const DEFAULT_SETTINGS: EvergreenAISettings = {
  aiProvider: 'openai',
  apiKey: '',
  apiEndpoint: '',
  model: 'gpt-4-turbo-preview',
  maxTokens: 2000,
  temperature: 0.7,

  noteFolder: 'Evergreen',
  titleStyle: 'concept',
  includeMetadata: true,
  autoBacklinks: true,

  maxPlaceholderLinks: 7,
  placeholderIndicator: '✨',

  enableSuggestions: true,
  suggestionFrequency: 'daily',
};

// Note types
export interface EvergreenNote {
  title: string;
  content: string;
  placeholderLinks: PlaceholderLink[];
  backlinks: string[];
  metadata: NoteMetadata;
}

export interface PlaceholderLink {
  concept: string;
  context: string;
  sourceNote: string;
  generated: boolean;
}

export interface NoteMetadata {
  created: Date;
  source: 'prompt' | 'placeholder' | 'manual';
  prompt?: string;
  parentNote?: string;
  aiModel: string;
  tags: string[];
}

export interface GenerationContext {
  userPrompt?: string;
  placeholderConcept?: string;
  sourceNoteContent?: string;
  relatedNotes: string[];
  existingLinks: string[];
}

// Knowledge Graph types
export interface KnowledgeGraphNode {
  path: string;
  title: string;
  links: string[];
  backlinks: string[];
  embedding?: number[];
  lastModified: Date;
}

export interface OrganizationSuggestion {
  type: 'merge' | 'split' | 'link' | 'reorganize' | 'hub';
  notes: string[];
  reason: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

// AI Response types
export interface AIStreamChunk {
  content: string;
  done: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// Provider-specific configurations
export interface ProviderConfig {
  endpoint: string;
  headers: Record<string, string>;
  modelParam: string;
}

export const PROVIDER_DEFAULTS: Record<AIProvider, Partial<ProviderConfig> & { models: string[] }> = {
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  },
  ollama: {
    endpoint: 'http://localhost:11434/api/chat',
    models: ['llama2', 'mistral', 'mixtral', 'codellama'],
  },
  custom: {
    endpoint: '',
    models: [],
  },
};
