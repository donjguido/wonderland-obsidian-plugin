# Wonderland - Obsidian Plugin

> Go down the rabbit hole of knowledge.

Wonderland is an AI-powered Obsidian plugin that transforms how you explore ideas. Ask a question, and watch as linked notes appear with doorways to even deeper explorations. Each note generates new rabbit holes to follow, letting you chase curiosity endlessly.

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Development-ff5f5f?logo=ko-fi)](https://ko-fi.com/donjguido)

![Wonderland Demonstration](https://github.com/user-attachments/assets/5f8ab3a7-ce10-4d7e-87a7-f0752cd74e5b)

## Features

### The Rabbit Hole Experience

- **Enter Wonderland**: Start with any question or topic
- **Linked Doorways**: AI creates `[[wikilinks]]` to concepts waiting to be explored
- **Auto-Exploration**: Click any link and watch the knowledge unfold automatically
- **Down the Rabbit Hole**: Each note ends with intriguing concepts that lead deeper
- **Multi-Provider Support**: Works with OpenAI, Anthropic (Claude), Ollama (local), or custom endpoints

<img width="1914" height="1016" alt="Screenshot_Down_the_Rabbit_Hole" src="https://github.com/user-attachments/assets/c2e56e62-4b9a-446c-a4cb-3c2b37ee6ff6" />

### Multiple Wonderlands

Create separate knowledge gardens for different domains:
- **Cooking Wonderland**: Step-by-step recipes with ingredient links
- **Philosophy Wonderland**: Deep explorations of ideas and thinkers
- **Tech Wonderland**: Technical concepts with code examples
- Each folder can have its own custom instructions for the AI

<img width="797" height="398" alt="image" src="https://github.com/user-attachments/assets/c0eec683-c2a8-4c05-b1e1-ff97bf9a063f" />


### Smart Organization

- **Auto-Organize**: Let AI organize notes into thematic subfolders
- **Organize on Schedule**: Reorganize every X hours
- **Organize on Note Count**: Reorganize after every X new notes
- **Per-Folder Settings**: Each Wonderland can have different organization rules

<img width="346" height="354" alt="image" src="https://github.com/user-attachments/assets/6cdfd630-e675-45a2-bfe9-85b7e8c69a56" />
<img width="348" height="323" alt="image" src="https://github.com/user-attachments/assets/12c1515c-e4e7-4423-8a36-651937cd466c" />


### Rabbit Holes Index

Never lose track of unexplored paths:
- Auto-generated index of all unresolved links in your Wonderland
- See which concepts are waiting to be explored
- Grouped thematically for easy navigation
- Updates automatically as you explore

<img width="755" height="831" alt="image" src="https://github.com/user-attachments/assets/59dbe80c-3696-4f53-841a-b7763d3f0b5c" />


### Knowledge Enrichment

- **Update from Vault**: Enrich existing notes with insights from related notes
- **Append or Integrate**: Choose how new discoveries are added
- **Semantic Search**: Uses embeddings to find truly related content

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Settings → Community Plugins
2. Search for "Wonderland"
3. Click Install, then Enable

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder: `<vault>/.obsidian/plugins/wonderland/`
3. Copy the files into that folder
4. Enable the plugin in Obsidian Settings → Community Plugins

### From Source

```bash
git clone https://github.com/donjguido/evergreen-ai-obsidian.git
cd evergreen-ai-obsidian
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder.

## Configuration

### Quick Start

1. Open Settings → Wonderland
2. Select your AI provider (OpenAI, Anthropic, Ollama, or Custom)
3. Enter your API key (not needed for Ollama)
4. Choose your preferred model
5. Add a Wonderland folder (click "Add Wonderland Folder")

<img width="847" height="544" alt="image" src="https://github.com/user-attachments/assets/b4997e2d-f239-49de-93cb-3a6813d9c352" />


### AI Provider Setup

| Provider | API Key Required | Models |
|----------|------------------|--------|
| OpenAI | Yes | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo |
| Anthropic | Yes | claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku |
| Ollama | No (local) | Any installed model (llama3.2, mistral, etc.) |
| Custom | Depends | Any OpenAI-compatible endpoint |

### Wonderland Folder Settings

Each Wonderland folder can be configured independently:

- **Custom Instructions**: Special guidelines for the AI (e.g., "generate notes as step-by-step recipes")
- **Auto-Generate on Open**: Automatically generate content when opening empty links
- **Auto-Organize**: Organize notes into subfolders based on themes
- **Organize Interval**: How often to reorganize (hourly, daily, etc.)
- **Organize on Note Count**: Reorganize after X new notes
- **Rabbit Holes Index**: Generate an index of all unexplored links

![Wonderland_Settings_Demo](https://github.com/user-attachments/assets/8161ea10-98ca-4fb5-a1f1-a768f2ebbbcd)

## Usage

### Enter Wonderland

1. Click the rabbit icon in the ribbon, or
2. Use command palette: `Wonderland: Enter Wonderland - explore a topic`
3. Enter your question or topic
4. Select which Wonderland folder to use
5. Watch the knowledge unfold with linked doorways

<img width="566" height="317" alt="image" src="https://github.com/user-attachments/assets/0c2a0bf4-6f50-4d69-b496-66ac7267da12" />


### Explore from Selection

1. Select text in any note
2. Use command palette: `Wonderland: Go down the rabbit hole with selection`
3. A new note expands on your selected text

### Follow the Links

When you see a `[[link]]` to an unexplored concept:
1. Click it
2. A new note opens and generates content automatically
3. Each note offers more rabbit holes to explore

![Click_to_Note_Demo](https://github.com/user-attachments/assets/ea3f4fe2-1861-445e-9d52-29c416c960a7)


### Down the Rabbit Hole

Every generated note ends with a "Down the rabbit hole" section containing clickable concepts. Each concept is a doorway to deeper exploration - just click to keep going!

### Update from Vault

Enrich existing notes with insights from your knowledge base:
1. Open a note you want to enrich
2. Use command palette: `Wonderland: Update note from vault knowledge`
3. Choose "Append" (add new section) or "Integrate" (seamlessly weave in)

### Generate Rabbit Holes Index

See all unexplored paths in your Wonderland:
1. Use command palette: `Wonderland: Generate Rabbit Holes Index`
2. Select which Wonderland folder
3. An index note is created showing all unresolved links

### Organize Wonderland

Manually trigger organization:
1. Use command palette: `Wonderland: Organize Wonderland folder`
2. Select which folder to organize
3. AI creates thematic subfolders and moves notes

## Philosophy

Wonderland follows the [evergreen notes](https://notes.andymatuschak.org/Evergreen_notes) methodology:

- **Atomic**: One concept per note
- **Concept-oriented**: Titles are statements, not topics
- **Densely linked**: Notes connect to related ideas
- **Curiosity-driven**: Each exploration opens new paths

## Commands

| Command | Description |
|---------|-------------|
| Enter Wonderland | Start a new exploration with a question |
| Go down the rabbit hole with selection | Explore selected text |
| Generate for current note | Generate content for the current note |
| Update note from vault knowledge | Enrich note with related insights |
| Organize Wonderland folder | Organize notes into subfolders |
| Generate Rabbit Holes Index | Create index of unexplored links |

## Tips

- **Start Broad**: Begin with big questions, let the rabbit holes lead to specifics
- **Trust the Links**: The AI suggests links it thinks deserve exploration
- **Use Custom Instructions**: Tailor each Wonderland to your learning style
- **Check the Index**: Periodically review your Rabbit Holes Index for inspiration
- **Let it Grow**: The best knowledge bases emerge organically through exploration

## Roadmap

- [x] Multiple Wonderland folders
- [x] Custom instructions per folder
- [x] Rabbit Holes Index
- [x] Note count-based organization
- [ ] Knowledge graph visualization
- [ ] Exploration history
- [ ] Backlink maintenance
- [ ] Export/share Wonderlands

## Support Development

If Wonderland helps you explore ideas, consider supporting development:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20me%20a%20coffee-ff5f5f?logo=ko-fi&logoColor=white)](https://ko-fi.com/donjguido)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Development

```bash
# Clone the repository
git clone https://github.com/donjguido/evergreen-ai-obsidian.git
cd evergreen-ai-obsidian

# Install dependencies
npm install

# Build for production
npm run build

# Watch mode for development
npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

**donjguido** - [GitHub](https://github.com/donjguido)

---

*"Curiouser and curiouser!" - Alice*
