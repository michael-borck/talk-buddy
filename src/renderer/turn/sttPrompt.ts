// Scenario vocabulary → Whisper `prompt` hint.
//
// Whisper's initial_prompt biases decoding toward likely words; TalkBuddy uses
// it to carry a Scenario's domain vocabulary (product names, industry jargon,
// the interviewer's name) into the Listening Provider so the transcript spells
// them correctly. Deliberately a plain term list — the prompt conditions the
// decoder, it does not instruct it, so phrasing it as prose or commands tends
// to leak verbatim into the transcript.

const MAX_PROMPT_CHARS = 400; // whisper.cpp trims around 224 tokens; stay well inside

/**
 * Build the STT prompt from a Scenario's raw vocabulary field, or undefined
 * when there's nothing useful to send. Terms may be separated by commas or
 * newlines; empty entries are dropped and the result is capped so a bloated
 * field can't eat the decoder's context budget.
 */
export function vocabularyPrompt(vocabulary: string | undefined | null): string | undefined {
  if (!vocabulary) return undefined;
  const terms = vocabulary
    .split(/[,\n;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return undefined;
  let prompt = terms.join(', ');
  if (prompt.length > MAX_PROMPT_CHARS) prompt = prompt.slice(0, MAX_PROMPT_CHARS);
  return prompt;
}
