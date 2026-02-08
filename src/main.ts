import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  TFile,
  TFolder,
} from 'obsidian';
import { EvergreenAISettings, DEFAULT_SETTINGS } from './types';
import { EvergreenAISettingTab } from './settings';
import { AIService } from './services/AIService';
import {
  EVERGREEN_NOTE_SYSTEM_PROMPT,
  EVERGREEN_NOTE_USER_PROMPT,
  TITLE_GENERATION_PROMPT,
} from './prompts/evergreenNote';
import {
  PLACEHOLDER_NOTE_SYSTEM_PROMPT,
  PLACEHOLDER_NOTE_USER_PROMPT,
} from './prompts/placeholderNote';

export default class EvergreenAIPlugin extends Plugin {
  settings: EvergreenAISettings;
  aiService: AIService;

  async onload() {
    await this.loadSettings();

    this.aiService = new AIService(this.settings);

    // Add ribbon icon
    this.addRibbonIcon('leaf', 'Generate Evergreen Note', () => {
      this.openPromptModal();
    });

    // Add command to generate note from prompt
    this.addCommand({
      id: 'generate-evergreen-note',
      name: 'Generate evergreen note from prompt',
      callback: () => {
        this.openPromptModal();
      },
    });

    // Add command to generate from selection
    this.addCommand({
      id: 'generate-from-selection',
      name: 'Generate evergreen note from selection',
      editorCallback: (editor: Editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.generateNoteFromPrompt(selection);
        } else {
          new Notice('Please select some text first');
        }
      },
    });

    // Register click handler for placeholder links
    this.registerDomEvent(document, 'click', async (evt: MouseEvent) => {
      await this.handleLinkClick(evt);
    }, { capture: true });

    // Add settings tab
    this.addSettingTab(new EvergreenAISettingTab(this.app, this));

    console.log('Evergreen AI plugin loaded');
  }

  onunload() {
    console.log('Evergreen AI plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.aiService?.updateSettings(this.settings);
  }

  openPromptModal() {
    new PromptModal(this.app, async (prompt) => {
      await this.generateNoteFromPrompt(prompt);
    }).open();
  }

  async generateNoteFromPrompt(prompt: string): Promise<void> {
    if (!this.validateSettings()) return;

    const notice = new Notice('Generating evergreen note...', 0);

    try {
      // Get existing notes for context
      const existingNotes = this.getExistingNoteTitles();

      // Generate the note content
      const userPrompt = EVERGREEN_NOTE_USER_PROMPT(prompt, '', existingNotes);
      let content = '';

      await this.aiService.generateStream(
        userPrompt,
        EVERGREEN_NOTE_SYSTEM_PROMPT,
        (chunk) => {
          content += chunk;
        },
        () => {}
      );

      // Generate title
      const title = await this.generateTitle(content);

      // Format and save the note
      const formattedContent = this.formatNote(content, prompt);
      const filePath = await this.saveNote(title, formattedContent);

      notice.hide();
      new Notice(`Created: ${title}`);

      // Open the new note
      const file = this.app.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      }
    } catch (error) {
      notice.hide();
      console.error('Error generating note:', error);
      new Notice(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleLinkClick(evt: MouseEvent): Promise<void> {
    const target = evt.target as HTMLElement;

    // Check if this is an internal link
    if (!target.classList.contains('internal-link')) return;

    const linkText = target.getAttribute('data-href');
    if (!linkText) return;

    // Check if the linked note exists
    const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkText, '');
    if (linkedFile) return; // Note exists, let Obsidian handle it normally

    // This is a placeholder link - intercept and generate
    evt.preventDefault();
    evt.stopPropagation();

    if (!this.validateSettings()) return;

    const notice = new Notice(`Generating: ${linkText}...`, 0);

    try {
      // Get context from the source note
      const activeFile = this.app.workspace.getActiveFile();
      const sourceContext = await this.getSourceContext(linkText, activeFile);
      const relatedNotes = this.getExistingNoteTitles();

      // Generate the placeholder note
      const userPrompt = PLACEHOLDER_NOTE_USER_PROMPT(
        linkText,
        sourceContext,
        activeFile?.basename || 'Unknown',
        relatedNotes
      );

      let content = '';

      // Create and open the new file immediately for streaming effect
      const filePath = await this.getAvailableFilePath(linkText);
      const folder = this.settings.noteFolder;

      // Ensure folder exists
      await this.ensureFolderExists(folder);

      // Create initial file with placeholder
      const initialContent = this.formatNote('*Drafting...*\n\n', undefined, linkText);
      await this.app.vault.create(filePath, initialContent);

      // Open the new file
      const newFile = this.app.vault.getAbstractFileByPath(filePath);
      if (newFile instanceof TFile) {
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(newFile);

        // Stream content into the file
        await this.aiService.generateStream(
          userPrompt,
          PLACEHOLDER_NOTE_SYSTEM_PROMPT,
          async (chunk) => {
            content += chunk;
            const formattedContent = this.formatNote(content, undefined, linkText);
            await this.app.vault.modify(newFile, formattedContent);
          },
          async () => {
            // Final update with complete content
            const formattedContent = this.formatNote(content, undefined, linkText);
            await this.app.vault.modify(newFile, formattedContent);
          }
        );
      }

      notice.hide();
      new Notice(`Created: ${linkText}`);
    } catch (error) {
      notice.hide();
      console.error('Error generating placeholder note:', error);
      new Notice(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSourceContext(linkText: string, sourceFile: TFile | null): Promise<string> {
    if (!sourceFile) return '';

    const content = await this.app.vault.read(sourceFile);
    const lines = content.split('\n');

    // Find lines containing the link
    const linkPattern = new RegExp(`\\[\\[${this.escapeRegExp(linkText)}\\]\\]`, 'i');
    const contextLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (linkPattern.test(lines[i])) {
        // Get surrounding context (2 lines before and after)
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length - 1, i + 2);
        contextLines.push(...lines.slice(start, end + 1));
      }
    }

    return contextLines.join('\n').substring(0, 500); // Limit context length
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
      // Fallback: use first line or timestamp
      const firstLine = content.split('\n')[0].replace(/[#*_\[\]]/g, '').trim();
      return this.sanitizeFileName(firstLine.substring(0, 50) || `Note ${Date.now()}`);
    }
  }

  formatNote(content: string, prompt?: string, concept?: string): string {
    let formatted = '';

    if (this.settings.includeMetadata) {
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
      formatted += 'tags: [evergreen]\n';
      formatted += '---\n\n';
    }

    formatted += content;

    if (this.settings.autoBacklinks) {
      formatted += '\n\n---\n\n## Backlinks\n\n';
      formatted += '*Links to this note will appear here*\n';
    }

    return formatted;
  }

  async saveNote(title: string, content: string): Promise<string> {
    const folder = this.settings.noteFolder;
    await this.ensureFolderExists(folder);

    const filePath = await this.getAvailableFilePath(title);
    await this.app.vault.create(filePath, content);

    return filePath;
  }

  async getAvailableFilePath(baseName: string): Promise<string> {
    const folder = this.settings.noteFolder;
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

  getExistingNoteTitles(): string[] {
    const files = this.app.vault.getMarkdownFiles();
    return files.map(f => f.basename).slice(0, 50); // Limit for context
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

// Prompt Modal for entering prompts
class PromptModal extends Modal {
  private onSubmit: (prompt: string) => void;
  private textArea: HTMLTextAreaElement;

  constructor(app: App, onSubmit: (prompt: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Generate Evergreen Note' });

    contentEl.createEl('p', {
      text: 'Enter a prompt, question, or topic to explore:',
      cls: 'evergreen-prompt-description',
    });

    this.textArea = contentEl.createEl('textarea', {
      cls: 'evergreen-prompt-input',
      attr: {
        placeholder: 'e.g., "Explain how spaced repetition enhances learning"',
        rows: '4',
      },
    });

    this.textArea.style.width = '100%';
    this.textArea.style.marginBottom = '1em';
    this.textArea.style.padding = '0.5em';
    this.textArea.style.resize = 'vertical';

    // Focus the textarea
    setTimeout(() => this.textArea.focus(), 10);

    // Button container
    const buttonContainer = contentEl.createDiv({ cls: 'evergreen-button-container' });
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '0.5em';

    // Cancel button
    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => this.close());

    // Generate button
    const generateBtn = buttonContainer.createEl('button', {
      text: 'Generate',
      cls: 'mod-cta',
    });
    generateBtn.addEventListener('click', () => this.submit());

    // Handle Enter key (Cmd/Ctrl + Enter to submit)
    this.textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.submit();
      }
    });
  }

  submit() {
    const prompt = this.textArea.value.trim();
    if (prompt) {
      this.close();
      this.onSubmit(prompt);
    } else {
      new Notice('Please enter a prompt');
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
