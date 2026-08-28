// Persona stream transforms — pure async-generator utilities that let one
// AI Brain reply carry a speaker label through the Turn pipeline without the
// TurnEngine knowing personas exist.
//
// Convention: in a multi-persona Scenario, every reply begins with a
// `[[Name]]` tag naming the character who speaks. Two transforms move that
// tag through the system:
//
//   withPersonaTag   (Brain side)  strips `[[Name]]`, reports the name, and
//                                  re-emits `Name: ` so the TRANSCRIPT (and
//                                  the model's next-turn history) is
//                                  speaker-labelled.
//   withSpokenText   (Voice side)  strips that leading `Name: ` label so it is
//                                  never synthesized aloud.
//
// Tags and labels may split across token chunks, so both buffer a bounded
// head until the format is decided.

export interface PersonaTagResult {
  name: string;
  rest: string;
}

/** Parse a leading `[[Name]]` tag from complete text. Synchronous helper for
 *  non-streaming (mute-path) replies and greetings. */
export function parsePersonaTag(text: string): PersonaTagResult | null {
  const m = text.match(/^\s*\[\[([^\]]{1,64})\]\]/);
  if (!m) return null;
  const name = m[1].trim();
  if (!name) return null;
  return { name, rest: text.slice(m[0].length) };
}

/**
 * Stream transform: removes a leading `[[Name]]` tag (possibly split across
 * chunks), calls `onPersona(name)` once parsed, and yields `Name: ` followed
 * by the remaining text so downstream consumers see a speaker-labelled reply.
 * If the reply does not start with a tag, text passes through untouched.
 */
export async function* withPersonaTag(
  tokens: AsyncIterable<string>,
  onPersona: (name: string) => void
): AsyncGenerator<string> {
  let buf = '';
  let open = false; // tag decided — pass everything straight through
  let emittedLabel = false;

  const decide = (tag: PersonaTagResult | null, probed: string): string | null => {
    if (!tag) return probed; // no tag → text is already the reply
    onPersona(tag.name);
    emittedLabel = true;
    // Keep the stream's own spacing: if the text after the tag already
    // starts with whitespace, the colon alone separates label and speech.
    return /^\s/.test(tag.rest) ? `${tag.name}:${tag.rest}` : `${tag.name}: ${tag.rest}`;
  };

  for await (const tok of tokens) {
    if (open) { yield tok; continue; }
    buf += tok;

    const trimmed = buf.replace(/^\s+/, '');
    if (!trimmed) continue; // only whitespace so far — the tag may still come

    if (trimmed.startsWith('[[')) {
      const end = trimmed.indexOf(']]');
      if (end === -1) {
        if (trimmed.length > 72) { // runaway unclosed tag — give up on it
          open = true;
          yield buf;
          buf = '';
        }
        continue;
      }
      open = true;
      const out = decide(parsePersonaTag(trimmed), trimmed);
      buf = '';
      if (out) yield out;
      continue;
    }

    open = true; // first non-whitespace is not a tag opener
    yield buf;
    buf = '';
  }
  if (buf) yield buf;
  void emittedLabel;
}

/**
 * Stream transform: removes the leading `Speaker: ` label (as emitted by
 * withPersonaTag) from the spoken path, so names are never read aloud.
 * `getSpeaker` returns the expected speaker (or null when the reply carried
 * no tag and there is nothing to strip).
 */
export async function* withSpokenText(
  tokens: AsyncIterable<string>,
  getSpeaker: () => string | null
): AsyncGenerator<string> {
  let buf = '';
  let open = false;

  for await (const tok of tokens) {
    if (open) { yield tok; continue; }
    buf += tok;

    const speaker = getSpeaker();
    if (!speaker) { open = true; yield buf; buf = ''; continue; }

    const prefix = `${speaker}: `;
    if (buf.startsWith(prefix)) {
      open = true;
      const rest = buf.slice(prefix.length);
      buf = '';
      if (rest) yield rest;
      continue;
    }
    if (prefix.startsWith(buf)) continue; // still could become the prefix
    open = true; // differs — no label (e.g. a resumed transcript)
    yield buf;
    buf = '';
  }
  if (buf) yield buf;
}

/** Split a completed transcript message into speaker label + spoken text for
 *  display. Returns null when the message carries no speaker label. */
export function splitSpeakerPrefix(content: string): { speaker: string; text: string } | null {
  const m = content.match(/^([A-Za-z][A-Za-z .']{0,30}): /);
  if (!m) return null;
  return { speaker: m[1].trim(), text: content.slice(m[0].length) };
}
