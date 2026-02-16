/**
 * Unit tests for prompts
 * Tests prompt generation, formatting, and wrapper functions
 */

import {
  EVERGREEN_NOTE_SYSTEM_PROMPT,
  EVERGREEN_NOTE_USER_PROMPT,
  TITLE_GENERATION_PROMPT,
  RABBIT_HOLE_QUESTIONS_PROMPT,
  ORGANIZE_FOLDER_PROMPT,
  UPDATE_NOTE_APPEND_PROMPT,
  UPDATE_NOTE_INTEGRATE_PROMPT,
  RABBIT_HOLES_INDEX_PROMPT,
  CUSTOM_INSTRUCTIONS_WRAPPER,
  GLOBAL_INSTRUCTIONS_WRAPPER,
  FOLDER_GOAL_PROMPTS,
  FOLDER_GOAL_WRAPPER,
  EXTERNAL_LINKS_PROMPT,
  PERSONALIZED_SUGGESTIONS_PROMPT,
  CLASSIFY_NOTE_PROMPT,
} from '../../src/prompts/evergreenNote';

describe('EVERGREEN_NOTE_SYSTEM_PROMPT', () => {
  it('should contain evergreen note principles', () => {
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('ATOMIC');
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('CONCEPT-ORIENTED');
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('DENSELY LINKED');
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('PERSONAL VOICE');
  });

  it('should mention Andy Matuschak methodology', () => {
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('Andy Matuschak');
  });

  it('should include placeholder links guidelines', () => {
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('PLACEHOLDER LINKS');
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('[[');
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('3-7 meaningful links');
  });

  it('should specify output format', () => {
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('OUTPUT FORMAT');
    expect(EVERGREEN_NOTE_SYSTEM_PROMPT).toContain('Markdown');
  });
});

describe('EVERGREEN_NOTE_USER_PROMPT', () => {
  it('should include the user prompt', () => {
    const result = EVERGREEN_NOTE_USER_PROMPT('What is consciousness?', '', []);
    expect(result).toContain('What is consciousness?');
    expect(result).toContain('Create an evergreen note');
  });

  it('should include context when provided', () => {
    const context = 'Previous note about consciousness';
    const result = EVERGREEN_NOTE_USER_PROMPT('Test', context, []);
    expect(result).toContain('Relevant context');
    expect(result).toContain(context);
  });

  it('should include existing notes when provided', () => {
    const existingNotes = ['Note One', 'Note Two', 'Note Three'];
    const result = EVERGREEN_NOTE_USER_PROMPT('Test', '', existingNotes);
    expect(result).toContain('These notes already exist');
    expect(result).toContain('Note One');
    expect(result).toContain('Note Two');
    expect(result).toContain('Note Three');
  });

  it('should not include context section when context is empty', () => {
    const result = EVERGREEN_NOTE_USER_PROMPT('Test', '', []);
    expect(result).not.toContain('Relevant context');
  });

  it('should not include existing notes section when array is empty', () => {
    const result = EVERGREEN_NOTE_USER_PROMPT('Test', '', []);
    expect(result).not.toContain('These notes already exist');
  });

  it('should remind about placeholder links', () => {
    const result = EVERGREEN_NOTE_USER_PROMPT('Test', '', []);
    expect(result).toContain('placeholder links');
    expect(result).toContain('concept-oriented statements');
  });
});

describe('TITLE_GENERATION_PROMPT', () => {
  it('should specify title requirements', () => {
    expect(TITLE_GENERATION_PROMPT).toContain('60 characters');
    expect(TITLE_GENERATION_PROMPT).toContain('concept-oriented');
    expect(TITLE_GENERATION_PROMPT).toContain('statement or concept');
    expect(TITLE_GENERATION_PROMPT).toContain('not a question');
  });

  it('should request only the title output', () => {
    expect(TITLE_GENERATION_PROMPT).toContain('ONLY the title');
  });
});

describe('RABBIT_HOLE_QUESTIONS_PROMPT', () => {
  it('should specify format requirements', () => {
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('3-4');
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('[[double brackets]]');
  });

  it('should mention no question marks', () => {
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('NOT use question marks');
  });

  it('should specify no introductory text', () => {
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('Do NOT include any introductory text');
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('primer');
  });

  it('should provide examples in correct format', () => {
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('[[The trainability of time perception]]');
    expect(RABBIT_HOLE_QUESTIONS_PROMPT).toContain('[[How dreams shape memory formation]]');
  });
});

describe('ORGANIZE_FOLDER_PROMPT', () => {
  it('should specify folder limits', () => {
    expect(ORGANIZE_FOLDER_PROMPT).toContain('3-7 subfolders');
  });

  it('should specify JSON output format', () => {
    expect(ORGANIZE_FOLDER_PROMPT).toContain('JSON object');
    expect(ORGANIZE_FOLDER_PROMPT).toContain('folder names');
    expect(ORGANIZE_FOLDER_PROMPT).toContain('arrays of note filenames');
  });

  it('should include example output', () => {
    expect(ORGANIZE_FOLDER_PROMPT).toContain('"science"');
    expect(ORGANIZE_FOLDER_PROMPT).toContain('"philosophy"');
    expect(ORGANIZE_FOLDER_PROMPT).toContain('.md"');
  });
});

describe('UPDATE_NOTE_APPEND_PROMPT', () => {
  it('should specify append mode behavior', () => {
    expect(UPDATE_NOTE_APPEND_PROMPT).toContain('New discoveries');
    expect(UPDATE_NOTE_APPEND_PROMPT).toContain('DO NOT modify');
    expect(UPDATE_NOTE_APPEND_PROMPT).toContain('ONLY output the new section');
  });

  it('should mention linking requirements', () => {
    expect(UPDATE_NOTE_APPEND_PROMPT).toContain('[[links]]');
    expect(UPDATE_NOTE_APPEND_PROMPT).toContain('source notes');
  });
});

describe('UPDATE_NOTE_INTEGRATE_PROMPT', () => {
  it('should specify integrate mode behavior', () => {
    expect(UPDATE_NOTE_INTEGRATE_PROMPT).toContain('seamlessly integrating');
    expect(UPDATE_NOTE_INTEGRATE_PROMPT).toContain('Preserve all original content');
    expect(UPDATE_NOTE_INTEGRATE_PROMPT).toContain('one cohesive');
  });

  it('should maintain original voice', () => {
    expect(UPDATE_NOTE_INTEGRATE_PROMPT).toContain('original voice');
    expect(UPDATE_NOTE_INTEGRATE_PROMPT).toContain('structure');
  });
});

describe('RABBIT_HOLES_INDEX_PROMPT', () => {
  it('should describe the index purpose', () => {
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('unexplored paths');
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('unresolved links');
  });

  it('should specify grouping requirements', () => {
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('Group related');
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('thematic sections');
  });

  it('should include example format', () => {
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('🕳️ Deep Rabbit Holes');
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('🐰 Quick Explorations');
    expect(RABBIT_HOLES_INDEX_PROMPT).toContain('🔗 Connections to Make');
  });
});

describe('CLASSIFY_NOTE_PROMPT', () => {
  it('should describe classification task', () => {
    expect(CLASSIFY_NOTE_PROMPT).toContain('classifying a new note');
    expect(CLASSIFY_NOTE_PROMPT).toContain('most appropriate');
  });

  it('should specify output format', () => {
    expect(CLASSIFY_NOTE_PROMPT).toContain('uncategorized');
    expect(CLASSIFY_NOTE_PROMPT).toContain('folder name');
    expect(CLASSIFY_NOTE_PROMPT).toContain('nothing else');
  });
});

describe('CUSTOM_INSTRUCTIONS_WRAPPER', () => {
  it('should wrap base prompt with custom instructions', () => {
    const basePrompt = 'Base prompt content';
    const customInstructions = 'Generate notes in haiku format';

    const result = CUSTOM_INSTRUCTIONS_WRAPPER(customInstructions, basePrompt);

    expect(result).toContain(basePrompt);
    expect(result).toContain('SPECIAL INSTRUCTIONS');
    expect(result).toContain(customInstructions);
  });

  it('should return base prompt when instructions are empty', () => {
    const basePrompt = 'Base prompt content';

    expect(CUSTOM_INSTRUCTIONS_WRAPPER('', basePrompt)).toBe(basePrompt);
    expect(CUSTOM_INSTRUCTIONS_WRAPPER('   ', basePrompt)).toBe(basePrompt);
  });

  it('should preserve base prompt before custom instructions', () => {
    const basePrompt = 'Original instructions';
    const customInstructions = 'Additional instructions';

    const result = CUSTOM_INSTRUCTIONS_WRAPPER(customInstructions, basePrompt);
    const baseIndex = result.indexOf(basePrompt);
    const customIndex = result.indexOf(customInstructions);

    expect(baseIndex).toBeLessThan(customIndex);
  });
});

describe('GLOBAL_INSTRUCTIONS_WRAPPER', () => {
  it('should wrap base prompt with global instructions', () => {
    const basePrompt = 'Base prompt content';
    const globalInstructions = 'Always use formal language';

    const result = GLOBAL_INSTRUCTIONS_WRAPPER(globalInstructions, basePrompt);

    expect(result).toContain(basePrompt);
    expect(result).toContain('GLOBAL INSTRUCTIONS');
    expect(result).toContain(globalInstructions);
  });

  it('should return base prompt when instructions are empty', () => {
    const basePrompt = 'Base prompt content';

    expect(GLOBAL_INSTRUCTIONS_WRAPPER('', basePrompt)).toBe(basePrompt);
    expect(GLOBAL_INSTRUCTIONS_WRAPPER('   ', basePrompt)).toBe(basePrompt);
  });

  it('should specify instructions apply to all Wonderland notes', () => {
    const result = GLOBAL_INSTRUCTIONS_WRAPPER('Instructions', 'Base');
    expect(result).toContain('all Wonderland notes');
  });
});

describe('FOLDER_GOAL_PROMPTS', () => {
  it('should have prompts for all goal types', () => {
    expect(FOLDER_GOAL_PROMPTS).toHaveProperty('learn');
    expect(FOLDER_GOAL_PROMPTS).toHaveProperty('action');
    expect(FOLDER_GOAL_PROMPTS).toHaveProperty('reflect');
    expect(FOLDER_GOAL_PROMPTS).toHaveProperty('research');
    expect(FOLDER_GOAL_PROMPTS).toHaveProperty('creative');
    expect(FOLDER_GOAL_PROMPTS).toHaveProperty('custom');
  });

  it('should have empty custom prompt', () => {
    expect(FOLDER_GOAL_PROMPTS.custom).toBe('');
  });

  it('should have learning focus for learn goal', () => {
    expect(FOLDER_GOAL_PROMPTS.learn).toContain('LEARNING FOCUS');
    expect(FOLDER_GOAL_PROMPTS.learn).toContain('understanding');
    expect(FOLDER_GOAL_PROMPTS.learn).toContain('retention');
  });

  it('should have action focus for action goal', () => {
    expect(FOLDER_GOAL_PROMPTS.action).toContain('ACTION-ORIENTED');
    expect(FOLDER_GOAL_PROMPTS.action).toContain('practical');
    expect(FOLDER_GOAL_PROMPTS.action).toContain('actionable');
  });

  it('should have reflection focus for reflect goal', () => {
    expect(FOLDER_GOAL_PROMPTS.reflect).toContain('CRITICAL REFLECTION');
    expect(FOLDER_GOAL_PROMPTS.reflect).toContain('multiple perspectives');
    expect(FOLDER_GOAL_PROMPTS.reflect).toContain('Challenge assumptions');
  });

  it('should have research focus for research goal', () => {
    expect(FOLDER_GOAL_PROMPTS.research).toContain('RESEARCH FOCUS');
    expect(FOLDER_GOAL_PROMPTS.research).toContain('evidence-based');
    expect(FOLDER_GOAL_PROMPTS.research).toContain('citations');
  });

  it('should have creative focus for creative goal', () => {
    expect(FOLDER_GOAL_PROMPTS.creative).toContain('CREATIVE EXPLORATION');
    expect(FOLDER_GOAL_PROMPTS.creative).toContain('imagination');
    expect(FOLDER_GOAL_PROMPTS.creative).toContain('novel connections');
  });
});

describe('FOLDER_GOAL_WRAPPER', () => {
  it('should wrap base prompt with folder goal', () => {
    const basePrompt = 'Base prompt';
    const result = FOLDER_GOAL_WRAPPER('learn', '', basePrompt);

    expect(result).toContain(basePrompt);
    expect(result).toContain('LEARNING FOCUS');
  });

  it('should use custom description for custom goal', () => {
    const customDescription = 'Focus on cooking recipes';
    const result = FOLDER_GOAL_WRAPPER('custom', customDescription, 'Base');

    expect(result).toContain('CUSTOM FOCUS');
    expect(result).toContain(customDescription);
  });

  it('should return base prompt for custom goal without description', () => {
    const basePrompt = 'Base prompt';
    const result = FOLDER_GOAL_WRAPPER('custom', '', basePrompt);
    expect(result).toBe(basePrompt);
  });

  it('should return base prompt for unknown goal', () => {
    const basePrompt = 'Base prompt';
    const result = FOLDER_GOAL_WRAPPER('unknown' as any, '', basePrompt);
    expect(result).toBe(basePrompt);
  });
});

describe('EXTERNAL_LINKS_PROMPT', () => {
  it('should include max links count', () => {
    const result = EXTERNAL_LINKS_PROMPT(5);
    expect(result).toContain('up to 5');
  });

  it('should specify references section format', () => {
    const result = EXTERNAL_LINKS_PROMPT(3);
    expect(result).toContain('## References');
    expect(result).toContain('markdown links');
    expect(result).toContain('[Source Title]');
  });

  it('should mention source quality', () => {
    const result = EXTERNAL_LINKS_PROMPT(3);
    expect(result).toContain('authoritative sources');
    expect(result).toContain('Wikipedia');
  });
});

describe('PERSONALIZED_SUGGESTIONS_PROMPT', () => {
  it('should include user interests', () => {
    const interests = 'philosophy, AI, cooking';
    const result = PERSONALIZED_SUGGESTIONS_PROMPT(interests);

    expect(result).toContain('PERSONALIZED FOCUS');
    expect(result).toContain(interests);
  });

  it('should mention rabbit hole suggestions', () => {
    const result = PERSONALIZED_SUGGESTIONS_PROMPT('music, art');
    expect(result).toContain('rabbit hole');
    expect(result).toContain('prioritize connections');
  });

  it('should mention finding intersections', () => {
    const result = PERSONALIZED_SUGGESTIONS_PROMPT('science');
    expect(result).toContain('unexpected intersections');
  });
});
