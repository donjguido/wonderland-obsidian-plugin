# Reddit Post: r/PKM

## Title Options:
1. "I built an AI assistant for knowledge exploration - click any link and it writes the note"
2. "Wonderland: My attempt to solve the 'notes I'll write later' problem"
3. "An Obsidian plugin that lets you chase curiosity endlessly - AI generates linked notes as you explore"

---

## Post Body:

Does anyone else have a graveyard of `[[broken links]]` in their PKM system? Notes you meant to write but never got around to?

I built an Obsidian plugin to solve this for myself, and I want to share it with the PKM community.

### The Problem

My knowledge management workflow had a consistent failure mode:
1. Write a note about something interesting
2. Realize I should link to related concepts
3. Create `[[placeholder links]]` with good intentions
4. Never write those notes
5. End up with a vault full of dead ends

The friction of starting a new note from scratch was just high enough that I'd skip it.

### The Solution: Wonderland

Wonderland uses AI to generate notes as you explore. The workflow:

1. **Start anywhere**: Enter a question, topic, or just click a broken link
2. **AI generates a note** following evergreen note principles (atomic, concept-oriented, densely linked)
3. **Click any `[[link]]`** in the generated note → AI creates that note too
4. **Keep going**: Each note ends with "Down the rabbit hole" suggestions for further exploration

It's like having a research assistant who instantly drafts the next note whenever you're curious.

### Why This Works for PKM

**Removes friction**: The hardest part of writing notes is often starting. AI handles the blank page problem.

**Maintains structure**: Notes follow atomic principles - one concept per note, statement-style titles.

**Encourages linking**: Because generating linked notes is effortless, you actually follow through on connections.

**Adapts to domains**: Different folders can have different AI instructions:
- Cooking folder: "Generate recipes with ingredient links"
- Research folder: "Write academic-style analysis with citations"
- Learning folder: "Explain concepts with examples and analogies"

### Features

- **Multiple AI providers**: OpenAI, Claude, Ollama (free, local), custom endpoints
- **Per-folder settings**: Each knowledge domain can have unique instructions
- **Auto-organization**: AI can organize notes into thematic subfolders
- **Knowledge enrichment**: Update old notes with insights from new ones
- **Rabbit Holes Index**: See all unexplored paths in one dashboard
- **Mobile**: Works on iOS/Android

### Not a Replacement for Thinking

Important caveat: AI-generated notes are drafts, not final products. I still:
- Read and verify the content
- Add my own insights and connections
- Edit for accuracy and voice
- Delete notes that don't add value

The AI accelerates exploration; it doesn't replace understanding.

### Try It

- **GitHub**: https://github.com/donjguido/evergreen-ai-obsidian
- **Community Plugins**: Search "Wonderland" (pending approval)
- **Privacy**: Your notes stay local. Only prompts go to your AI provider.

Would love to hear how others approach the "notes I'll write later" problem. What's worked for you?

---

## Engagement Strategy:
- Ask a question to encourage discussion
- Acknowledge limitations honestly
- Focus on the workflow problem, not just features
- Invite feedback and alternative approaches
