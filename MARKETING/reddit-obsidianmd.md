# Reddit Post: r/ObsidianMD

## Title Options (pick one):
1. "I built Wonderland - an AI plugin that generates linked notes on click, letting you chase curiosity endlessly"
2. "Wonderland: Click any [[link]] and watch AI generate the note instantly - my new plugin for knowledge exploration"
3. "After months of work, I'm releasing Wonderland - AI-powered evergreen notes that expand as you explore"

---

## Post Body:

Hey r/ObsidianMD!

I've been working on a plugin called **Wonderland** that changes how I explore ideas in Obsidian, and I'm excited to share it with you.

### The Problem I Was Solving

I love the idea of building a linked knowledge base, but I kept running into the same friction: I'd write a note, add `[[placeholder links]]` to concepts I wanted to explore later... and then never get around to writing them. My vault was full of broken links and good intentions.

### What Wonderland Does

Wonderland uses AI to generate notes as you explore. Here's the workflow:

1. **Enter Wonderland** - Ask any question or topic (click the 🐰 ribbon icon)
2. **AI generates a note** with `[[wikilinks]]` to related concepts
3. **Click any link** - Wonderland automatically generates that note too
4. **Each note ends with "Down the rabbit hole"** - more concepts to explore

It's like having a research assistant who instantly writes the next note whenever you're curious about something.

### Key Features

- **Multiple AI providers**: OpenAI, Anthropic (Claude), Ollama (local), or custom endpoints
- **Per-folder Wonderlands**: Different folders can have different AI instructions (e.g., "generate recipes with ingredient links" vs "write academic-style analysis")
- **Folder goals**: Optimize for learning, action-oriented content, critical reflection, research, or creative exploration
- **Auto-organization**: AI can organize notes into thematic subfolders
- **Knowledge enrichment**: Enrich existing notes with insights from related notes
- **Rabbit Holes Index**: See all unexplored links in one place
- **Mobile support**: Works on iOS and Android (with cloud AI providers)

### Demo

[Include GIF/video here showing the workflow]

### Privacy

Your notes stay on your device. The only data sent anywhere is your prompts to your AI provider. No analytics, no telemetry. [Full privacy policy](https://github.com/donjguido/evergreen-ai-obsidian/blob/master/PRIVACY.md)

### Installation

**Community Plugins** (pending approval): Search "Wonderland"

**Manual**: Download from [GitHub Releases](https://github.com/donjguido/evergreen-ai-obsidian/releases)

### Looking for Feedback

This is v1.0.0 and I'd love to hear:
- What features would make this more useful for you?
- Any bugs or issues?
- How does it fit into your workflow?

If you find it useful, there's a [Ko-fi](https://ko-fi.com/donjguido) if you want to support development.

Happy exploring! 🐰

---

## Comments to Pre-Write:

**For questions about API costs:**
> The plugin uses your own API key, so costs depend on your usage. With GPT-4o-mini, generating a note typically costs less than $0.01. You can also use Ollama for completely free local AI.

**For questions about privacy:**
> Nothing is collected or sent anywhere except your prompts to your AI provider. Your notes, settings, and API key all stay local. The plugin is fully open source if you want to audit the code.

**For "how is this different from X" questions:**
> [Adjust based on the plugin mentioned] Wonderland focuses specifically on the exploration workflow - the magic is in clicking links and having notes appear. It's designed around the evergreen notes methodology where each note is atomic and concept-oriented.
