# Obsidian Discord: Plugin Showcase Script

## Channel: #plugin-showcase (or #plugin-dev)

---

## Message 1: Introduction

🐰 **Introducing Wonderland** - AI-powered knowledge exploration

I just released my first Obsidian plugin! Wonderland generates linked notes as you explore - click any `[[wikilink]]` and AI creates the note instantly.

**The core idea:** Remove the friction between "I should write a note about X" and actually having that note.

---

## Message 2: Demo GIF/Video

[Attach GIF showing]:
1. Opening Enter Wonderland modal
2. Typing a question
3. Note being generated with links
4. Clicking a link
5. New note auto-generating

Caption: *The rabbit hole in action*

---

## Message 3: Key Features

**What it does:**
- 🔗 Click any unresolved link → AI generates the note
- 📁 Per-folder "Wonderlands" with custom instructions
- 🎯 Folder goals (learning, research, creative, action-oriented)
- 📊 Rabbit Holes Index - see all unexplored paths
- 🔄 Knowledge enrichment from related notes
- 📱 Mobile support (iOS/Android)

**AI Providers:**
- OpenAI (GPT-4, GPT-4o-mini)
- Anthropic (Claude)
- Ollama (local, free)
- Any OpenAI-compatible endpoint

---

## Message 4: Links

📦 **Install:**
- Community Plugins: "Wonderland" (pending approval)
- Manual: https://github.com/donjguido/evergreen-ai-obsidian/releases

📖 **Docs:** https://github.com/donjguido/evergreen-ai-obsidian

🔒 **Privacy:** Notes stay local. Only prompts go to your AI provider.

---

## Message 5: Call to Action

Looking for feedback on v1.0.0! Let me know:
- What features would be useful?
- Any bugs?
- How does it fit your workflow?

Happy to answer questions! 🐰

---

## Follow-up Responses to Prepare:

**"How is this different from [other AI plugin]?"**
> Wonderland focuses on the exploration workflow - the magic is clicking links and having notes appear instantly. It's built around evergreen note methodology with atomic, concept-oriented notes.

**"Does it work with Ollama?"**
> Yes! Ollama works great on desktop. Just set your endpoint (usually localhost:11434) and model name. Completely free and private.

**"What about mobile?"**
> Works on iOS and Android with cloud providers (OpenAI, Claude). Ollama doesn't work on mobile since it requires localhost.

**"How much does it cost?"**
> The plugin is free. AI costs depend on your provider - GPT-4o-mini is typically <$0.01 per note. Ollama is completely free.

**"Can I use it with my existing notes?"**
> Yes! It only generates in folders you designate as "Wonderlands." Your existing notes are untouched unless you use the enrichment feature.
