# Contributing to Wonderland

Thank you for your interest in contributing to Wonderland! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/evergreen-ai-obsidian.git
   cd evergreen-ai-obsidian
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- An Obsidian vault for testing

### Building

```bash
# Build for production
npm run build

# Watch mode for development
npm run dev
```

### Testing in Obsidian

1. Build the plugin
2. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/wonderland/` folder
3. Reload Obsidian (Ctrl/Cmd + R)
4. Enable the plugin in Settings → Community Plugins

## Project Structure

```
src/
├── main.ts           # Plugin entry point, commands, event handlers
├── settings.ts       # Settings UI and configuration
├── types.ts          # TypeScript type definitions
├── ai/
│   ├── providers.ts  # AI provider implementations
│   └── embeddings.ts # Embedding functionality
└── prompts/
    └── evergreenNote.ts  # AI prompts for note generation
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and atomic

## Submitting Changes

### Pull Request Process

1. **Update documentation** if you're adding new features
2. **Test thoroughly** in Obsidian before submitting
3. **Write clear commit messages** describing your changes
4. **Create a pull request** with:
   - A clear title describing the change
   - Description of what the PR does
   - Any related issue numbers

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add custom instructions per Wonderland folder
fix: prevent generation for Untitled notes
docs: update README with new features
refactor: simplify organization logic
```

## Types of Contributions

### Bug Fixes

- Check existing issues first to avoid duplicates
- Include steps to reproduce the bug
- Reference the issue number in your PR

### New Features

- Open an issue first to discuss the feature
- Explain the use case and benefits
- Consider backward compatibility

### Documentation

- Fix typos or unclear explanations
- Add examples or use cases
- Improve setup instructions

### Translations

- Help translate the plugin to other languages
- Maintain consistency with existing translations

## Feature Ideas

Looking for ways to contribute? Here are some ideas from our roadmap:

- Knowledge graph visualization
- Exploration history tracking
- Backlink maintenance
- Export/share Wonderlands
- Additional AI providers

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Wonderland better!
