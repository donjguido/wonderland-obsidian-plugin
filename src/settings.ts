import { App, PluginSettingTab, Setting, TextAreaComponent } from 'obsidian';
import type EvergreenAIPlugin from './main';
import { AIProvider, PROVIDER_DEFAULTS, TitleStyle, SuggestionFrequency } from './types';

export class EvergreenAISettingTab extends PluginSettingTab {
  plugin: EvergreenAIPlugin;

  constructor(app: App, plugin: EvergreenAIPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Header
    containerEl.createEl('h1', { text: 'Evergreen AI Settings' });

    // AI Provider Section
    containerEl.createEl('h2', { text: 'AI Configuration' });

    new Setting(containerEl)
      .setName('AI Provider')
      .setDesc('Select your AI provider')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            openai: 'OpenAI',
            anthropic: 'Anthropic (Claude)',
            ollama: 'Ollama (Local)',
            custom: 'Custom Endpoint',
          })
          .setValue(this.plugin.settings.aiProvider)
          .onChange(async (value: AIProvider) => {
            this.plugin.settings.aiProvider = value;
            // Set default model for provider
            const defaults = PROVIDER_DEFAULTS[value];
            if (defaults.models.length > 0) {
              this.plugin.settings.model = defaults.models[0];
            }
            if (defaults.endpoint) {
              this.plugin.settings.apiEndpoint = defaults.endpoint;
            }
            await this.plugin.saveSettings();
            this.display(); // Refresh to show provider-specific options
          })
      );

    // API Key (not for Ollama)
    if (this.plugin.settings.aiProvider !== 'ollama') {
      new Setting(containerEl)
        .setName('API Key')
        .setDesc('Your API key (stored locally, never sent anywhere except the AI provider)')
        .addText((text) =>
          text
            .setPlaceholder('sk-...')
            .setValue(this.plugin.settings.apiKey)
            .onChange(async (value) => {
              this.plugin.settings.apiKey = value;
              await this.plugin.saveSettings();
            })
        )
        .then((setting) => {
          // Make it a password field
          const inputEl = setting.controlEl.querySelector('input');
          if (inputEl) {
            inputEl.type = 'password';
          }
        });
    }

    // Custom endpoint
    if (this.plugin.settings.aiProvider === 'custom' || this.plugin.settings.aiProvider === 'ollama') {
      new Setting(containerEl)
        .setName('API Endpoint')
        .setDesc('The API endpoint URL')
        .addText((text) =>
          text
            .setPlaceholder('https://api.example.com/v1/chat/completions')
            .setValue(this.plugin.settings.apiEndpoint)
            .onChange(async (value) => {
              this.plugin.settings.apiEndpoint = value;
              await this.plugin.saveSettings();
            })
        );
    }

    // Model selection
    const providerModels = PROVIDER_DEFAULTS[this.plugin.settings.aiProvider].models;
    if (providerModels.length > 0) {
      new Setting(containerEl)
        .setName('Model')
        .setDesc('Select the AI model to use')
        .addDropdown((dropdown) => {
          const options: Record<string, string> = {};
          providerModels.forEach((model) => {
            options[model] = model;
          });
          return dropdown
            .addOptions(options)
            .setValue(this.plugin.settings.model)
            .onChange(async (value) => {
              this.plugin.settings.model = value;
              await this.plugin.saveSettings();
            });
        });
    } else {
      new Setting(containerEl)
        .setName('Model')
        .setDesc('Enter the model name')
        .addText((text) =>
          text
            .setPlaceholder('gpt-4')
            .setValue(this.plugin.settings.model)
            .onChange(async (value) => {
              this.plugin.settings.model = value;
              await this.plugin.saveSettings();
            })
        );
    }

    // Advanced AI settings
    new Setting(containerEl)
      .setName('Max Tokens')
      .setDesc('Maximum tokens in AI response (affects note length)')
      .addSlider((slider) =>
        slider
          .setLimits(500, 4000, 100)
          .setValue(this.plugin.settings.maxTokens)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxTokens = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Temperature')
      .setDesc('Controls randomness (0 = focused, 1 = creative)')
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.1)
          .setValue(this.plugin.settings.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.temperature = value;
            await this.plugin.saveSettings();
          })
      );

    // Note Generation Section
    containerEl.createEl('h2', { text: 'Note Generation' });

    new Setting(containerEl)
      .setName('Notes Folder')
      .setDesc('Where to save generated evergreen notes')
      .addText((text) =>
        text
          .setPlaceholder('Evergreen')
          .setValue(this.plugin.settings.noteFolder)
          .onChange(async (value) => {
            this.plugin.settings.noteFolder = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Title Style')
      .setDesc('How to format note titles')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            concept: 'Concept (statement form)',
            question: 'Question (interrogative)',
            statement: 'Statement (declarative)',
          })
          .setValue(this.plugin.settings.titleStyle)
          .onChange(async (value: TitleStyle) => {
            this.plugin.settings.titleStyle = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Include Metadata')
      .setDesc('Add YAML frontmatter with generation info')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeMetadata)
          .onChange(async (value) => {
            this.plugin.settings.includeMetadata = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto Backlinks')
      .setDesc('Automatically maintain a backlinks section in notes')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoBacklinks)
          .onChange(async (value) => {
            this.plugin.settings.autoBacklinks = value;
            await this.plugin.saveSettings();
          })
      );

    // Placeholder Links Section
    containerEl.createEl('h2', { text: 'Placeholder Links' });

    new Setting(containerEl)
      .setName('Max Placeholder Links')
      .setDesc('Maximum concept links to generate per note')
      .addSlider((slider) =>
        slider
          .setLimits(1, 15, 1)
          .setValue(this.plugin.settings.maxPlaceholderLinks)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxPlaceholderLinks = value;
            await this.plugin.saveSettings();
          })
      );

    // Organization Section
    containerEl.createEl('h2', { text: 'Organization Suggestions' });

    new Setting(containerEl)
      .setName('Enable Suggestions')
      .setDesc('Show AI-powered suggestions for organizing your notes')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableSuggestions)
          .onChange(async (value) => {
            this.plugin.settings.enableSuggestions = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Suggestion Frequency')
      .setDesc('How often to analyze and suggest organization improvements')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            always: 'On every note change',
            daily: 'Once per day',
            weekly: 'Once per week',
            manual: 'Manual only',
          })
          .setValue(this.plugin.settings.suggestionFrequency)
          .onChange(async (value: SuggestionFrequency) => {
            this.plugin.settings.suggestionFrequency = value;
            await this.plugin.saveSettings();
          })
      );

    // Test Connection Button
    containerEl.createEl('h2', { text: 'Connection Test' });

    new Setting(containerEl)
      .setName('Test AI Connection')
      .setDesc('Verify your API configuration is working')
      .addButton((button) =>
        button
          .setButtonText('Test Connection')
          .setCta()
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);
            try {
              await this.plugin.aiService.testConnection();
              button.setButtonText('Connected!');
              setTimeout(() => {
                button.setButtonText('Test Connection');
                button.setDisabled(false);
              }, 2000);
            } catch (error) {
              button.setButtonText('Failed - Check Settings');
              setTimeout(() => {
                button.setButtonText('Test Connection');
                button.setDisabled(false);
              }, 3000);
            }
          })
      );
  }
}
