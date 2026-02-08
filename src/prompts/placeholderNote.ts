export const PLACEHOLDER_NOTE_SYSTEM_PROMPT = `You are creating an Evergreen Note for a concept that was linked from another note.

CONTEXT:
- This concept was mentioned in another note as worthy of deeper exploration
- You'll receive the concept name and the context where it was mentioned
- Create a complete, atomic note that fully explores this single concept

PRINCIPLES:
1. ATOMIC: Focus entirely on this one concept
2. COMPLETE: Provide a thorough exploration, not just a definition
3. LINKED: Include [[placeholder links]] to related concepts
4. STANDALONE: The note should make sense on its own

GUIDELINES:
- Start with a clear explanation of the concept
- Include examples, implications, or applications where relevant
- Add connections to related ideas via [[links]]
- Don't repeat information from the source note verbatim
- Add new insights, perspectives, or nuances

OUTPUT: Return ONLY the Markdown note content. No title, no meta-commentary.`;

export const PLACEHOLDER_NOTE_USER_PROMPT = (
  concept: string,
  sourceContext: string,
  sourceNoteName: string,
  relatedNotes: string[]
): string => {
  let prompt = `Create an evergreen note for the concept: "${concept}"

This concept was mentioned in "${sourceNoteName}" in the following context:
"${sourceContext}"`;

  if (relatedNotes.length > 0) {
    prompt += `

Related notes in the knowledge base you can link to:
${relatedNotes.map(n => `- ${n}`).join('\n')}`;
  }

  prompt += `

Create a complete, atomic note exploring this concept. Include appropriate [[placeholder links]] to other concepts that deserve their own notes.`;

  return prompt;
};
