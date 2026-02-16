/**
 * Mock for Obsidian module - provides test doubles for Obsidian API
 */

// Platform mock
export const Platform = {
  isMobile: false,
  isDesktop: true,
  isDesktopApp: true,
  isMacOS: process.platform === 'darwin',
  isWin: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  isIosApp: false,
  isAndroidApp: false,
  isSafari: false,
};

// Mock requestUrl for API calls
export const requestUrl = jest.fn().mockImplementation(async (options: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) => {
  // Default mock response
  return {
    status: 200,
    json: {
      choices: [{ message: { content: 'Mock AI response' } }],
      model: 'mock-model',
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    },
    text: 'Mock AI response',
    headers: {},
  };
});

// TFile mock
export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  parent: TFolder | null;

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.basename = this.name.replace(/\.[^.]+$/, '');
    this.extension = this.name.includes('.') ? this.name.split('.').pop() || '' : '';
    this.parent = null;
  }
}

// TFolder mock
export class TFolder {
  path: string;
  name: string;
  children: (TFile | TFolder)[];

  constructor(path: string) {
    this.path = path;
    this.name = path.split('/').pop() || '';
    this.children = [];
  }
}

// App mock
export class App {
  vault: Vault;
  workspace: Workspace;
  metadataCache: MetadataCache;
  fileManager: FileManager;

  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
    this.metadataCache = new MetadataCache();
    this.fileManager = new FileManager();
  }
}

// Vault mock
export class Vault {
  private files: Map<string, string> = new Map();

  async read(file: TFile): Promise<string> {
    return this.files.get(file.path) || '';
  }

  async modify(file: TFile, content: string): Promise<void> {
    this.files.set(file.path, content);
  }

  async create(path: string, content: string): Promise<TFile> {
    this.files.set(path, content);
    return new TFile(path);
  }

  async createFolder(path: string): Promise<void> {
    // Mock folder creation
  }

  getAbstractFileByPath(path: string): TFile | TFolder | null {
    if (this.files.has(path)) {
      return new TFile(path);
    }
    return null;
  }

  getMarkdownFiles(): TFile[] {
    return Array.from(this.files.keys())
      .filter(path => path.endsWith('.md'))
      .map(path => new TFile(path));
  }

  getAllLoadedFiles(): (TFile | TFolder)[] {
    return Array.from(this.files.keys()).map(path => new TFile(path));
  }

  on(event: string, callback: (...args: unknown[]) => void): { unload: () => void } {
    return { unload: () => {} };
  }
}

// Workspace mock
export class Workspace {
  private activeFile: TFile | null = null;

  getActiveFile(): TFile | null {
    return this.activeFile;
  }

  setActiveFile(file: TFile | null): void {
    this.activeFile = file;
  }

  getLeaf(): WorkspaceLeaf {
    return new WorkspaceLeaf();
  }

  on(event: string, callback: (...args: unknown[]) => void): { unload: () => void } {
    return { unload: () => {} };
  }
}

// WorkspaceLeaf mock
export class WorkspaceLeaf {
  async openFile(file: TFile): Promise<void> {
    // Mock opening file
  }
}

// MetadataCache mock
export class MetadataCache {
  getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
    return null;
  }
}

// FileManager mock
export class FileManager {
  async renameFile(file: TFile, newPath: string): Promise<void> {
    // Mock file rename
  }
}

// Plugin mock
export class Plugin {
  app: App;
  manifest: PluginManifest;

  constructor(app: App, manifest: PluginManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<unknown> {
    return {};
  }

  async saveData(data: unknown): Promise<void> {
    // Mock save
  }

  addCommand(command: Command): Command {
    return command;
  }

  addRibbonIcon(icon: string, title: string, callback: () => void): HTMLElement {
    return document.createElement('div');
  }

  addSettingTab(tab: PluginSettingTab): void {
    // Mock add setting tab
  }

  registerEvent(event: { unload: () => void }): void {
    // Mock register event
  }

  registerDomEvent(
    el: HTMLElement | Document,
    event: string,
    callback: (evt: Event) => void,
    options?: { capture?: boolean }
  ): void {
    // Mock DOM event registration
  }
}

// PluginManifest type
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl?: string;
  isDesktopOnly?: boolean;
}

// Command type
export interface Command {
  id: string;
  name: string;
  callback?: () => void;
  editorCallback?: (editor: Editor) => void;
}

// Editor mock
export class Editor {
  private content: string = '';
  private selection: string = '';

  getSelection(): string {
    return this.selection;
  }

  setSelection(text: string): void {
    this.selection = text;
  }

  getValue(): string {
    return this.content;
  }

  setValue(content: string): void {
    this.content = content;
  }
}

// PluginSettingTab mock
export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display(): void {
    // Mock display
  }

  hide(): void {
    // Mock hide
  }
}

// Modal mock
export class Modal {
  app: App;
  contentEl: HTMLElement;

  constructor(app: App) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }

  open(): void {
    // Mock open
  }

  close(): void {
    // Mock close
  }

  onOpen(): void {
    // Override in subclass
  }

  onClose(): void {
    // Override in subclass
  }
}

// Notice mock
export class Notice {
  message: string;

  constructor(message: string, timeout?: number) {
    this.message = message;
  }

  hide(): void {
    // Mock hide
  }
}

// Setting mock
export class Setting {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    this.infoEl = document.createElement('div');
    this.nameEl = document.createElement('div');
    this.descEl = document.createElement('div');
    this.controlEl = document.createElement('div');
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    this.nameEl.textContent = name;
    return this;
  }

  setDesc(desc: string): this {
    this.descEl.textContent = desc;
    return this;
  }

  addText(cb: (text: TextComponent) => void): this {
    cb(new TextComponent(this.controlEl));
    return this;
  }

  addDropdown(cb: (dropdown: DropdownComponent) => void): this {
    cb(new DropdownComponent(this.controlEl));
    return this;
  }

  addToggle(cb: (toggle: ToggleComponent) => void): this {
    cb(new ToggleComponent(this.controlEl));
    return this;
  }

  addButton(cb: (button: ButtonComponent) => void): this {
    cb(new ButtonComponent(this.controlEl));
    return this;
  }

  addSlider(cb: (slider: SliderComponent) => void): this {
    cb(new SliderComponent(this.controlEl));
    return this;
  }

  addTextArea(cb: (textArea: TextAreaComponent) => void): this {
    cb(new TextAreaComponent(this.controlEl));
    return this;
  }
}

// Component mocks
export class TextComponent {
  inputEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement('input');
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

export class DropdownComponent {
  selectEl: HTMLSelectElement;

  constructor(containerEl: HTMLElement) {
    this.selectEl = document.createElement('select');
    containerEl.appendChild(this.selectEl);
  }

  addOption(value: string, display: string): this {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = display;
    this.selectEl.appendChild(option);
    return this;
  }

  setValue(value: string): this {
    this.selectEl.value = value;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

export class ToggleComponent {
  toggleEl: HTMLElement;
  private value: boolean = false;

  constructor(containerEl: HTMLElement) {
    this.toggleEl = document.createElement('div');
    containerEl.appendChild(this.toggleEl);
  }

  setValue(value: boolean): this {
    this.value = value;
    return this;
  }

  onChange(callback: (value: boolean) => void): this {
    return this;
  }
}

export class ButtonComponent {
  buttonEl: HTMLButtonElement;

  constructor(containerEl: HTMLElement) {
    this.buttonEl = document.createElement('button');
    containerEl.appendChild(this.buttonEl);
  }

  setButtonText(text: string): this {
    this.buttonEl.textContent = text;
    return this;
  }

  setCta(): this {
    return this;
  }

  onClick(callback: () => void): this {
    return this;
  }
}

export class SliderComponent {
  sliderEl: HTMLInputElement;

  constructor(containerEl: HTMLElement) {
    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
    containerEl.appendChild(this.sliderEl);
  }

  setLimits(min: number, max: number, step: number): this {
    this.sliderEl.min = String(min);
    this.sliderEl.max = String(max);
    this.sliderEl.step = String(step);
    return this;
  }

  setValue(value: number): this {
    this.sliderEl.value = String(value);
    return this;
  }

  setDynamicTooltip(): this {
    return this;
  }

  onChange(callback: (value: number) => void): this {
    return this;
  }
}

export class TextAreaComponent {
  inputEl: HTMLTextAreaElement;

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement('textarea');
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    return this;
  }
}

// MarkdownView mock
export class MarkdownView {
  file: TFile | null = null;
  editor: Editor;

  constructor() {
    this.editor = new Editor();
  }

  getViewType(): string {
    return 'markdown';
  }
}

// Export additional types that may be needed
export type ViewStateResult = unknown;
export type EventRef = { unload: () => void };
