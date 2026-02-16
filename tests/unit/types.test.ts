/**
 * Unit tests for types.ts
 * Tests default settings, folder settings creation, and type definitions
 */

import {
  DEFAULT_SETTINGS,
  DEFAULT_FOLDER_SETTINGS,
  createFolderSettings,
  PROVIDER_DEFAULTS,
  AIProvider,
  FolderGoal,
  TitleStyle,
  WonderlandFolderSettings,
  EvergreenAISettings,
} from '../../src/types';

describe('DEFAULT_SETTINGS', () => {
  it('should have correct default AI provider settings', () => {
    expect(DEFAULT_SETTINGS.aiProvider).toBe('openai');
    expect(DEFAULT_SETTINGS.apiKey).toBe('');
    expect(DEFAULT_SETTINGS.apiEndpoint).toBe('');
    expect(DEFAULT_SETTINGS.model).toBe('gpt-4o-mini');
    expect(DEFAULT_SETTINGS.maxTokens).toBe(2000);
    expect(DEFAULT_SETTINGS.temperature).toBe(0.7);
  });

  it('should have empty global instructions by default', () => {
    expect(DEFAULT_SETTINGS.globalInstructions).toBe('');
  });

  it('should start with no Wonderland folders', () => {
    expect(DEFAULT_SETTINGS.wonderlandFolders).toEqual([]);
    expect(DEFAULT_SETTINGS.selectedFolderIndex).toBe(0);
  });

  it('should not have shown welcome by default', () => {
    expect(DEFAULT_SETTINGS.hasShownWelcome).toBe(false);
  });

  it('should have legacy fields for backwards compatibility', () => {
    expect(DEFAULT_SETTINGS.placeholderIndicator).toBe('✨');
    expect(DEFAULT_SETTINGS.enableSuggestions).toBe(true);
    expect(DEFAULT_SETTINGS.suggestionFrequency).toBe('daily');
  });
});

describe('DEFAULT_FOLDER_SETTINGS', () => {
  it('should have correct note generation defaults', () => {
    expect(DEFAULT_FOLDER_SETTINGS.titleStyle).toBe('concept');
    expect(DEFAULT_FOLDER_SETTINGS.includeMetadata).toBe(true);
    expect(DEFAULT_FOLDER_SETTINGS.maxPlaceholderLinks).toBe(7);
  });

  it('should have correct folder goal defaults', () => {
    expect(DEFAULT_FOLDER_SETTINGS.folderGoal).toBe('learn');
    expect(DEFAULT_FOLDER_SETTINGS.customGoalDescription).toBe('');
  });

  it('should have external links disabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.includeExternalLinks).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.maxExternalLinks).toBe(3);
  });

  it('should have auto-generation enabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.autoGeneratePlaceholders).toBe(true);
    expect(DEFAULT_FOLDER_SETTINGS.autoGenerateEmptyNotes).toBe(true);
    expect(DEFAULT_FOLDER_SETTINGS.includeFollowUpQuestions).toBe(true);
  });

  it('should have personalized suggestions disabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.customizeSuggestions).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.userInterests).toBe('');
  });

  it('should have organization disabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.autoOrganize).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.organizeOnInterval).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.organizeOnNoteCount).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.notesSinceLastOrganize).toBe(0);
    expect(DEFAULT_FOLDER_SETTINGS.autoClassifyNewNotes).toBe(true);
  });

  it('should have auto-update disabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.autoUpdateNotes).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.autoUpdateMode).toBe('append');
    expect(DEFAULT_FOLDER_SETTINGS.autoUpdateIntervalMinutes).toBe(60);
  });

  it('should have enrichment by note count disabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.enrichOnNoteCount).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.enrichNoteCountThreshold).toBe(5);
    expect(DEFAULT_FOLDER_SETTINGS.notesSinceLastEnrich).toBe(0);
  });

  it('should have empty enrichment blacklist by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.enrichBlacklist).toEqual([]);
  });

  it('should have rabbit holes index disabled by default', () => {
    expect(DEFAULT_FOLDER_SETTINGS.enableRabbitHolesIndex).toBe(false);
    expect(DEFAULT_FOLDER_SETTINGS.autoUpdateRabbitHolesIndex).toBe(false);
  });
});

describe('createFolderSettings', () => {
  it('should create folder settings with correct path', () => {
    const settings = createFolderSettings('Research/AI');
    expect(settings.path).toBe('Research/AI');
  });

  it('should spread default folder settings', () => {
    const settings = createFolderSettings('Notes');
    expect(settings.folderGoal).toBe(DEFAULT_FOLDER_SETTINGS.folderGoal);
    expect(settings.titleStyle).toBe(DEFAULT_FOLDER_SETTINGS.titleStyle);
    expect(settings.autoGeneratePlaceholders).toBe(DEFAULT_FOLDER_SETTINGS.autoGeneratePlaceholders);
  });

  it('should create independent settings objects', () => {
    const settings1 = createFolderSettings('Folder1');
    const settings2 = createFolderSettings('Folder2');

    settings1.customInstructions = 'Test instructions';

    expect(settings1.customInstructions).toBe('Test instructions');
    expect(settings2.customInstructions).toBe('');
  });

  it('should handle root-level folders', () => {
    const settings = createFolderSettings('MyFolder');
    expect(settings.path).toBe('MyFolder');
  });

  it('should handle nested folder paths', () => {
    const settings = createFolderSettings('Projects/2024/Research/AI');
    expect(settings.path).toBe('Projects/2024/Research/AI');
  });
});

describe('PROVIDER_DEFAULTS', () => {
  it('should have correct OpenAI defaults', () => {
    expect(PROVIDER_DEFAULTS.openai.endpoint).toBe('https://api.openai.com/v1/chat/completions');
    expect(PROVIDER_DEFAULTS.openai.models).toContain('gpt-4o');
    expect(PROVIDER_DEFAULTS.openai.models).toContain('gpt-4o-mini');
  });

  it('should have correct Anthropic defaults', () => {
    expect(PROVIDER_DEFAULTS.anthropic.endpoint).toBe('https://api.anthropic.com/v1/messages');
    expect(PROVIDER_DEFAULTS.anthropic.models).toContain('claude-sonnet-4-20250514');
  });

  it('should have correct Ollama defaults', () => {
    expect(PROVIDER_DEFAULTS.ollama.endpoint).toBe('http://localhost:11434/api/chat');
    expect(PROVIDER_DEFAULTS.ollama.models).toContain('llama3.2');
    expect(PROVIDER_DEFAULTS.ollama.models).toContain('mistral');
  });

  it('should have empty custom provider defaults', () => {
    expect(PROVIDER_DEFAULTS.custom.endpoint).toBe('');
    expect(PROVIDER_DEFAULTS.custom.models).toEqual([]);
  });
});

describe('Type definitions', () => {
  it('should allow valid AIProvider values', () => {
    const providers: AIProvider[] = ['openai', 'anthropic', 'ollama', 'custom'];
    providers.forEach(provider => {
      expect(['openai', 'anthropic', 'ollama', 'custom']).toContain(provider);
    });
  });

  it('should allow valid FolderGoal values', () => {
    const goals: FolderGoal[] = ['learn', 'action', 'reflect', 'research', 'creative', 'custom'];
    goals.forEach(goal => {
      expect(['learn', 'action', 'reflect', 'research', 'creative', 'custom']).toContain(goal);
    });
  });

  it('should allow valid TitleStyle values', () => {
    const styles: TitleStyle[] = ['concept', 'question', 'statement'];
    styles.forEach(style => {
      expect(['concept', 'question', 'statement']).toContain(style);
    });
  });
});

describe('WonderlandFolderSettings interface', () => {
  it('should be properly typed with required fields', () => {
    const settings: WonderlandFolderSettings = {
      path: 'TestFolder',
      customInstructions: '',
      folderGoal: 'learn',
      customGoalDescription: '',
      titleStyle: 'concept',
      includeMetadata: true,
      includeExternalLinks: false,
      maxExternalLinks: 3,
      maxPlaceholderLinks: 7,
      autoGeneratePlaceholders: true,
      autoGenerateEmptyNotes: true,
      includeFollowUpQuestions: true,
      customizeSuggestions: false,
      userInterests: '',
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
      enrichOnNoteCount: false,
      enrichNoteCountThreshold: 5,
      notesSinceLastEnrich: 0,
      enrichBlacklist: [],
      enableRabbitHolesIndex: false,
      autoUpdateRabbitHolesIndex: false,
    };

    expect(settings.path).toBe('TestFolder');
    expect(settings.folderGoal).toBe('learn');
  });
});

describe('EvergreenAISettings interface', () => {
  it('should match DEFAULT_SETTINGS structure', () => {
    const settings: EvergreenAISettings = { ...DEFAULT_SETTINGS };

    expect(settings).toHaveProperty('aiProvider');
    expect(settings).toHaveProperty('apiKey');
    expect(settings).toHaveProperty('model');
    expect(settings).toHaveProperty('wonderlandFolders');
    expect(settings).toHaveProperty('globalInstructions');
  });
});
