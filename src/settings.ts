import { App, PluginSettingTab, Setting, Platform } from 'obsidian';
import type EvergreenAIPlugin from './main';
import { AIProvider, PROVIDER_DEFAULTS, TitleStyle, FolderGoal, createFolderSettings } from './types';

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
    new Setting(containerEl).setName('Wonderland settings').setHeading();

    // Killswitch - prominent emergency stop
    const killswitchContainer = containerEl.createDiv({ cls: 'wonderland-killswitch' });
    killswitchContainer.style.cssText = `
      padding: 12px 16px;
      margin-bottom: 1.5em;
      border-radius: 8px;
      border: 2px solid ${this.plugin.settings.killswitchActive ? 'var(--text-error)' : 'var(--background-modifier-border)'};
      background: ${this.plugin.settings.killswitchActive ? 'var(--background-modifier-error)' : 'var(--background-secondary)'};
    `;

    new Setting(killswitchContainer)
      .setName('AI Killswitch')
      .setDesc(this.plugin.settings.killswitchActive
        ? 'All AI operations are STOPPED. Toggle off to resume.'
        : 'Emergency stop for all AI operations (cancels in-flight requests, stops all automation)')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.killswitchActive)
          .onChange(async () => {
            await this.plugin.toggleKillswitch();
            this.display();
          })
      );

    // AI Provider Section
    new Setting(containerEl).setName('AI configuration').setHeading();

    new Setting(containerEl)
      .setName('AI provider')
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
            const defaults = PROVIDER_DEFAULTS[value];
            if (defaults.models.length > 0) {
              this.plugin.settings.model = defaults.models[0];
            }
            if (defaults.endpoint) {
              this.plugin.settings.apiEndpoint = defaults.endpoint;
            }
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // Show warning for Ollama on mobile
    if (Platform.isMobile && this.plugin.settings.aiProvider === 'ollama') {
      const warningEl = containerEl.createDiv({ cls: 'wonderland-mobile-warning' });
      warningEl.createEl('strong', { text: 'Ollama not supported on mobile' });
      warningEl.createEl('p', {
        text: 'Ollama runs locally and cannot be accessed from mobile devices. Please use OpenAI, Anthropic, or a cloud-based custom endpoint instead.',
      });
    }

    // API Key (not for Ollama)
    if (this.plugin.settings.aiProvider !== 'ollama') {
      new Setting(containerEl)
        .setName('API key')
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
          const inputEl = setting.controlEl.querySelector('input');
          if (inputEl) {
            inputEl.type = 'password';
          }
        });
    }

    // Custom endpoint
    if (this.plugin.settings.aiProvider === 'custom' || this.plugin.settings.aiProvider === 'ollama') {
      new Setting(containerEl)
        .setName('API endpoint')
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
      .setName('Max tokens')
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

    // Test Connection Button
    new Setting(containerEl)
      .setName('Test AI connection')
      .setDesc('Verify your API configuration is working')
      .addButton((button) =>
        button
          .setButtonText('Test connection')
          .setCta()
          .onClick(async () => {
            button.setButtonText('Testing...');
            button.setDisabled(true);
            try {
              await this.plugin.aiService.testConnection();
              button.setButtonText('Connected!');
              setTimeout(() => {
                button.setButtonText('Test connection');
                button.setDisabled(false);
              }, 2000);
            } catch {
              button.setButtonText('Failed - check settings');
              setTimeout(() => {
                button.setButtonText('Test connection');
                button.setDisabled(false);
              }, 3000);
            }
          })
      );

    // ============================================
    // GLOBAL INSTRUCTIONS SECTION
    // ============================================
    new Setting(containerEl).setName('Global instructions').setHeading();

    containerEl.createEl('p', {
      text: 'Instructions that apply to all Wonderland folders. Folder-specific instructions will be applied after these.',
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName('Global instructions')
      .setDesc('These instructions will be applied to all notes generated in any Wonderland folder')
      .addTextArea((text) =>
        text
          .setPlaceholder('e.g., "Always use British English spelling" or "Include practical examples in every note"')
          .setValue(this.plugin.settings.globalInstructions || '')
          .onChange(async (value) => {
            this.plugin.settings.globalInstructions = value;
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        setting.settingEl.addClass('wonderland-settings-textarea');
      });

    // ============================================
    // WONDERLAND FOLDERS SECTION
    // ============================================
    new Setting(containerEl).setName('Wonderland folders').setHeading();

    containerEl.createEl('p', {
      text: 'Select existing folders or type a name to create new wonderlands of knowledge. Each folder can have its own settings.',
      cls: 'setting-item-description',
    });

    // List of configured folders
    this.renderConfiguredFolders(containerEl);

    // Add new folder picker
    this.renderFolderPicker(containerEl);

    // ============================================
    // SELECTED FOLDER SETTINGS
    // ============================================
    if (this.plugin.settings.wonderlandFolders.length > 0) {
      this.renderFolderSettings(containerEl);
    }
  }

  renderConfiguredFolders(containerEl: HTMLElement): void {
    const foldersContainer = containerEl.createDiv({ cls: 'wonderland-folders-list' });

    if (this.plugin.settings.wonderlandFolders.length === 0) {
      foldersContainer.createEl('p', {
        text: 'No Wonderland folders configured yet. Add one below.',
        cls: 'setting-item-description',
      });
      return;
    }

    for (let i = 0; i < this.plugin.settings.wonderlandFolders.length; i++) {
      const folder = this.plugin.settings.wonderlandFolders[i];
      const isSelected = i === this.plugin.settings.selectedFolderIndex;

      const folderItem = foldersContainer.createDiv({
        cls: `wonderland-folder-item${isSelected ? ' is-selected' : ''}`,
      });

      const folderInfo = folderItem.createDiv();
      folderInfo.createSpan({ text: ' ' });
      folderInfo.createSpan({ text: folder.path, cls: 'folder-name' });

      if (isSelected) {
        folderInfo.createSpan({ text: ' (editing)', cls: 'setting-item-description' });
      }

      // Click to select
      folderItem.addEventListener('click', async () => {
        this.plugin.settings.selectedFolderIndex = i;
        await this.plugin.saveSettings();
        this.display();
      });

      // Remove button
      const removeBtn = folderItem.createEl('button', { text: '\u00d7', cls: 'remove-btn' });
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        this.plugin.settings.wonderlandFolders.splice(i, 1);
        // Adjust selected index if needed
        if (this.plugin.settings.selectedFolderIndex >= this.plugin.settings.wonderlandFolders.length) {
          this.plugin.settings.selectedFolderIndex = Math.max(0, this.plugin.settings.wonderlandFolders.length - 1);
        }
        await this.plugin.saveSettings();
        this.display();
      });
    }
  }

  renderFolderPicker(containerEl: HTMLElement): void {
    // Get all folders in the vault
    const allFolders = this.plugin.getAllVaultFolders();

    // Filter out already configured folders
    const configuredPaths = this.plugin.settings.wonderlandFolders.map(f => f.path);
    const availableFolders = allFolders.filter(f => !configuredPaths.includes(f));

    // Dropdown for existing folders
    if (availableFolders.length > 0) {
      new Setting(containerEl)
        .setName('Add existing folder')
        .setDesc('Select an existing folder to become a Wonderland')
        .addDropdown((dropdown) => {
          dropdown.addOption('', '-- Select a folder --');
          for (const folder of availableFolders) {
            dropdown.addOption(folder, folder);
          }
          return dropdown.onChange(async (value) => {
            if (value) {
              // Add new folder with default settings
              const newFolderSettings = createFolderSettings(value);
              this.plugin.settings.wonderlandFolders.push(newFolderSettings);
              this.plugin.settings.selectedFolderIndex = this.plugin.settings.wonderlandFolders.length - 1;
              await this.plugin.saveSettings();
              this.display();
            }
          });
        });
    }

    // Text input for creating new folders by name
    let newFolderName = '';
    new Setting(containerEl)
      .setName('Create new Wonderland folder')
      .setDesc('Type a folder name to create a new Wonderland (will be created if it doesn\'t exist)')
      .addText((text) =>
        text
          .setPlaceholder('e.g., Research/AI or Personal Notes')
          .onChange((value) => {
            newFolderName = value.trim();
          })
      )
      .addButton((button) =>
        button
          .setButtonText('Create')
          .setCta()
          .onClick(async () => {
            if (!newFolderName) {
              return;
            }

            // Check if folder path is already configured
            if (configuredPaths.includes(newFolderName)) {
              return;
            }

            // Create folder if it doesn't exist
            try {
              await this.plugin.ensureFolderExists(newFolderName);
            } catch (err) {
              console.error('Failed to create folder:', err);
              return;
            }

            // Add new folder with default settings
            const newFolderSettings = createFolderSettings(newFolderName);
            this.plugin.settings.wonderlandFolders.push(newFolderSettings);
            this.plugin.settings.selectedFolderIndex = this.plugin.settings.wonderlandFolders.length - 1;
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }

  renderFolderSettings(containerEl: HTMLElement): void {
    const folderSettings = this.plugin.selectedFolderSettings;
    if (!folderSettings) return;

    new Setting(containerEl).setName(`Settings for: ${folderSettings.path}`).setHeading();

    // Folder Goal Section
    new Setting(containerEl).setName('Folder goal').setHeading();

    new Setting(containerEl)
      .setName('Content focus')
      .setDesc('How AI should approach generating content for this Wonderland')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            learn: 'Learning - Understanding and retention',
            action: 'Action-oriented - Practical steps and how-to guides',
            reflect: 'Critical reflection - Deep thinking and analysis',
            research: 'Research - Evidence-based with citations',
            creative: 'Creative - Imaginative connections',
            custom: 'Custom - Define your own focus',
          })
          .setValue(folderSettings.folderGoal || 'learn')
          .onChange(async (value: FolderGoal) => {
            folderSettings.folderGoal = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // Custom goal description (only shown when 'custom' is selected)
    if (folderSettings.folderGoal === 'custom') {
      new Setting(containerEl)
        .setName('Custom goal description')
        .setDesc('Describe the focus for this Wonderland')
        .addTextArea((text) =>
          text
            .setPlaceholder('e.g., "Focus on comparing different philosophical perspectives"')
            .setValue(folderSettings.customGoalDescription || '')
            .onChange(async (value) => {
              folderSettings.customGoalDescription = value;
              await this.plugin.saveSettings();
            })
        )
        .then((setting) => {
          setting.settingEl.addClass('wonderland-settings-textarea-short');
        });
    }

    // Custom Instructions
    new Setting(containerEl).setName('Custom instructions').setHeading();

    new Setting(containerEl)
      .setName('Custom instructions for this Wonderland')
      .setDesc('Special instructions for how notes should be generated (e.g., "Generate notes as step-by-step cooking guides" or "Write in a formal academic style")')
      .addTextArea((text) =>
        text
          .setPlaceholder('e.g., "Generate notes as step-by-step cooking guides with ingredients lists"')
          .setValue(folderSettings.customInstructions || '')
          .onChange(async (value) => {
            folderSettings.customInstructions = value;
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        setting.settingEl.addClass('wonderland-settings-textarea');
      });

    // External Links Section
    new Setting(containerEl).setName('External references').setHeading();

    new Setting(containerEl)
      .setName('Include external links')
      .setDesc('Add external reference links to reputable sources in generated notes')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.includeExternalLinks || false)
          .onChange(async (value) => {
            folderSettings.includeExternalLinks = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (folderSettings.includeExternalLinks) {
      new Setting(containerEl)
        .setName('Max external links')
        .setDesc('Maximum number of external reference links per note')
        .addSlider((slider) =>
          slider
            .setLimits(1, 10, 1)
            .setValue(folderSettings.maxExternalLinks || 3)
            .setDynamicTooltip()
            .onChange(async (value) => {
              folderSettings.maxExternalLinks = value;
              await this.plugin.saveSettings();
            })
        );
    }

    // Personalized Suggestions Section
    new Setting(containerEl).setName('Personalized suggestions').setHeading();

    new Setting(containerEl)
      .setName('Customize "Down the rabbit hole" suggestions')
      .setDesc('Base exploration suggestions on your interests')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.customizeSuggestions || false)
          .onChange(async (value) => {
            folderSettings.customizeSuggestions = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (folderSettings.customizeSuggestions) {
      new Setting(containerEl)
        .setName('Your interests')
        .setDesc('Comma-separated list of topics to personalize suggestions')
        .addText((text) =>
          text
            .setPlaceholder('e.g., philosophy, AI, cooking, music')
            .setValue(folderSettings.userInterests || '')
            .onChange(async (value) => {
              folderSettings.userInterests = value;
              await this.plugin.saveSettings();
            })
        )
        .then((setting) => {
          setting.settingEl.addClass('wonderland-settings-input');
        });
    }

    // Note Generation Settings
    new Setting(containerEl).setName('Note generation').setHeading();

    new Setting(containerEl)
      .setName('Title style')
      .setDesc('How to format note titles')
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            concept: 'Concept (statement form)',
            question: 'Question (interrogative)',
            statement: 'Statement (declarative)',
          })
          .setValue(folderSettings.titleStyle)
          .onChange(async (value: TitleStyle) => {
            folderSettings.titleStyle = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Include metadata')
      .setDesc('Add YAML frontmatter with generation info')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.includeMetadata)
          .onChange(async (value) => {
            folderSettings.includeMetadata = value;
            await this.plugin.saveSettings();
          })
      );

    // Placeholder Links Section
    new Setting(containerEl).setName('Placeholder links').setHeading();

    new Setting(containerEl)
      .setName('Max placeholder links')
      .setDesc('Maximum concept links to generate per note')
      .addSlider((slider) =>
        slider
          .setLimits(1, 15, 1)
          .setValue(folderSettings.maxPlaceholderLinks)
          .setDynamicTooltip()
          .onChange(async (value) => {
            folderSettings.maxPlaceholderLinks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto-generate on click')
      .setDesc('Automatically generate notes when clicking placeholder links')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.autoGeneratePlaceholders)
          .onChange(async (value) => {
            folderSettings.autoGeneratePlaceholders = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Auto-explore empty notes')
      .setDesc('Automatically generate content when opening an empty note from a link')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.autoGenerateEmptyNotes)
          .onChange(async (value) => {
            folderSettings.autoGenerateEmptyNotes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Include rabbit hole questions')
      .setDesc('Add clickable questions at the end of notes')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.includeFollowUpQuestions)
          .onChange(async (value) => {
            folderSettings.includeFollowUpQuestions = value;
            await this.plugin.saveSettings();
          })
      );

    // Auto-Organization Section
    new Setting(containerEl).setName('Auto-organization').setHeading();

    new Setting(containerEl)
      .setName('Auto-classify new notes')
      .setDesc('Automatically place new notes into appropriate subfolders')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.autoClassifyNewNotes)
          .onChange(async (value) => {
            folderSettings.autoClassifyNewNotes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable auto-organize')
      .setDesc('Allow AI to organize this folder into intuitive subfolders')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.autoOrganize)
          .onChange(async (value) => {
            folderSettings.autoOrganize = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (folderSettings.autoOrganize) {
      new Setting(containerEl)
        .setName('Organize on interval')
        .setDesc('Automatically organize periodically')
        .addToggle((toggle) =>
          toggle
            .setValue(folderSettings.organizeOnInterval)
            .onChange(async (value) => {
              folderSettings.organizeOnInterval = value;
              await this.plugin.saveSettings();
              this.display();
            })
        );

      if (folderSettings.organizeOnInterval) {
        new Setting(containerEl)
          .setName('Organization interval (minutes)')
          .setDesc('How often to auto-organize')
          .addSlider((slider) =>
            slider
              .setLimits(5, 120, 5)
              .setValue(folderSettings.organizeIntervalMinutes)
              .setDynamicTooltip()
              .onChange(async (value) => {
                folderSettings.organizeIntervalMinutes = value;
                await this.plugin.saveSettings();
              })
          );
      }

      new Setting(containerEl)
        .setName('Organize on note count')
        .setDesc('Reorganize after a certain number of new notes are added')
        .addToggle((toggle) =>
          toggle
            .setValue(folderSettings.organizeOnNoteCount)
            .onChange(async (value) => {
              folderSettings.organizeOnNoteCount = value;
              await this.plugin.saveSettings();
              this.display();
            })
        );

      if (folderSettings.organizeOnNoteCount) {
        new Setting(containerEl)
          .setName('Note count threshold')
          .setDesc(`Reorganize every X new notes (currently ${folderSettings.notesSinceLastOrganize || 0} since last organize)`)
          .addSlider((slider) =>
            slider
              .setLimits(3, 50, 1)
              .setValue(folderSettings.organizeNoteCountThreshold)
              .setDynamicTooltip()
              .onChange(async (value) => {
                folderSettings.organizeNoteCountThreshold = value;
                await this.plugin.saveSettings();
              })
          );
      }

      new Setting(containerEl)
        .setName('Organize now')
        .setDesc('Manually trigger organization')
        .addButton((button) =>
          button
            .setButtonText('Organize folder')
            .onClick(async () => {
              button.setButtonText('Organizing...');
              button.setDisabled(true);
              await this.plugin.organizeWonderlandFolder(folderSettings);
              button.setButtonText('Organize folder');
              button.setDisabled(false);
            })
        );
    }

    // Knowledge Enrichment Section
    new Setting(containerEl).setName('Knowledge enrichment').setHeading();

    new Setting(containerEl)
      .setName('Auto-update notes (time-based)')
      .setDesc('Periodically enrich notes with insights from related notes')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.autoUpdateNotes)
          .onChange(async (value) => {
            folderSettings.autoUpdateNotes = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (folderSettings.autoUpdateNotes) {
      new Setting(containerEl)
        .setName('Update mode')
        .setDesc('How to add new insights to notes')
        .addDropdown((dropdown) =>
          dropdown
            .addOptions({
              append: 'Append (add section at the end)',
              integrate: 'Integrate (weave into content)',
            })
            .setValue(folderSettings.autoUpdateMode)
            .onChange(async (value: 'append' | 'integrate') => {
              folderSettings.autoUpdateMode = value;
              await this.plugin.saveSettings();
            })
        );

      new Setting(containerEl)
        .setName('Update interval (minutes)')
        .setDesc('How often to check for and add new insights')
        .addSlider((slider) =>
          slider
            .setLimits(15, 240, 15)
            .setValue(folderSettings.autoUpdateIntervalMinutes)
            .setDynamicTooltip()
            .onChange(async (value) => {
              folderSettings.autoUpdateIntervalMinutes = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName('Enrich on note count')
      .setDesc('Automatically enrich notes after a certain number of new notes are created')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.enrichOnNoteCount || false)
          .onChange(async (value) => {
            folderSettings.enrichOnNoteCount = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (folderSettings.enrichOnNoteCount) {
      new Setting(containerEl)
        .setName('Enrich note count threshold')
        .setDesc(`Enrich after X new notes (currently ${folderSettings.notesSinceLastEnrich || 0} since last enrichment)`)
        .addSlider((slider) =>
          slider
            .setLimits(2, 20, 1)
            .setValue(folderSettings.enrichNoteCountThreshold || 5)
            .setDynamicTooltip()
            .onChange(async (value) => {
              folderSettings.enrichNoteCountThreshold = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName('Enrich all notes now')
      .setDesc('Manually trigger enrichment of all notes in this folder')
      .addButton((button) =>
        button
          .setButtonText('Enrich all notes')
          .onClick(async () => {
            button.setButtonText('Enriching...');
            button.setDisabled(true);
            await this.plugin.autoUpdateFolderNotes(folderSettings);
            button.setButtonText('Enrich all notes');
            button.setDisabled(false);
          })
      );

    // Blacklist management
    new Setting(containerEl).setName('Enrichment blacklist').setHeading();

    containerEl.createEl('p', {
      text: 'Notes on this list will be excluded from automatic enrichment. Use the "Toggle enrichment blacklist" command to add/remove notes.',
      cls: 'setting-item-description',
    });

    const blacklistCount = folderSettings.enrichBlacklist?.length || 0;
    if (blacklistCount > 0) {
      const blacklistContainer = containerEl.createDiv({ cls: 'wonderland-blacklist-container' });

      blacklistContainer.createEl('p', {
        text: `${blacklistCount} note${blacklistCount > 1 ? 's' : ''} blacklisted:`,
      });

      const blacklistList = blacklistContainer.createEl('ul');

      for (const notePath of folderSettings.enrichBlacklist) {
        const item = blacklistList.createEl('li');

        const noteBasename = notePath.split('/').pop()?.replace('.md', '') || notePath;
        item.createSpan({ text: noteBasename });

        const removeBtn = item.createEl('button', { text: '\u00d7', cls: 'remove-btn' });
        removeBtn.addEventListener('click', async () => {
          folderSettings.enrichBlacklist = folderSettings.enrichBlacklist.filter(p => p !== notePath);
          await this.plugin.saveSettings();
          this.display();
        });
      }

      new Setting(blacklistContainer)
        .setName('Clear blacklist')
        .addButton((button) =>
          button
            .setButtonText('Clear all')
            .onClick(async () => {
              folderSettings.enrichBlacklist = [];
              await this.plugin.saveSettings();
              this.display();
            })
        );
    } else {
      containerEl.createEl('p', {
        text: 'No notes are currently blacklisted. Open a note and use the "Toggle enrichment blacklist" command to add it.',
        cls: 'setting-item-description',
      });
    }

    // Rabbit Holes Index Section
    new Setting(containerEl).setName('Rabbit holes index').setHeading();

    containerEl.createEl('p', {
      text: 'The Rabbit Holes Index shows all unresolved links (unexplored paths) in this Wonderland.',
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName('Enable rabbit holes index')
      .setDesc('Create and maintain an index of all unresolved links')
      .addToggle((toggle) =>
        toggle
          .setValue(folderSettings.enableRabbitHolesIndex)
          .onChange(async (value) => {
            folderSettings.enableRabbitHolesIndex = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    if (folderSettings.enableRabbitHolesIndex) {
      new Setting(containerEl)
        .setName('Auto-update rabbit holes')
        .setDesc('Update the index each time a new note is generated')
        .addToggle((toggle) =>
          toggle
            .setValue(folderSettings.autoUpdateRabbitHolesIndex)
            .onChange(async (value) => {
              folderSettings.autoUpdateRabbitHolesIndex = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName('Generate rabbit holes index')
      .setDesc('Create or update the rabbit holes index')
      .addButton((button) =>
        button
          .setButtonText('Generate index')
          .onClick(async () => {
            button.setButtonText('Generating...');
            button.setDisabled(true);
            await this.plugin.generateRabbitHolesIndex(folderSettings);
            button.setButtonText('Generate index');
            button.setDisabled(false);
          })
      );
  }
}
