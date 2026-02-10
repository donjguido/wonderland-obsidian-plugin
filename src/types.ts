// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';
export type TitleStyle = 'concept' | 'question' | 'statement';
export type SuggestionFrequency = 'always' | 'daily' | 'weekly' | 'manual';

// Per-folder Wonderland settings
export interface WonderlandFolderSettings {
  path: string;  // The folder path (e.g., "Research", "Ideas/Projects")

  // Custom instructions for this Wonderland
  customInstructions: string;  // e.g., "Generate notes as step-by-step cooking guides"

  // Note Generation
  titleStyle: TitleStyle;
  includeMetadata: boolean;

  // Placeholder Settings
  maxPlaceholderLinks: number;
  autoGeneratePlaceholders: boolean;
  autoGenerateEmptyNotes: boolean;
  includeFollowUpQuestions: boolean;

  // Organization
  autoOrganize: boolean;
  organizeOnInterval: boolean;
  organizeIntervalMinutes: number;
  organizeOnNoteCount: boolean;  // Reorganize every X new notes
  organizeNoteCountThreshold: number;  // Number of new notes before reorganizing
  notesSinceLastOrganize: number;  // Counter for notes added since last organize
  autoClassifyNewNotes: boolean;

  // Auto-update
  autoUpdateNotes: boolean;
  autoUpdateMode: 'append' | 'integrate';
  autoUpdateIntervalMinutes: number;

  // Rabbit Holes Index - shows all unresolved links
  enableRabbitHolesIndex: boolean;  // Auto-generate rabbit holes index
  autoUpdateRabbitHolesIndex: boolean;  // Update index on each new note
}

// Default settings for a new Wonderland folder
export const DEFAULT_FOLDER_SETTINGS: Omit<WonderlandFolderSettings, 'path'> = {
  customInstructions: '',

  titleStyle: 'concept',
  includeMetadata: true,

  maxPlaceholderLinks: 7,
  autoGeneratePlaceholders: true,
  autoGenerateEmptyNotes: true,
  includeFollowUpQuestions: true,

  autoOrganize: false,
  organizeOnInterval: false,
  organizeIntervalMinutes: 30,
  organizeOnNoteCount: false,
  organizeNoteCountThreshold: 10,
  notesSinceLastOrganize: 0,
  autoClassifyNewNotes: true,

  autoUpdateNotes: false,
  autoUpdateMode: 'append',
  autoUpdateIntervalMinutes: 60,

  enableRabbitHolesIndex: false,
  autoUpdateRabbitHolesIndex: false,
};

// Plugin settings (global + per-folder)
export interface EvergreenAISettings {
  // AI Configuration (global)
  aiProvider: AIProvider;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;

  // Wonderland folders with their individual settings
  wonderlandFolders: WonderlandFolderSettings[];

  // Currently selected folder in settings UI
  selectedFolderIndex: number;

  // Legacy fields (for backwards compatibility)
  placeholderIndicator: string;
  enableSuggestions: boolean;
  suggestionFrequency: SuggestionFrequency;
}

export const DEFAULT_SETTINGS: EvergreenAISettings = {
  aiProvider: 'openai',
  apiKey: '',
  apiEndpoint: '',
  model: 'gpt-4o-mini',
  maxTokens: 2000,
  temperature: 0.7,

  wonderlandFolders: [],  // Start empty, user picks existing folders
  selectedFolderIndex: 0,

  placeholderIndicator: '✨',
  enableSuggestions: true,
  suggestionFrequency: 'daily',
};

// Helper to create a new folder settings object
export function createFolderSettings(path: string): WonderlandFolderSettings {
  return {
    path,
    ...DEFAULT_FOLDER_SETTINGS,
  };
}

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
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
  },
  ollama: {
    endpoint: 'http://localhost:11434/api/chat',
    models: ['llama3.2', 'llama3.1', 'mistral', 'mixtral', 'codellama'],
  },
  custom: {
    endpoint: '',
    models: [],
  },
};
