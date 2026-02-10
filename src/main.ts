import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  TFile,
  TFolder,
  Setting,
} from 'obsidian';
import { EvergreenAISettings, DEFAULT_SETTINGS, WonderlandFolderSettings, createFolderSettings } from './types';
import { EvergreenAISettingTab } from './settings';
import { AIService, AIServiceError } from './services/AIService';
import {
  EVERGREEN_NOTE_SYSTEM_PROMPT,
  EVERGREEN_NOTE_USER_PROMPT,
  TITLE_GENERATION_PROMPT,
  RABBIT_HOLE_QUESTIONS_PROMPT,
  ORGANIZE_FOLDER_PROMPT,
  UPDATE_NOTE_APPEND_PROMPT,
  UPDATE_NOTE_INTEGRATE_PROMPT,
  CLASSIFY_NOTE_PROMPT,
  RABBIT_HOLES_INDEX_PROMPT,
  CUSTOM_INSTRUCTIONS_WRAPPER,
  FOLDER_GOAL_WRAPPER,
  EXTERNAL_LINKS_PROMPT,
  PERSONALIZED_SUGGESTIONS_PROMPT,
} from './prompts/evergreenNote';
import { FolderGoal } from './types';
import {
  PLACEHOLDER_NOTE_SYSTEM_PROMPT,
  PLACEHOLDER_NOTE_USER_PROMPT,
} from './prompts/placeholderNote';

export default class EvergreenAIPlugin extends Plugin {
  settings: EvergreenAISettings;
  aiService: AIService;
  // Track notes created from clicking unresolved links: maps new file path -> source Wonderland folder path
  private pendingGenerations: Map<string, string> = new Map();
  // Track the last active Wonderland folder (for when files are created from link clicks)
  private lastActiveWonderlandFolder: string | null = null;
  // Intervals for auto-organization (per folder)
  private organizeIntervals: Map<string, number> = new Map();
  // Intervals for auto-update (per folder)
  private autoUpdateIntervals: Map<string, number> = new Map();

  // ============================================
  // FOLDER DETECTION & SETTINGS HELPERS
  // ============================================

  // Get all configured Wonderland folder paths
  get wonderlandPaths(): string[] {
    return this.settings.wonderlandFolders.map(f => f.path);
  }

  // Check if a file path is within any Wonderland folder
  isInWonderland(filePath: string): boolean {
    return this.settings.wonderlandFolders.some(folder =>
      filePath === folder.path ||
      filePath.startsWith(folder.path + '/')
    );
  }

  // Get the Wonderland folder settings for a given file path
  getWonderlandSettingsFor(filePath: string): WonderlandFolderSettings | null {
    return this.settings.wonderlandFolders.find(folder =>
      filePath === folder.path ||
      filePath.startsWith(folder.path + '/')
    ) || null;
  }

  // Get the Wonderland folder path that contains a file
  getWonderlandFolderFor(filePath: string): string | null {
    const settings = this.getWonderlandSettingsFor(filePath);
    return settings?.path || null;
  }

  // Get the currently selected folder settings (for settings UI)
  get selectedFolderSettings(): WonderlandFolderSettings | null {
    const index = this.settings.selectedFolderIndex;
    return this.settings.wonderlandFolders[index] || null;
  }

  // Check if a filename is "Untitled" or equivalent (should not auto-generate)
  isUntitledNote(filename: string): boolean {
    const untitledPatterns = [
      /^untitled$/i,
      /^untitled \d+$/i,
      /^new note$/i,
      /^new note \d+$/i,
      /^note$/i,
      /^note \d+$/i,
    ];
    const baseName = filename.replace(/\.md$/, '');
    return untitledPatterns.some(pattern => pattern.test(baseName));
  }

  // Get the rabbit holes index name for a folder
  getRabbitHolesIndexName(folderPath: string): string {
    const folderName = folderPath.split('/').pop() || 'Wonderland';
    return `${folderName} Rabbit Holes`;
  }

  // Handle folder renames - update Wonderland folder paths in settings
  async handleFolderRename(oldPath: string, newPath: string): Promise<void> {
    let updated = false;

    for (const folder of this.settings.wonderlandFolders) {
      if (folder.path === oldPath) {
        console.log(`Wonderland - Folder renamed from ${oldPath} to ${newPath}`);
        folder.path = newPath;
        updated = true;
      }
    }

    if (updated) {
      await this.saveSettings();
      new Notice(`Wonderland folder path updated: ${newPath}`);
    }
  }

  // Get the current folder path from the active file
  getCurrentFolderPath(): string | null {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return null;

    const parent = activeFile.parent;
    return parent?.path || null;
  }

  async onload() {
    await this.loadSettings();

    this.aiService = new AIService(this.settings);

    // Add ribbon icon (rabbit for wonderland theme)
    this.addRibbonIcon('rabbit', 'Enter Wonderland', () => {
      this.openPromptModal();
    });

    // Add command to generate note from prompt
    this.addCommand({
      id: 'enter-wonderland',
      name: 'Enter Wonderland - explore a topic',
      callback: () => {
        this.openPromptModal();
      },
    });

    // Add command to generate from selection
    this.addCommand({
      id: 'explore-selection',
      name: 'Go down the rabbit hole with selection',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.generateNoteFromPrompt(selection);
        } else {
          new Notice('Please select some text first');
        }
      },
    });

    // Add command to generate content for current note using its title
    this.addCommand({
      id: 'explore-current-note',
      name: 'Explore this note (generate content from title)',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active note');
          return;
        }

        // Check if file is in a Wonderland folder
        const folderSettings = this.getWonderlandSettingsFor(activeFile.path);
        if (!folderSettings) {
          new Notice('This note is not in a Wonderland folder');
          return;
        }

        await this.generateContentForNote(activeFile, folderSettings);
      },
    });

    // Add command to update current note with knowledge from Wonderland
    this.addCommand({
      id: 'enrich-note',
      name: 'Enrich note with Wonderland knowledge',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active note');
          return;
        }

        // Check if file is in a Wonderland folder
        const folderSettings = this.getWonderlandSettingsFor(activeFile.path);
        if (!folderSettings) {
          new Notice('This note is not in a Wonderland folder');
          return;
        }

        await this.enrichNoteWithKnowledge(activeFile, folderSettings);
      },
    });

    // Add command to organize current Wonderland folder
    this.addCommand({
      id: 'organize-wonderland',
      name: 'Organize current Wonderland into subfolders',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active note - open a note in a Wonderland folder first');
          return;
        }

        const folderSettings = this.getWonderlandSettingsFor(activeFile.path);
        if (!folderSettings) {
          new Notice('This note is not in a Wonderland folder');
          return;
        }

        await this.organizeWonderlandFolder(folderSettings);
      },
    });

    // Add command to generate/update rabbit holes index
    this.addCommand({
      id: 'generate-rabbit-holes',
      name: 'Generate Rabbit Holes index (show unresolved links)',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active note - open a note in a Wonderland folder first');
          return;
        }

        const folderSettings = this.getWonderlandSettingsFor(activeFile.path);
        if (!folderSettings) {
          new Notice('This note is not in a Wonderland folder');
          return;
        }

        await this.generateRabbitHolesIndex(folderSettings);
      },
    });

    // Register click handler for placeholder links (legacy, kept for reading mode)
    this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
      await this.handleLinkClick(evt);
    }, { capture: true });

    // Track which Wonderland folder is active when user interacts
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          const wonderlandFolder = this.getWonderlandFolderFor(activeFile.path);
          if (wonderlandFolder) {
            this.lastActiveWonderlandFolder = wonderlandFolder;
            console.log('Wonderland - Active folder tracked:', wonderlandFolder);
          }
        }
      })
    );

    // Register handler for file creation - track files created from link clicks
    // These may be created OUTSIDE the Wonderland folder by Obsidian's default behavior
    this.registerEvent(
      this.app.vault.on('create', async (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          // Check if there's a last active Wonderland folder to associate this with
          const sourceFolder = this.lastActiveWonderlandFolder;

          try {
            const content = await this.app.vault.read(file);
            if (content.trim() === '' && sourceFolder) {
              console.log('Wonderland - New empty file created:', file.path, 'from Wonderland:', sourceFolder);
              // Track this file with its source Wonderland folder
              this.pendingGenerations.set(file.path, sourceFolder);
            }
          } catch (e) {
            setTimeout(async () => {
              try {
                const content = await this.app.vault.read(file);
                if (content.trim() === '' && sourceFolder) {
                  console.log('Wonderland - New empty file created (delayed):', file.path, 'from Wonderland:', sourceFolder);
                  this.pendingGenerations.set(file.path, sourceFolder);
                }
              } catch (e2) {
                // File might have been deleted or moved
              }
            }, 50);
          }
        }
      })
    );

    // Register handler for when files are opened - detect empty notes
    this.registerEvent(
      this.app.workspace.on('file-open', async (file) => {
        if (file) {
          setTimeout(async () => {
            await this.handleFileOpen(file);
          }, 150);
        }
      })
    );

    // Register handler for folder renames - update Wonderland folder paths in settings
    this.registerEvent(
      this.app.vault.on('rename', async (file, oldPath) => {
        // Check if a Wonderland folder was renamed
        if (file instanceof TFolder) {
          await this.handleFolderRename(oldPath, file.path);
        }
        // Also handle if a parent folder of a Wonderland was renamed
        for (const folder of this.settings.wonderlandFolders) {
          if (folder.path.startsWith(oldPath + '/')) {
            const newFolderPath = folder.path.replace(oldPath, file.path);
            console.log(`Wonderland - Parent folder renamed, updating ${folder.path} to ${newFolderPath}`);
            folder.path = newFolderPath;
            await this.saveSettings();
          }
        }
      })
    );

    // Add settings tab
    this.addSettingTab(new EvergreenAISettingTab(this.app, this));

    // Set up intervals for all folders
    this.setupAllIntervals();

    // Show welcome modal for first-time users
    if (!this.settings.hasShownWelcome) {
      // Small delay to ensure the workspace is ready
      setTimeout(() => {
        new WelcomeModal(this.app, this, async () => {
          this.settings.hasShownWelcome = true;
          await this.saveSettings();
        }).open();
      }, 500);
    }

    console.log('Wonderland plugin loaded - ready to explore');
  }

  onunload() {
    // Clear all organization intervals
    for (const interval of this.organizeIntervals.values()) {
      window.clearInterval(interval);
    }
    // Clear all auto-update intervals
    for (const interval of this.autoUpdateIntervals.values()) {
      window.clearInterval(interval);
    }
    console.log('Wonderland plugin unloaded');
  }

  // Set up intervals for all configured folders
  setupAllIntervals(): void {
    // Clear existing intervals
    for (const interval of this.organizeIntervals.values()) {
      window.clearInterval(interval);
    }
    for (const interval of this.autoUpdateIntervals.values()) {
      window.clearInterval(interval);
    }
    this.organizeIntervals.clear();
    this.autoUpdateIntervals.clear();

    // Set up intervals for each folder
    for (const folder of this.settings.wonderlandFolders) {
      this.setupFolderIntervals(folder);
    }
  }

  setupFolderIntervals(folder: WonderlandFolderSettings): void {
    // Organization interval
    if (folder.organizeOnInterval && folder.autoOrganize) {
      const intervalMs = folder.organizeIntervalMinutes * 60 * 1000;
      const intervalId = window.setInterval(async () => {
        console.log(`Wonderland - Running scheduled organization for ${folder.path}`);
        await this.organizeWonderlandFolder(folder, true);
      }, intervalMs);
      this.organizeIntervals.set(folder.path, intervalId);
      console.log(`Wonderland - Auto-organize scheduled every ${folder.organizeIntervalMinutes} minutes for ${folder.path}`);
    }

    // Auto-update interval
    if (folder.autoUpdateNotes) {
      const intervalMs = folder.autoUpdateIntervalMinutes * 60 * 1000;
      const intervalId = window.setInterval(async () => {
        console.log(`Wonderland - Running scheduled auto-update for ${folder.path}`);
        await this.autoUpdateFolderNotes(folder, true);
      }, intervalMs);
      this.autoUpdateIntervals.set(folder.path, intervalId);
      console.log(`Wonderland - Auto-update scheduled every ${folder.autoUpdateIntervalMinutes} minutes for ${folder.path}`);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.aiService?.updateSettings(this.settings);
    this.setupAllIntervals();
  }

  openPromptModal() {
    // If no Wonderland folders configured, show a notice
    if (this.settings.wonderlandFolders.length === 0) {
      new Notice('Please add a Wonderland folder in settings first');
      return;
    }

    new PromptModal(this.app, this, async (prompt, folderPath) => {
      await this.generateNoteFromPrompt(prompt, folderPath);
    }).open();
  }

  async generateNoteFromPrompt(prompt: string, targetFolderPath?: string): Promise<void> {
    if (!this.validateSettings()) return;

    // If no target folder specified, use the first Wonderland folder
    const folderSettings = targetFolderPath
      ? this.settings.wonderlandFolders.find(f => f.path === targetFolderPath)
      : this.settings.wonderlandFolders[0];

    if (!folderSettings) {
      new Notice('No Wonderland folder configured');
      return;
    }

    const notice = new Notice('Entering wonderland...', 0);

    try {
      // Get existing notes for context
      const existingNotes = this.getExistingNoteTitles(folderSettings.path);

      // Build the system prompt with folder goal
      let systemPrompt = EVERGREEN_NOTE_SYSTEM_PROMPT;

      // Apply folder goal context
      if (folderSettings.folderGoal) {
        systemPrompt = FOLDER_GOAL_WRAPPER(
          folderSettings.folderGoal,
          folderSettings.customGoalDescription || '',
          systemPrompt
        );
      }

      // Apply custom instructions
      if (folderSettings.customInstructions) {
        systemPrompt = CUSTOM_INSTRUCTIONS_WRAPPER(folderSettings.customInstructions, systemPrompt);
      }

      // Add external links instruction if enabled
      if (folderSettings.includeExternalLinks) {
        systemPrompt += EXTERNAL_LINKS_PROMPT(folderSettings.maxExternalLinks || 3);
      }

      // Generate the note content
      const userPrompt = EVERGREEN_NOTE_USER_PROMPT(prompt, '', existingNotes);
      const response = await this.aiService.generate(userPrompt, systemPrompt);
      const content = response.content;

      // Generate title
      const title = await this.generateTitle(content);

      // Format and save the note
      const filePath = await this.saveNote(title, '', folderSettings); // Save first to get path
      const formattedContent = await this.formatNote(content, folderSettings, prompt, undefined, true, filePath);

      // Update with formatted content
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await this.app.vault.modify(file, formattedContent);
      }

      notice.hide();
      new Notice(`Created: ${title}`);

      // Open the new note
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    } catch (error) {
      notice.hide();
      console.error('Error generating note:', error);
      new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
    }
  }

  async handleLinkClick(evt: MouseEvent): Promise<void> {
    const target = evt.target as HTMLElement;

    console.log('Wonderland - Click detected on:', target.tagName, target.className);

    let linkText: string | null = null;

    // Method 1: Reading/Preview mode - look for .internal-link
    let linkElement: HTMLElement | null = target.closest('.internal-link') as HTMLElement;
    if (linkElement) {
      linkText = linkElement.getAttribute('data-href');
      console.log('Wonderland - Found internal-link, href:', linkText);
    }

    // Method 2: Editor/Source mode - look for CodeMirror wiki-link structure
    // The cm-underline class is used for unresolved links
    if (!linkText) {
      const cmLink = target.closest('.cm-hmd-internal-link, .cm-link, .cm-underline');
      if (cmLink) {
        const lineEl = target.closest('.cm-line');
        if (lineEl) {
          const lineText = lineEl.textContent || '';
          console.log('Wonderland - Line text:', lineText);

          // Extract all [[links]] from the line
          const linkMatches = lineText.match(/\[\[([^\]]+)\]\]/g);
          console.log('Wonderland - Link matches:', linkMatches);

          if (linkMatches && linkMatches.length > 0) {
            // Get the text content of the clicked element and its parent spans
            let clickedText = target.textContent || '';

            // For cm-underline, walk up to find the full link text
            // The link might be split across multiple spans
            let parent = target.parentElement;
            while (parent && parent.classList.contains('cm-line') === false) {
              if (parent.classList.contains('cm-hmd-internal-link') ||
                  parent.textContent?.includes('[[')) {
                // Try to get text from siblings too
                const siblings = parent.parentElement?.children;
                if (siblings) {
                  let fullText = '';
                  for (let i = 0; i < siblings.length; i++) {
                    fullText += siblings[i].textContent || '';
                  }
                  if (fullText.includes('[[') && fullText.includes(']]')) {
                    const match = fullText.match(/\[\[([^\]]+)\]\]/);
                    if (match) {
                      clickedText = match[1].split('|')[0];
                      break;
                    }
                  }
                }
              }
              parent = parent.parentElement;
            }

            console.log('Wonderland - Clicked text:', clickedText);

            // Try to match clicked text to one of the links
            for (const match of linkMatches) {
              const innerText = match.slice(2, -2); // Remove [[ and ]]
              const linkName = innerText.split('|')[0]; // Handle [[link|display]] format

              if (linkName === clickedText ||
                  innerText === clickedText ||
                  linkName.includes(clickedText) ||
                  clickedText.includes(linkName) ||
                  innerText.includes(clickedText)) {
                linkText = linkName;
                console.log('Wonderland - Matched link:', linkText);
                break;
              }
            }

            // Fallback: if only one link on the line, use it
            if (!linkText && linkMatches.length === 1) {
              linkText = linkMatches[0].slice(2, -2).split('|')[0];
              console.log('Wonderland - Using single link on line:', linkText);
            }
          }
        }
      }
    }

    if (!linkText) {
      console.log('Wonderland - Could not find link text, ignoring');
      return;
    }

    // Check if the linked note exists
    const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, '');
    console.log('Wonderland - Linked file exists:', !!linkedFile);
    if (linkedFile) return;

    // Get the current file to check if it's in a Wonderland folder
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const folderSettings = this.getWonderlandSettingsFor(activeFile.path);
    if (!folderSettings) {
      console.log('Wonderland - Source note not in a Wonderland folder, ignoring');
      return;
    }

    // Check if auto-generation is enabled for this folder
    if (!folderSettings.autoGeneratePlaceholders) {
      console.log('Wonderland - Auto-generation disabled for this folder');
      return;
    }

    console.log('Wonderland - Intercepting placeholder link click for:', linkText);

    evt.preventDefault();
    evt.stopPropagation();

    if (!this.validateSettings()) return;

    const notice = new Notice(`Generating: ${linkText}...`, 0);

    try {
      const sourceContext = await this.getSourceContext(linkText, activeFile);
      const relatedNotes = this.getExistingNoteTitles(folderSettings.path);

      const userPrompt = PLACEHOLDER_NOTE_USER_PROMPT(
        linkText,
        sourceContext,
        activeFile.basename,
        relatedNotes
      );

      // Create file in the same Wonderland folder
      const filePath = await this.getAvailableFilePath(linkText, folderSettings.path);

      await this.ensureFolderExists(folderSettings.path);

      const initialContent = await this.formatNote('*Drafting...*\n\n', folderSettings, undefined, linkText, false);
      await this.app.vault.create(filePath, initialContent);

      const newFile = this.app.vault.getAbstractFileByPath(filePath);
      if (newFile instanceof TFile) {
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(newFile);

        const response = await this.aiService.generate(userPrompt, PLACEHOLDER_NOTE_SYSTEM_PROMPT);
        const content = response.content;

        const formattedContent = await this.formatNote(content, folderSettings, undefined, linkText);
        await this.app.vault.modify(newFile, formattedContent);

        // Auto-classify into subfolder if enabled
        if (folderSettings.autoClassifyNewNotes) {
          const classifiedFolder = await this.classifyNoteIntoFolder(linkText, content, folderSettings);
          if (classifiedFolder && classifiedFolder !== 'uncategorized') {
            const newFolderPath = `${folderSettings.path}/${classifiedFolder}`;
            await this.ensureFolderExists(newFolderPath);
            const newFilePath = `${newFolderPath}/${newFile.name}`;
            try {
              await this.app.fileManager.renameFile(newFile, newFilePath);
              console.log(`Wonderland - Moved note to: ${classifiedFolder}`);
            } catch (e) {
              console.error('Wonderland - Failed to move note:', e);
            }
          }
        }
      }

      notice.hide();
      new Notice(`Created: ${linkText}`);
    } catch (error) {
      notice.hide();
      console.error('Error generating placeholder note:', error);
      new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
    }
  }

  async enrichNoteWithKnowledge(file: TFile, folderSettings: WonderlandFolderSettings, silent: boolean = false): Promise<boolean> {
    if (!this.validateSettings()) return false;

    const title = file.basename;
    const notice = silent ? null : new Notice(`Enriching ${title} with Wonderland knowledge...`, 0);

    try {
      const currentContent = await this.app.vault.read(file);
      const relatedNotes = await this.getRelatedWonderlandNotes(file, folderSettings);

      if (relatedNotes.length === 0) {
        if (notice) notice.hide();
        if (!silent) new Notice('No related notes found in Wonderland to enrich from');
        return false;
      }

      const relatedContext = relatedNotes
        .map(n => `### ${n.title}\n${n.content.substring(0, 500)}...`)
        .join('\n\n');

      const promptTemplate = folderSettings.autoUpdateMode === 'integrate'
        ? UPDATE_NOTE_INTEGRATE_PROMPT
        : UPDATE_NOTE_APPEND_PROMPT;

      const prompt = promptTemplate + currentContent + '\n\n---\n\nRelated notes from Wonderland:\n\n' + relatedContext;

      const response = await this.aiService.generate(
        prompt,
        'You are a knowledge synthesizer, weaving connections between ideas in a wonderland of knowledge.'
      );

      if (folderSettings.autoUpdateMode === 'integrate') {
        await this.app.vault.modify(file, response.content);
      } else {
        const newContent = currentContent.trim() + '\n\n' + response.content.trim();
        await this.app.vault.modify(file, newContent);
      }

      if (notice) notice.hide();
      if (!silent) new Notice(`Enriched: ${title}`);
      return true;
    } catch (error) {
      if (notice) notice.hide();
      console.error('Error enriching note:', error);
      if (!silent) new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
      return false;
    }
  }

  async autoUpdateFolderNotes(folderSettings: WonderlandFolderSettings, silent: boolean = false): Promise<void> {
    if (!this.validateSettings()) return;

    const notice = silent ? null : new Notice(`Auto-updating notes in ${folderSettings.path}...`, 0);
    let updatedCount = 0;

    try {
      const allFolderFiles = this.app.vault.getMarkdownFiles()
        .filter(f => f.path.startsWith(folderSettings.path + '/') || f.path === folderSettings.path);

      const filesToUpdate = allFolderFiles.slice(0, 10);

      for (const file of filesToUpdate) {
        const updated = await this.enrichNoteWithKnowledge(file, folderSettings, true);
        if (updated) updatedCount++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (notice) notice.hide();
      if (!silent) new Notice(`Updated ${updatedCount} notes in ${folderSettings.path}`);
    } catch (error) {
      if (notice) notice.hide();
      console.error('Error in auto-update:', error);
      if (!silent) new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
    }
  }

  async getRelatedWonderlandNotes(currentFile: TFile, folderSettings: WonderlandFolderSettings): Promise<Array<{ title: string; content: string }>> {
    const files = this.app.vault.getMarkdownFiles()
      .filter(f =>
        (f.path.startsWith(folderSettings.path + '/') || f.path === folderSettings.path) &&
        f.path !== currentFile.path
      );

    const currentContent = await this.app.vault.read(currentFile);
    const currentTitle = currentFile.basename.toLowerCase();

    const scoredFiles: Array<{ file: TFile; score: number }> = [];

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const fileTitle = file.basename.toLowerCase();

      let score = 0;
      if (currentContent.toLowerCase().includes(fileTitle)) score += 3;
      if (content.toLowerCase().includes(currentTitle)) score += 3;

      const currentLinks: string[] = currentContent.match(/\[\[([^\]]+)\]\]/g) || [];
      const fileLinks: string[] = content.match(/\[\[([^\]]+)\]\]/g) || [];
      const sharedLinks = currentLinks.filter((l: string) => fileLinks.includes(l));
      score += sharedLinks.length;

      if (score > 0) {
        scoredFiles.push({ file, score });
      }
    }

    scoredFiles.sort((a, b) => b.score - a.score);
    const topFiles = scoredFiles.slice(0, 5);

    const results: Array<{ title: string; content: string }> = [];
    for (const { file } of topFiles) {
      const content = await this.app.vault.read(file);
      results.push({ title: file.basename, content });
    }

    return results;
  }

  async organizeWonderlandFolder(folderSettings: WonderlandFolderSettings, silent: boolean = false): Promise<void> {
    if (!this.validateSettings()) return;

    const notice = silent ? null : new Notice(`Organizing ${folderSettings.path}...`, 0);

    try {
      // Get all files directly in the folder (not in subfolders)
      const allFiles = this.app.vault.getMarkdownFiles()
        .filter(f => {
          if (!f.path.startsWith(folderSettings.path + '/')) return false;
          const relativePath = f.path.replace(folderSettings.path + '/', '');
          return !relativePath.includes('/');
        });

      if (allFiles.length < 3) {
        if (notice) notice.hide();
        if (!silent) new Notice('Not enough notes to organize (need at least 3)');
        return;
      }

      const fileTitles = allFiles.map(f => f.name);
      const prompt = ORGANIZE_FOLDER_PROMPT + fileTitles.join('\n');

      const response = await this.aiService.generate(
        prompt,
        'You are a librarian organizing a collection of knowledge into intuitive categories.'
      );

      let organization: Record<string, string[]>;
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        organization = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse organization response:', response.content);
        if (notice) notice.hide();
        if (!silent) new Notice('Failed to parse organization suggestions');
        return;
      }

      let movedCount = 0;
      for (const [folder, files] of Object.entries(organization)) {
        if (folder === 'uncategorized') continue;

        const folderPath = `${folderSettings.path}/${folder}`;

        const existingFolder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!existingFolder) {
          await this.app.vault.createFolder(folderPath);
        }

        for (const filename of files) {
          const file = allFiles.find(f => f.name === filename);
          if (file) {
            const newPath = `${folderPath}/${filename}`;
            try {
              await this.app.fileManager.renameFile(file, newPath);
              movedCount++;
            } catch (e) {
              console.error(`Failed to move ${filename}:`, e);
            }
          }
        }
      }

      // Reset note counter after organizing
      folderSettings.notesSinceLastOrganize = 0;
      await this.saveSettings();

      if (notice) notice.hide();
      if (!silent) new Notice(`Organized ${movedCount} notes into subfolders`);

    } catch (error) {
      if (notice) notice.hide();
      console.error('Error organizing Wonderland:', error);
      if (!silent) new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
    }
  }

  // Increment the note counter and trigger reorganization if threshold reached
  async incrementNoteCounterAndCheckReorganize(folderSettings: WonderlandFolderSettings): Promise<void> {
    if (!folderSettings.organizeOnNoteCount) return;

    folderSettings.notesSinceLastOrganize = (folderSettings.notesSinceLastOrganize || 0) + 1;
    await this.saveSettings();

    console.log(`Wonderland - Notes since last organize: ${folderSettings.notesSinceLastOrganize}/${folderSettings.organizeNoteCountThreshold}`);

    if (folderSettings.notesSinceLastOrganize >= folderSettings.organizeNoteCountThreshold) {
      console.log('Wonderland - Note count threshold reached, triggering reorganization');
      await this.organizeWonderlandFolder(folderSettings, true);
    }
  }

  // Generate or update the Rabbit Holes Index showing all unresolved links
  async generateRabbitHolesIndex(folderSettings: WonderlandFolderSettings, silent: boolean = false): Promise<void> {
    const notice = silent ? null : new Notice('Generating Rabbit Holes index...', 0);

    try {
      // Get all unresolved links in this Wonderland folder
      const unresolvedLinks = await this.getUnresolvedLinksInFolder(folderSettings.path);

      if (unresolvedLinks.length === 0) {
        if (notice) notice.hide();
        if (!silent) new Notice('No unresolved links found - all rabbit holes have been explored!');
        return;
      }

      // Generate organized content using AI
      const linksList = unresolvedLinks.map(link => `- [[${link}]]`).join('\n');
      const prompt = RABBIT_HOLES_INDEX_PROMPT + linksList;

      const response = await this.aiService.generate(
        prompt,
        'You are organizing unexplored paths in a knowledge wonderland.'
      );

      // Create or update the rabbit holes index
      const indexName = this.getRabbitHolesIndexName(folderSettings.path);
      const indexPath = `${folderSettings.path}/${indexName}.md`;

      const content = `---
generated: ${new Date().toISOString()}
type: rabbit-holes-index
wonderland: ${folderSettings.path}
---

# ${indexName}

> 🐰 These are the unexplored rabbit holes waiting to be discovered. Click any link to begin your journey down the hole!

${response.content}

---
*${unresolvedLinks.length} rabbit holes waiting to be explored*
`;

      const existingFile = this.app.vault.getAbstractFileByPath(indexPath);
      if (existingFile instanceof TFile) {
        await this.app.vault.modify(existingFile, content);
      } else {
        await this.app.vault.create(indexPath, content);
      }

      if (notice) notice.hide();
      if (!silent) new Notice(`Rabbit Holes index updated: ${unresolvedLinks.length} unexplored links`);

      // Open the index document
      if (!silent) {
        const file = this.app.vault.getAbstractFileByPath(indexPath);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf().openFile(file);
        }
      }
    } catch (error) {
      if (notice) notice.hide();
      console.error('Error generating tunnels document:', error);
      if (!silent) new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
    }
  }

  // Get all unresolved links within a Wonderland folder
  async getUnresolvedLinksInFolder(folderPath: string): Promise<string[]> {
    const unresolvedLinks = new Set<string>();

    // Get all files in this folder and subfolders
    const files = this.app.vault.getMarkdownFiles()
      .filter(f => f.path.startsWith(folderPath + '/'));

    for (const file of files) {
      const content = await this.app.vault.read(file);

      // Extract all [[links]]
      const linkMatches = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
      if (!linkMatches) continue;

      for (const match of linkMatches) {
        const linkText = match.slice(2, -2).split('|')[0];

        // Check if this link resolves to an existing file
        const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, file.path);
        if (!linkedFile) {
          unresolvedLinks.add(linkText);
        }
      }
    }

    // Remove the tunnels document itself from the list
    const tunnelsDocName = this.getRabbitHolesIndexName(folderPath);
    unresolvedLinks.delete(tunnelsDocName);

    return Array.from(unresolvedLinks).sort();
  }

  async generateContentForNote(file: TFile, folderSettings: WonderlandFolderSettings): Promise<void> {
    if (!this.validateSettings()) return;

    const title = file.basename;
    const notice = new Notice(`Going down the rabbit hole: ${title}...`, 0);

    try {
      const existingNotes = this.getExistingNoteTitles(folderSettings.path).filter(n => n !== title);

      const userPrompt = PLACEHOLDER_NOTE_USER_PROMPT(
        title,
        '',
        'New note',
        existingNotes
      );

      // Build system prompt with all enhancements
      let systemPrompt = PLACEHOLDER_NOTE_SYSTEM_PROMPT;

      // Apply folder goal context
      if (folderSettings.folderGoal) {
        systemPrompt = FOLDER_GOAL_WRAPPER(
          folderSettings.folderGoal,
          folderSettings.customGoalDescription || '',
          systemPrompt
        );
      }

      // Apply custom instructions if set
      if (folderSettings.customInstructions) {
        systemPrompt = CUSTOM_INSTRUCTIONS_WRAPPER(folderSettings.customInstructions, systemPrompt);
      }

      // Add external links instruction if enabled
      if (folderSettings.includeExternalLinks) {
        systemPrompt += EXTERNAL_LINKS_PROMPT(folderSettings.maxExternalLinks || 3);
      }

      const response = await this.aiService.generate(userPrompt, systemPrompt);
      const generatedContent = response.content;

      // Pass the actual file path to ensure correct Wonderland metadata
      const formattedContent = await this.formatNote(generatedContent, folderSettings, undefined, title, true, file.path);
      await this.app.vault.modify(file, formattedContent);

      // Auto-classify into subfolder if enabled
      if (folderSettings.autoClassifyNewNotes) {
        const classifiedFolder = await this.classifyNoteIntoFolder(title, generatedContent, folderSettings);
        if (classifiedFolder && classifiedFolder !== 'uncategorized') {
          const newFolderPath = `${folderSettings.path}/${classifiedFolder}`;
          await this.ensureFolderExists(newFolderPath);
          const newFilePath = `${newFolderPath}/${file.name}`;
          try {
            await this.app.fileManager.renameFile(file, newFilePath);
            console.log(`Wonderland - Moved note to: ${classifiedFolder}`);
          } catch (e) {
            console.error('Wonderland - Failed to move note:', e);
          }
        }
      }

      // Increment note counter and check for reorganization
      await this.incrementNoteCounterAndCheckReorganize(folderSettings);

      // Update tunnels document if enabled
      if (folderSettings.autoUpdateRabbitHolesIndex) {
        await this.generateRabbitHolesIndex(folderSettings, true);
      }

      notice.hide();
      new Notice(`Generated: ${title}`);
    } catch (error) {
      notice.hide();
      console.error('Error generating note content:', error);
      new Notice(`Error: ${AIService.getUserFriendlyError(error)}`);
    }
  }

  async handleFileOpen(file: TFile): Promise<void> {
    if (file.extension !== 'md') return;

    // Block generation for "Untitled" notes - user is just creating a blank note
    if (this.isUntitledNote(file.basename)) {
      console.log('Wonderland - Untitled note detected, skipping auto-generation');
      this.pendingGenerations.delete(file.path);
      return;
    }

    // Check if this note was created from clicking an unresolved link
    const sourceWonderlandPath = this.pendingGenerations.get(file.path);
    if (!sourceWonderlandPath) {
      console.log('Wonderland - Note not from link click, skipping auto-generation');
      return;
    }

    // Get the folder settings for the SOURCE Wonderland folder
    const folderSettings = this.settings.wonderlandFolders.find(f => f.path === sourceWonderlandPath);
    if (!folderSettings) {
      console.log('Wonderland - Source folder no longer configured, skipping');
      this.pendingGenerations.delete(file.path);
      return;
    }

    // Check if auto-generation for empty notes is enabled for this folder
    if (!folderSettings.autoGenerateEmptyNotes) {
      console.log('Wonderland - Auto-generation disabled for this folder');
      this.pendingGenerations.delete(file.path);
      return;
    }

    // Remove from pending
    this.pendingGenerations.delete(file.path);

    if (!this.validateSettings()) return;

    const content = await this.app.vault.read(file);
    const trimmedContent = content.trim();
    if (trimmedContent.length > 0) {
      console.log('Wonderland - Note has content, skipping auto-generation');
      return;
    }

    console.log('Wonderland - Empty note from link click detected:', file.basename);
    console.log('Wonderland - Will place in folder:', sourceWonderlandPath);

    // Check if the file is already in the correct Wonderland folder
    const isInCorrectFolder = file.path.startsWith(sourceWonderlandPath + '/');

    if (!isInCorrectFolder) {
      // Move the file to the Wonderland folder first
      await this.ensureFolderExists(sourceWonderlandPath);
      const newPath = `${sourceWonderlandPath}/${file.name}`;

      try {
        console.log('Wonderland - Moving file from', file.path, 'to', newPath);
        await this.app.fileManager.renameFile(file, newPath);

        // Get the file at the new location
        const movedFile = this.app.vault.getAbstractFileByPath(newPath);
        if (movedFile instanceof TFile) {
          // Generate content for the moved file
          await this.generateContentForNote(movedFile, folderSettings);
        }
      } catch (e) {
        console.error('Wonderland - Failed to move file:', e);
        // Try generating content at the current location anyway
        await this.generateContentForNote(file, folderSettings);
      }
    } else {
      // File is already in the right place, just generate content
      await this.generateContentForNote(file, folderSettings);
    }
  }

  async getSourceContext(linkText: string, sourceFile: TFile | null): Promise<string> {
    if (!sourceFile) return '';

    const content = await this.app.vault.read(sourceFile);
    const lines = content.split('\n');

    const linkPattern = new RegExp(`\\[\\[${this.escapeRegExp(linkText)}\\]\\]`, 'i');
    const contextLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (linkPattern.test(lines[i])) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length - 1, i + 2);
        contextLines.push(...lines.slice(start, end + 1));
      }
    }

    return contextLines.join('\n').substring(0, 500);
  }

  async generateTitle(content: string): Promise<string> {
    try {
      const response = await this.aiService.generate(
        TITLE_GENERATION_PROMPT + content.substring(0, 1000),
        'You are a helpful assistant that generates concise titles.'
      );
      return this.sanitizeFileName(response.content.trim());
    } catch (error) {
      console.error('Error generating title:', error);
      const firstLine = content.split('\n')[0].replace(/[#*_\[\]]/g, '').trim();
      return this.sanitizeFileName(firstLine.substring(0, 50) || `Note ${Date.now()}`);
    }
  }

  async formatNote(content: string, folderSettings: WonderlandFolderSettings, prompt?: string, concept?: string, includeQuestions: boolean = true, actualFilePath?: string): Promise<string> {
    let formatted = '';

    // Determine the actual Wonderland folder from the file path if provided
    // This fixes the bug where metadata showed wrong folder
    const wonderlandPath = actualFilePath
      ? (this.getWonderlandFolderFor(actualFilePath) || folderSettings.path)
      : folderSettings.path;

    if (folderSettings.includeMetadata) {
      formatted += '---\n';
      formatted += `created: ${new Date().toISOString()}\n`;
      formatted += `source: ${prompt ? 'prompt' : 'placeholder'}\n`;
      if (prompt) {
        formatted += `prompt: "${prompt.replace(/"/g, '\\"')}"\n`;
      }
      if (concept) {
        formatted += `concept: "${concept.replace(/"/g, '\\"')}"\n`;
      }
      formatted += `model: ${this.settings.model}\n`;
      formatted += `wonderland: ${wonderlandPath}\n`;
      if (folderSettings.folderGoal && folderSettings.folderGoal !== 'learn') {
        formatted += `goal: ${folderSettings.folderGoal}\n`;
      }
      formatted += 'tags: [evergreen]\n';
      formatted += '---\n\n';
    }

    formatted += content;

    // Add rabbit hole questions if enabled for this folder
    if (includeQuestions && folderSettings.includeFollowUpQuestions) {
      try {
        const questions = await this.generateRabbitHoleQuestions(content, folderSettings);
        if (questions) {
          formatted += '\n\n---\n\n## Down the rabbit hole\n\n';
          formatted += questions;
        }
      } catch (error) {
        console.error('Error generating rabbit hole questions:', error);
      }
    }

    return formatted;
  }

  async generateRabbitHoleQuestions(content: string, folderSettings?: WonderlandFolderSettings): Promise<string> {
    let prompt = RABBIT_HOLE_QUESTIONS_PROMPT + content.substring(0, 1500);

    // Add personalized suggestions based on user interests
    if (folderSettings?.customizeSuggestions && folderSettings?.userInterests) {
      prompt += PERSONALIZED_SUGGESTIONS_PROMPT(folderSettings.userInterests);
    }

    const response = await this.aiService.generate(
      prompt,
      'You are a curious guide to wonderland, creating doorways to deeper knowledge. Each question you ask becomes a portal to explore.'
    );
    return response.content.trim();
  }

  async saveNote(title: string, content: string, folderSettings: WonderlandFolderSettings): Promise<string> {
    await this.ensureFolderExists(folderSettings.path);

    // Determine the target folder (with auto-classification if enabled)
    let targetFolder = folderSettings.path;
    if (folderSettings.autoClassifyNewNotes) {
      const classifiedFolder = await this.classifyNoteIntoFolder(title, content, folderSettings);
      if (classifiedFolder && classifiedFolder !== 'uncategorized') {
        targetFolder = `${folderSettings.path}/${classifiedFolder}`;
        await this.ensureFolderExists(targetFolder);
        console.log(`Wonderland - Auto-classified note into: ${classifiedFolder}`);
      }
    }

    const filePath = await this.getAvailableFilePath(title, targetFolder);
    await this.app.vault.create(filePath, content);

    return filePath;
  }

  async classifyNoteIntoFolder(title: string, content: string, folderSettings: WonderlandFolderSettings): Promise<string | null> {
    try {
      const subfolders = await this.getWonderlandSubfolders(folderSettings.path);

      if (subfolders.length === 0) {
        console.log('Wonderland - No subfolders exist yet, skipping classification');
        return null;
      }

      let folderContext = '';
      for (const subfolder of subfolders) {
        const folderPath = `${folderSettings.path}/${subfolder.name}`;
        const notesInFolder = this.app.vault.getMarkdownFiles()
          .filter(f => f.path.startsWith(folderPath + '/'))
          .map(f => f.basename)
          .slice(0, 10);

        folderContext += `\n${subfolder.name}/\n`;
        folderContext += notesInFolder.map(n => `  - ${n}`).join('\n');
      }

      const prompt = CLASSIFY_NOTE_PROMPT + folderContext +
        `\n\nNew note to classify:\nTitle: ${title}\nContent preview: ${content.substring(0, 500)}...\n\nWhich folder should this note go in? Respond with ONLY the folder name.`;

      const response = await this.aiService.generate(
        prompt,
        'You are a librarian classifying a new book into the appropriate section.'
      );

      const suggestedFolder = response.content.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');

      const validFolders = subfolders.map(f => f.name.toLowerCase());
      if (validFolders.includes(suggestedFolder)) {
        const originalFolder = subfolders.find(f => f.name.toLowerCase() === suggestedFolder);
        return originalFolder?.name || null;
      }

      return null;
    } catch (error) {
      console.error('Wonderland - Error classifying note:', error);
      return null;
    }
  }

  async getWonderlandSubfolders(basePath: string): Promise<Array<{ name: string; path: string }>> {
    const baseFolderAbstract = this.app.vault.getAbstractFileByPath(basePath);

    if (!baseFolderAbstract) return [];

    const subfolders: Array<{ name: string; path: string }> = [];

    const allFiles = this.app.vault.getAllLoadedFiles();
    for (const file of allFiles) {
      if (file.path.startsWith(basePath + '/') && 'children' in file) {
        const relativePath = file.path.replace(basePath + '/', '');
        if (!relativePath.includes('/')) {
          subfolders.push({ name: file.name, path: file.path });
        }
      }
    }

    return subfolders;
  }

  async getAvailableFilePath(baseName: string, folder: string): Promise<string> {
    const sanitized = this.sanitizeFileName(baseName);
    let filePath = `${folder}/${sanitized}.md`;
    let counter = 1;

    while (this.app.vault.getAbstractFileByPath(filePath)) {
      filePath = `${folder}/${sanitized} ${counter}.md`;
      counter++;
    }

    return filePath;
  }

  async ensureFolderExists(folderPath: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!folder) {
      await this.app.vault.createFolder(folderPath);
    }
  }

  getExistingNoteTitles(folderPath?: string): string[] {
    let files = this.app.vault.getMarkdownFiles();

    if (folderPath) {
      files = files.filter(f => f.path.startsWith(folderPath + '/') || f.path === folderPath);
    }

    return files.map(f => f.basename).slice(0, 50);
  }

  // Get all folders in the vault (for folder picker)
  getAllVaultFolders(): string[] {
    const folders: string[] = [];
    const allFiles = this.app.vault.getAllLoadedFiles();

    for (const file of allFiles) {
      if (file instanceof TFolder && file.path !== '/') {
        folders.push(file.path);
      }
    }

    // Also add root-level option
    folders.sort();
    return folders;
  }

  validateSettings(): boolean {
    if (this.settings.aiProvider !== 'ollama' && !this.settings.apiKey) {
      new Notice('Please configure your API key in settings');
      return false;
    }
    if (!this.settings.model) {
      new Notice('Please select a model in settings');
      return false;
    }
    return true;
  }

  sanitizeFileName(name: string): string {
    return name
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Prompt Modal for entering topics to explore
class PromptModal extends Modal {
  private onSubmit: (prompt: string, folderPath: string) => void;
  private textArea: HTMLTextAreaElement;
  private folderSelect: HTMLSelectElement;
  private newFolderInput: HTMLInputElement;
  private newFolderContainer: HTMLDivElement;
  private plugin: EvergreenAIPlugin;
  private isCreatingNewFolder: boolean = false;

  constructor(app: App, plugin: EvergreenAIPlugin, onSubmit: (prompt: string, folderPath: string) => void) {
    super(app);
    this.plugin = plugin;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Enter Wonderland' });

    contentEl.createEl('p', {
      text: 'What rabbit hole would you like to explore?',
      cls: 'wonderland-prompt-description',
    });

    // Folder selector - always show for flexibility
    const folderContainer = contentEl.createDiv({ cls: 'wonderland-folder-select' });
    folderContainer.style.marginBottom = '1em';

    folderContainer.createEl('label', { text: 'Create in: ' });

    this.folderSelect = folderContainer.createEl('select');
    this.folderSelect.style.marginRight = '0.5em';

    // Determine the default folder - prefer current folder if it's a Wonderland
    const currentFolderPath = this.plugin.getCurrentFolderPath();
    let defaultFolderPath: string | null = null;

    // Check if current folder is already a Wonderland
    if (currentFolderPath) {
      const currentWonderland = this.plugin.getWonderlandSettingsFor(currentFolderPath);
      if (currentWonderland) {
        defaultFolderPath = currentWonderland.path;
      }
    }

    // Add existing Wonderland folders
    for (const folder of this.plugin.settings.wonderlandFolders) {
      const option = this.folderSelect.createEl('option', {
        text: folder.path,
        value: folder.path,
      });
      if (folder.path === defaultFolderPath) {
        option.selected = true;
      }
    }

    // Add "Current folder" option if it's not already a Wonderland
    if (currentFolderPath && !this.plugin.isInWonderland(currentFolderPath)) {
      const option = this.folderSelect.createEl('option', {
        text: `📁 ${currentFolderPath} (make Wonderland)`,
        value: `__current__:${currentFolderPath}`,
      });
    }

    // Add "Create new folder" option
    const newFolderOption = this.folderSelect.createEl('option', {
      text: '➕ Create new Wonderland folder...',
      value: '__new__',
    });

    // New folder input (hidden by default)
    this.newFolderContainer = folderContainer.createDiv({ cls: 'wonderland-new-folder-input' });
    this.newFolderContainer.style.display = 'none';
    this.newFolderContainer.style.marginTop = '0.5em';

    this.newFolderInput = this.newFolderContainer.createEl('input', {
      type: 'text',
      placeholder: 'Enter new folder name...',
    });
    this.newFolderInput.style.width = '100%';

    // Handle folder selection change
    this.folderSelect.addEventListener('change', () => {
      const value = this.folderSelect.value;
      if (value === '__new__') {
        this.newFolderContainer.style.display = 'block';
        this.isCreatingNewFolder = true;
        this.newFolderInput.focus();
      } else {
        this.newFolderContainer.style.display = 'none';
        this.isCreatingNewFolder = false;
      }
    });

    this.textArea = contentEl.createEl('textarea', {
      cls: 'wonderland-prompt-input',
      attr: {
        placeholder: 'e.g., "Why do we dream?" or "The science of curiosity"',
        rows: '4',
      },
    });

    this.textArea.style.width = '100%';
    this.textArea.style.marginBottom = '1em';
    this.textArea.style.padding = '0.5em';
    this.textArea.style.resize = 'vertical';

    setTimeout(() => this.textArea.focus(), 10);

    const buttonContainer = contentEl.createDiv({ cls: 'wonderland-button-container' });
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '0.5em';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Stay here' });
    cancelBtn.addEventListener('click', () => this.close());

    const exploreBtn = buttonContainer.createEl('button', {
      text: 'Down the rabbit hole',
      cls: 'mod-cta',
    });
    exploreBtn.addEventListener('click', () => this.submit());

    this.textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.submit();
      }
    });
  }

  async submit() {
    const prompt = this.textArea.value.trim();
    if (!prompt) {
      new Notice('Please enter something to explore');
      return;
    }

    let folderPath: string;
    const selectedValue = this.folderSelect?.value || '';

    if (selectedValue === '__new__') {
      // Creating a new folder
      const newFolderName = this.newFolderInput.value.trim();
      if (!newFolderName) {
        new Notice('Please enter a folder name');
        return;
      }
      folderPath = newFolderName;

      // Create the folder and add as Wonderland
      try {
        await this.plugin.ensureFolderExists(folderPath);
        const newSettings = createFolderSettings(folderPath);
        this.plugin.settings.wonderlandFolders.push(newSettings);
        await this.plugin.saveSettings();
        new Notice(`Created new Wonderland: ${folderPath}`);
      } catch (e) {
        new Notice(`Failed to create folder: ${e}`);
        return;
      }
    } else if (selectedValue.startsWith('__current__:')) {
      // Making current folder a Wonderland
      folderPath = selectedValue.replace('__current__:', '');

      // Open folder settings modal first
      this.close();
      new NewWonderlandSetupModal(this.app, this.plugin, folderPath, async (settings) => {
        this.plugin.settings.wonderlandFolders.push(settings);
        await this.plugin.saveSettings();
        new Notice(`${folderPath} is now a Wonderland!`);
        // Now generate the note
        await this.plugin.generateNoteFromPrompt(prompt, folderPath);
      }).open();
      return;
    } else if (selectedValue) {
      folderPath = selectedValue;
    } else {
      folderPath = this.plugin.settings.wonderlandFolders[0]?.path;
    }

    if (!folderPath) {
      new Notice('Please select or create a Wonderland folder');
      return;
    }

    this.close();
    this.onSubmit(prompt, folderPath);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Modal for setting up a new Wonderland folder with customization options
class NewWonderlandSetupModal extends Modal {
  private plugin: EvergreenAIPlugin;
  private folderPath: string;
  private onComplete: (settings: WonderlandFolderSettings) => void;
  private settings: WonderlandFolderSettings;

  constructor(
    app: App,
    plugin: EvergreenAIPlugin,
    folderPath: string,
    onComplete: (settings: WonderlandFolderSettings) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.folderPath = folderPath;
    this.onComplete = onComplete;
    this.settings = createFolderSettings(folderPath);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: `Setup: ${this.folderPath}` });

    contentEl.createEl('p', {
      text: 'Customize this Wonderland before creating your first note:',
      cls: 'wonderland-setup-description',
    }).style.color = 'var(--text-muted)';

    // Folder Goal selector
    const goalContainer = contentEl.createDiv({ cls: 'wonderland-setup-goal' });
    goalContainer.style.marginBottom = '1em';

    goalContainer.createEl('label', { text: 'Folder Goal:' }).style.display = 'block';
    goalContainer.createEl('small', {
      text: 'This affects how AI generates content for this Wonderland',
    }).style.cssText = 'display: block; color: var(--text-muted); margin-bottom: 0.5em;';

    const goalSelect = goalContainer.createEl('select');
    goalSelect.style.width = '100%';

    const goals: { value: FolderGoal; label: string; desc: string }[] = [
      { value: 'learn', label: '📚 Learning', desc: 'Optimized for understanding and retention' },
      { value: 'action', label: '✅ Action-Oriented', desc: 'Practical steps and how-to guides' },
      { value: 'reflect', label: '🤔 Critical Reflection', desc: 'Deep thinking and multiple perspectives' },
      { value: 'research', label: '🔬 Research', desc: 'Evidence-based with citations' },
      { value: 'creative', label: '🎨 Creative', desc: 'Imaginative and unconventional connections' },
      { value: 'custom', label: '⚙️ Custom', desc: 'Define your own focus' },
    ];

    for (const goal of goals) {
      goalSelect.createEl('option', {
        text: `${goal.label} - ${goal.desc}`,
        value: goal.value,
      });
    }

    // Custom goal description (hidden by default)
    const customGoalContainer = goalContainer.createDiv();
    customGoalContainer.style.display = 'none';
    customGoalContainer.style.marginTop = '0.5em';

    const customGoalInput = customGoalContainer.createEl('textarea', {
      placeholder: 'Describe the focus for this Wonderland...',
    });
    customGoalInput.style.cssText = 'width: 100%; height: 60px;';

    goalSelect.addEventListener('change', () => {
      this.settings.folderGoal = goalSelect.value as FolderGoal;
      customGoalContainer.style.display = goalSelect.value === 'custom' ? 'block' : 'none';
    });

    customGoalInput.addEventListener('input', () => {
      this.settings.customGoalDescription = customGoalInput.value;
    });

    // Custom Instructions
    const instructionsContainer = contentEl.createDiv({ cls: 'wonderland-setup-instructions' });
    instructionsContainer.style.marginBottom = '1em';

    instructionsContainer.createEl('label', { text: 'Custom Instructions (optional):' }).style.display = 'block';
    instructionsContainer.createEl('small', {
      text: 'E.g., "Generate notes as step-by-step cooking guides"',
    }).style.cssText = 'display: block; color: var(--text-muted); margin-bottom: 0.5em;';

    const instructionsInput = instructionsContainer.createEl('textarea', {
      placeholder: 'Special instructions for AI generation...',
    });
    instructionsInput.style.cssText = 'width: 100%; height: 60px;';

    instructionsInput.addEventListener('input', () => {
      this.settings.customInstructions = instructionsInput.value;
    });

    // Quick toggles
    const togglesContainer = contentEl.createDiv({ cls: 'wonderland-setup-toggles' });
    togglesContainer.style.marginBottom = '1.5em';

    const toggles = [
      { key: 'includeExternalLinks', label: '🔗 Include external reference links', default: false },
      { key: 'customizeSuggestions', label: '🎯 Personalize "rabbit hole" suggestions', default: false },
    ];

    for (const toggle of toggles) {
      const toggleDiv = togglesContainer.createDiv();
      toggleDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 0.5em;';

      const checkbox = toggleDiv.createEl('input', { type: 'checkbox' });
      checkbox.checked = toggle.default;
      checkbox.style.marginRight = '0.5em';

      toggleDiv.createEl('label', { text: toggle.label });

      checkbox.addEventListener('change', () => {
        (this.settings as any)[toggle.key] = checkbox.checked;
      });
    }

    // User interests (for personalized suggestions)
    const interestsContainer = contentEl.createDiv({ cls: 'wonderland-setup-interests' });
    interestsContainer.style.marginBottom = '1em';

    interestsContainer.createEl('label', { text: 'Your Interests (optional):' }).style.display = 'block';
    interestsContainer.createEl('small', {
      text: 'Comma-separated list to personalize suggestions',
    }).style.cssText = 'display: block; color: var(--text-muted); margin-bottom: 0.5em;';

    const interestsInput = interestsContainer.createEl('input', {
      type: 'text',
      placeholder: 'e.g., philosophy, AI, cooking, music',
    });
    interestsInput.style.width = '100%';

    interestsInput.addEventListener('input', () => {
      this.settings.userInterests = interestsInput.value;
    });

    // Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'wonderland-setup-buttons' });
    buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 0.5em;';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());

    const createBtn = buttonContainer.createEl('button', {
      text: 'Create Wonderland',
      cls: 'mod-cta',
    });
    createBtn.addEventListener('click', () => {
      this.close();
      this.onComplete(this.settings);
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Welcome Modal for first-time users
class WelcomeModal extends Modal {
  private plugin: EvergreenAIPlugin;
  private onComplete: () => void;

  constructor(app: App, plugin: EvergreenAIPlugin, onComplete: () => void) {
    super(app);
    this.plugin = plugin;
    this.onComplete = onComplete;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.addClass('wonderland-welcome-modal');

    // Header with rabbit emoji
    contentEl.createEl('div', {
      text: '🐰',
      cls: 'wonderland-welcome-emoji',
    }).style.cssText = 'font-size: 4em; text-align: center; margin-bottom: 0.5em;';

    contentEl.createEl('h1', {
      text: 'Welcome to Wonderland',
      cls: 'wonderland-welcome-title',
    }).style.cssText = 'text-align: center; margin-bottom: 0.5em;';

    contentEl.createEl('p', {
      text: 'Go down the rabbit hole of knowledge',
      cls: 'wonderland-welcome-subtitle',
    }).style.cssText = 'text-align: center; color: var(--text-muted); margin-bottom: 1.5em; font-style: italic;';

    // Features section
    const featuresContainer = contentEl.createDiv({ cls: 'wonderland-features' });
    featuresContainer.style.cssText = 'margin-bottom: 1.5em;';

    const features = [
      {
        emoji: '✨',
        title: 'AI-Powered Exploration',
        desc: 'Ask a question and watch knowledge unfold with linked notes'
      },
      {
        emoji: '🔗',
        title: 'Linked Doorways',
        desc: 'Click any [[link]] to auto-generate connected concepts'
      },
      {
        emoji: '🗂️',
        title: 'Smart Organization',
        desc: 'Let AI organize your notes into thematic folders'
      },
      {
        emoji: '📚',
        title: 'Multiple Wonderlands',
        desc: 'Create separate knowledge gardens for different domains'
      }
    ];

    for (const feature of features) {
      const featureEl = featuresContainer.createDiv({ cls: 'wonderland-feature' });
      featureEl.style.cssText = 'display: flex; align-items: flex-start; margin-bottom: 1em;';

      const emojiEl = featureEl.createSpan({ text: feature.emoji });
      emojiEl.style.cssText = 'font-size: 1.5em; margin-right: 0.75em;';

      const textEl = featureEl.createDiv();
      textEl.createEl('strong', { text: feature.title });
      textEl.createEl('p', { text: feature.desc }).style.cssText = 'margin: 0.25em 0 0 0; color: var(--text-muted); font-size: 0.9em;';
    }

    // Getting started section
    const gettingStarted = contentEl.createDiv({ cls: 'wonderland-getting-started' });
    gettingStarted.style.cssText = 'background: var(--background-secondary); padding: 1em; border-radius: 8px; margin-bottom: 1.5em;';

    gettingStarted.createEl('h3', { text: '🚀 Quick Start' }).style.marginTop = '0';

    const steps = gettingStarted.createEl('ol');
    steps.style.cssText = 'margin: 0.5em 0; padding-left: 1.5em;';

    const stepItems = [
      'Configure your AI provider in Settings → Wonderland',
      'Add a Wonderland folder (where your notes will live)',
      'Click the 🐰 rabbit icon or use the command palette',
      'Enter a question and start exploring!'
    ];

    for (const step of stepItems) {
      steps.createEl('li', { text: step }).style.marginBottom = '0.5em';
    }

    // Button container
    const buttonContainer = contentEl.createDiv({ cls: 'wonderland-welcome-buttons' });
    buttonContainer.style.cssText = 'display: flex; justify-content: center; gap: 1em;';

    const settingsBtn = buttonContainer.createEl('button', { text: 'Open Settings' });
    settingsBtn.addEventListener('click', () => {
      this.close();
      // Open the plugin settings tab
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById('wonderland');
    });

    const exploreBtn = buttonContainer.createEl('button', {
      text: 'Start Exploring',
      cls: 'mod-cta',
    });
    exploreBtn.addEventListener('click', () => {
      this.close();
      if (this.plugin.settings.wonderlandFolders.length === 0) {
        new Notice('Add a Wonderland folder in settings first');
        (this.app as any).setting.open();
        (this.app as any).setting.openTabById('wonderland');
      } else if (!this.plugin.settings.apiKey && this.plugin.settings.aiProvider !== 'ollama') {
        new Notice('Configure your API key in settings first');
        (this.app as any).setting.open();
        (this.app as any).setting.openTabById('wonderland');
      } else {
        this.plugin.openPromptModal();
      }
    });

    // Footer
    const footer = contentEl.createDiv({ cls: 'wonderland-welcome-footer' });
    footer.style.cssText = 'text-align: center; margin-top: 1em; color: var(--text-muted); font-size: 0.85em;';
    footer.createEl('p', { text: '"Curiouser and curiouser!" - Alice' }).style.fontStyle = 'italic';

    // Support link
    const supportLink = footer.createEl('p');
    supportLink.innerHTML = 'Enjoying Wonderland? <a href="https://ko-fi.com/donjguido" target="_blank">Support development</a>';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.onComplete();
  }
}
