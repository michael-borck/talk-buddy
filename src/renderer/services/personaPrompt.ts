// Multi-persona prompt composition. When a Scenario declares personas, the
// single system prompt grows a director script: the cast, the rule that each
// Turn is answered by the ONE character who would naturally speak next, and
// the `[[Name]]` reply tag the app strips before speaking (see personaStream).

import { ScenarioPersona } from '../types';

export function composeSystemPrompt(base: string, personas?: ScenarioPersona[]): string {
  if (!personas || personas.length === 0) return base;

  const cast = personas
    .map((p) => `- ${p.name}: ${p.systemPrompt.trim() || 'A participant in this scenario.'}`)
    .join('\n');

  const names = personas.map((p) => p.name).join(', ');

  return `${base}

## The other characters

You also voice all of the following characters in this practice conversation:

${cast}

## How to run the role-play

- Each turn, reply as the ONE character who would naturally speak next — the
  character can change from turn to turn, and a character may realistically
  stay silent for a turn or two.
- Stay in character at all times. Never narrate actions or scene descriptions;
  everything after the tag is spoken aloud to the user.
- Begin every reply with the speaking character's name in double square
  brackets, then their dialogue. For example: [[${personas[0].name}]] What I
  would say next.
- Keep each character's reply focused and conversational, as one person
  speaking aloud.
- The known characters are: ${names}. The user plays themselves.`;
}
