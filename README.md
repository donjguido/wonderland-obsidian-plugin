# Evergreen AI - Obsidian Plugin

An AI-powered Obsidian plugin that transforms how you build knowledge. Instead of chat responses, AI creates **evergreen notes** with placeholder links that generate content on-demand.

## Features

- **AI → Evergreen Notes**: Prompts generate atomic, concept-oriented notes following Andy Matuschak's methodology
- **Placeholder Links**: AI creates `[[wikilinks]]` to concepts that don't exist yet
- **On-Click Generation**: Click a placeholder link and watch the note draft before your eyes
- **Multi-Provider Support**: Works with OpenAI, Anthropic (Claude), Ollama (local), or custom endpoints
- **Streaming Output**: Content streams in with a smooth drafting animation
- **Knowledge Graph Ready**: Built to support backlinks and organization suggestions

## Installation

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder: `<vault>/.obsidian/plugins/evergreen-ai/`
3. Copy the files into that folder
4. Enable the plugin in Obsidian Settings → Community Plugins

### From Source

```bash
git clone https://github.com/YOUR_USERNAME/evergreen-ai-obsidian.git
cd evergreen-ai-obsidian
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder.

## Configuration

1. Open Settings → Evergreen AI
2. Select your AI provider (OpenAI, Anthropic, Ollama, or Custom)
3. Enter your API key (not needed for Ollama)
4. Choose your preferred model
5. Set the folder where notes will be saved

## Usage

### Generate from Prompt

1. Click the leaf icon in the ribbon, or
2. Use command palette: "Generate evergreen note from prompt"
3. Enter your question or topic
4. Watch the note generate with placeholder links

### Generate from Selection

1. Select text in any note
2. Use command palette: "Generate evergreen note from selection"
3. A new note expands on your selected text

### Click Placeholder Links

When you see a `[[link]]` with a ✨ indicator:
1. Click it
2. A new note opens and drafts before your eyes
3. The AI uses context from the source note

## Evergreen Notes Methodology

This plugin follows Andy Matuschak's evergreen notes principles:

- **Atomic**: One concept per note
- **Concept-oriented**: Titles are statements, not topics
- **Densely linked**: Notes connect to related ideas
- **Personal voice**: Written for yourself, but publishable

## Roadmap

- [ ] Knowledge graph service with semantic similarity
- [ ] Organization suggestions (merge, split, link notes)
- [ ] Suggestions sidebar
- [ ] Backlink maintenance
- [ ] Graph view integration

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch mode for development
npm run dev
```

## License

MIT
