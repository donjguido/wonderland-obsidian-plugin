# Reddit Post: r/Zettelkasten

## Title Options:
1. "Using AI to reduce friction in creating evergreen notes - my new Obsidian plugin"
2. "Wonderland: An experiment in AI-assisted atomic note creation"
3. "I built a tool that generates linked evergreen notes on click - here's what I learned about the Zettelkasten workflow"

---

## Post Body:

I've been practicing Zettelkasten for a while, and one friction point kept slowing me down: **the gap between identifying a concept worth exploring and actually writing the note**.

I'd be writing a permanent note, realize I needed to link to a concept like "spaced repetition enhances long-term memory," create the `[[link]]`... and then face a choice: stop my current flow to write that note, or add it to an ever-growing list of "notes to write later."

Usually, I'd do neither well.

### An Experiment: AI-Assisted Note Generation

I built an Obsidian plugin called **Wonderland** to test an idea: what if AI could draft the initial version of linked notes as you explore?

Here's how it works:
1. Start with a question or concept
2. AI generates an atomic, concept-oriented note with `[[wikilinks]]` to related ideas
3. Click any unresolved link → AI generates that note too
4. Each note suggests more concepts to explore ("Down the rabbit hole")

The AI follows evergreen note principles:
- **Atomic**: One concept per note
- **Concept-oriented**: Titles are statements, not topics ("Spaced repetition enhances long-term memory" not "Spaced repetition")
- **Densely linked**: Notes connect to related ideas

### What I've Learned

**The good:**
- Dramatically reduces the activation energy for creating new notes
- Forces concept-oriented thinking (the AI generates statement-style titles)
- The "Down the rabbit hole" suggestions often surface connections I wouldn't have made
- Great for initial exploration of unfamiliar domains

**The nuanced:**
- AI-generated notes are a starting point, not a final product
- I still edit, refine, and add my own thinking
- It works best when I have a clear question or concept in mind
- Not a replacement for deep reading and processing

**What I'm curious about:**
- How do others feel about AI assistance in Zettelkasten workflows?
- Is the value in the *process* of writing notes, or in *having* the notes?
- Does reducing friction help or hurt the learning that comes from struggle?

### Technical Details

- Works with OpenAI, Claude, Ollama (local), or custom endpoints
- Per-folder settings (different "Wonderlands" for different domains)
- Folder goals: learning, research, creative, action-oriented, or custom
- Open source: [GitHub](https://github.com/donjguido/evergreen-ai-obsidian)

I'd love to hear thoughts from this community. Is AI assistance in note-taking helpful, or does it undermine the cognitive benefits of the Zettelkasten method?

---

## Tone Notes:
- More reflective and philosophical than the ObsidianMD post
- Acknowledge the tension between efficiency and learning
- Invite discussion rather than just promotion
- Position as an experiment, not a solved problem
