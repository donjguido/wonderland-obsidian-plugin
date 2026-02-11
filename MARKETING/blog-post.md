# Blog Post: How I Built an AI-Powered Knowledge Garden

**Suggested platforms:** Dev.to, Medium, personal blog, Hashnode
**Target length:** 1,500-2,000 words
**Tone:** Technical but accessible, personal story

---

# How I Built an AI-Powered Knowledge Garden with Obsidian

*An experiment in using AI to reduce friction in evergreen note-taking*

---

## The Problem: A Vault Full of Good Intentions

I've been using Obsidian for years. I love the idea of a densely linked knowledge base where ideas connect and compound over time. I'd read about Andy Matuschak's evergreen notes, Nick Milo's linking strategies, and Sönke Ahrens' Zettelkasten method.

But I had a problem: my vault was full of broken links.

Every time I wrote a note, I'd identify concepts worth exploring. I'd create `[[placeholder links]]` with good intentions. "I'll write that note later," I'd tell myself.

I rarely did.

The friction of starting a new note from scratch—deciding how to frame it, what to include, finding the right words—was just high enough that I'd skip it. My vault became a graveyard of ideas I meant to explore.

I started wondering: what if AI could draft those notes for me?

---

## The Experiment: Wonderland

I built an Obsidian plugin called **Wonderland** to test this idea. The concept is simple:

1. Ask a question or topic
2. AI generates an atomic, concept-oriented note with links to related ideas
3. Click any unresolved link → AI generates that note too
4. Keep exploring as deep as you want

The name comes from Alice in Wonderland—the experience of clicking a link and watching a new note appear felt like falling down a rabbit hole.

---

## The Technical Journey

### Choosing the Architecture

I wanted Wonderland to work with multiple AI providers. People have different preferences: some want GPT-4's capabilities, others prefer Claude's style, and many want Ollama for free local AI.

I built an abstraction layer that handles:
- OpenAI's API format
- Anthropic's slightly different API
- Ollama's local endpoint
- Any OpenAI-compatible custom endpoint

The plugin stores your API key locally (never sent anywhere except your AI provider) and makes direct API calls.

### The Note Generation Challenge

The hardest part wasn't the AI integration—it was making the generated notes *good*.

My first attempts produced notes that felt like encyclopedia articles: comprehensive but sterile. They lacked the voice and connections that make evergreen notes valuable.

I iterated on the system prompt extensively:

```
You are an expert at creating Evergreen Notes following Andy Matuschak's methodology.

PRINCIPLES:
1. ATOMIC: Each note addresses ONE concept fully
2. CONCEPT-ORIENTED: Title should be a clear concept statement, not a question
3. DENSELY LINKED: Include [[wikilinks]] to related concepts
4. PERSONAL VOICE: Write as if explaining to yourself, but publishable
```

The key insight was asking for **concept-oriented titles**. Instead of "Spaced Repetition," the AI generates "Spaced repetition enhances long-term memory." This forces atomic thinking—each note makes a claim rather than covering a topic.

### The Link Generation Problem

I wanted the AI to create links that were genuinely worth exploring—not just keyword links, but substantial concepts that deserved their own notes.

The trick was being explicit:

```
PLACEHOLDER LINKS:
- Create [[links]] to concepts that are substantial enough for their own note
- Choose concept-oriented names (e.g., [[Spaced repetition enhances long-term memory]] not [[spaced repetition]])
- Only link concepts that would genuinely benefit from deeper exploration
```

I also added "Down the rabbit hole" suggestions at the end of each note—intriguing concepts that invite further exploration. These became one of the most-used features.

### Handling Click-to-Generate

The magic of Wonderland is clicking a link and having the note appear. But Obsidian's default behavior creates an empty note when you click an unresolved link.

I had to intercept this:

1. Listen for file creation events
2. Track which "Wonderland folder" the user was working in
3. If an empty note is created from a link click, generate content for it
4. Move the note to the correct Wonderland folder if needed

This involved some tricky state management—tracking the "last active Wonderland" so notes created from link clicks go to the right place.

### Per-Folder Customization

I wanted different knowledge domains to have different AI behaviors. My cooking notes should generate recipes; my philosophy notes should generate analytical essays.

Each "Wonderland folder" can have:
- Custom instructions ("Generate notes as step-by-step recipes")
- Folder goals (learning, research, creative, action-oriented)
- Different organization settings
- Separate enrichment rules

This turned out to be essential. A one-size-fits-all AI voice doesn't work for diverse knowledge bases.

---

## What I Learned

### The Value Is in Reducing Friction

The most impactful feature isn't the quality of AI writing—it's the removal of friction. When generating a linked note takes one click instead of 15 minutes, I actually follow through on my curiosity.

I've written more notes in the past month than the previous six months combined.

### AI Notes Are Drafts, Not Finals

I still edit every note. I add my own insights, verify accuracy, and adjust the voice. The AI gives me a starting point; I make it mine.

This is important: Wonderland isn't about replacing thinking. It's about removing the activation energy so I actually *start* thinking.

### Unexpected Connections

The AI frequently surfaces connections I wouldn't have made. When exploring "Why do we dream?", it linked to concepts like "Memory consolidation during sleep" and "The role of REM in emotional processing."

These weren't obvious to me, but they led to genuinely interesting explorations.

### The Danger of Infinite Exploration

It's easy to keep clicking and generating without ever *processing*. I had to develop discipline: explore for a session, then step back and review, edit, and connect.

Wonderland is a tool for exploration, not a replacement for reflection.

---

## Technical Stack

For those interested in the implementation:

- **Language:** TypeScript
- **Build:** esbuild
- **API:** Obsidian Plugin API
- **AI:** Direct API calls to OpenAI/Anthropic/Ollama
- **State:** Local plugin settings in vault

The codebase is open source: [github.com/donjguido/evergreen-ai-obsidian](https://github.com/donjguido/evergreen-ai-obsidian)

---

## Try It Yourself

Wonderland is available now:
- **Community Plugins:** Search "Wonderland" (pending approval)
- **Manual Install:** Download from [GitHub Releases](https://github.com/donjguido/evergreen-ai-obsidian/releases)

### Quick Start
1. Install the plugin
2. Add your OpenAI/Anthropic API key (or set up Ollama)
3. Create a Wonderland folder
4. Click the 🐰 ribbon icon and ask a question
5. Start exploring

### Privacy
Your notes stay on your device. Only prompts go to your AI provider. No analytics, no telemetry.

---

## What's Next

I'm continuing to develop Wonderland based on feedback. On the roadmap:
- Knowledge graph visualization
- Exploration history
- Better backlink maintenance
- Export/share Wonderlands

If you try it, I'd love to hear what works and what doesn't. The best tools are shaped by their users.

---

*Happy exploring. 🐰*

---

## Meta Notes for Publishing

**Tags:** #obsidian #pkm #ai #note-taking #productivity #typescript #plugin-development

**SEO Keywords:** Obsidian plugin, AI note-taking, evergreen notes, knowledge management, Zettelkasten, linked notes

**Call to Action:** Star the GitHub repo, try the plugin, share feedback

**Cross-post to:**
- Dev.to (developer audience)
- Medium (broader audience)
- Hacker News (Show HN - built this)
- Personal blog (canonical)
