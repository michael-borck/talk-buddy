import { describe, it, expect, vi } from 'vitest';
import { withPersonaTag, withSpokenText, parsePersonaTag, splitSpeakerPrefix } from './personaStream';

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = '';
  for await (const chunk of gen) out += chunk;
  return out;
}

async function* of(chunks: string[]): AsyncGenerator<string> {
  for (const c of chunks) yield c;
}

describe('parsePersonaTag', () => {
  it('parses a leading tag and returns the rest', () => {
    expect(parsePersonaTag('[[Sarah]] Hello there.')).toEqual({ name: 'Sarah', rest: ' Hello there.' });
  });

  it('tolerates leading whitespace and padded names', () => {
    expect(parsePersonaTag('  [[ Dr. Chen ]] Question one.')).toEqual({ name: 'Dr. Chen', rest: ' Question one.' });
  });

  it('returns null when there is no tag', () => {
    expect(parsePersonaTag('Just talking.')).toBeNull();
  });

  it('returns null for an empty tag', () => {
    expect(parsePersonaTag('[[]] hello')).toBeNull();
  });
});

describe('withPersonaTag (brain side)', () => {
  it('strips a tag split across chunks and reports the speaker', async () => {
    const onPersona = vi.fn();
    const out = await collect(withPersonaTag(of(['[[Sarah', ']] Great ', 'answer.']), onPersona));
    expect(onPersona).toHaveBeenCalledWith('Sarah');
    expect(out).toBe('Sarah: Great answer.');
  });

  it('passes through replies with no tag', async () => {
    const onPersona = vi.fn();
    const out = await collect(withPersonaTag(of(['Hello, ', 'how are you?']), onPersona));
    expect(onPersona).not.toHaveBeenCalled();
    expect(out).toBe('Hello, how are you?');
  });

  it('tolerates leading whitespace before the tag', async () => {
    const onPersona = vi.fn();
    const out = await collect(withPersonaTag(of(['\n\n[[Tom]]', ' Hi.']), onPersona));
    expect(onPersona).toHaveBeenCalledWith('Tom');
    // When the label and the first text arrive in different chunks the
    // emitted label keeps its trailing space — a harmless double space in
    // the transcript; display and speech both normalise it.
    expect(out).toBe('Tom:  Hi.');
  });

  it('gives up on a runaway unclosed tag and emits it as text', async () => {
    const onPersona = vi.fn();
    const runaway = '[[' + 'x'.repeat(80);
    const out = await collect(withPersonaTag(of([runaway, ' rest']), onPersona));
    expect(onPersona).not.toHaveBeenCalled();
    expect(out).toBe(runaway + ' rest');
  });

  it('buffers nothing once the tag decision is made (streaming shape)', async () => {
    const chunks: string[] = [];
    for await (const c of withPersonaTag(of(['[[A]] one', ' two', ' three']), () => {})) chunks.push(c);
    expect(chunks).toEqual(['A: one', ' two', ' three']);
  });
});

describe('withSpokenText (voice side)', () => {
  it('strips the speaker label once the speaker is known', async () => {
    const out = await collect(withSpokenText(of(['Sarah: ', 'Great ', 'answer.']), () => 'Sarah'));
    expect(out).toBe('Great answer.');
  });

  it('waits for the label to complete before deciding', async () => {
    const out = await collect(withSpokenText(of(['Sa', 'rah: H', 'i']), () => 'Sarah'));
    expect(out).toBe('Hi');
  });

  it('passes text through when there is no speaker', async () => {
    const out = await collect(withSpokenText(of(['Plain ', 'text.']), () => null));
    expect(out).toBe('Plain text.');
  });

  it('passes through when the label does not match the speaker', async () => {
    const out = await collect(withSpokenText(of(['Totally different text']), () => 'Sarah'));
    expect(out).toBe('Totally different text');
  });
});

describe('splitSpeakerPrefix (display)', () => {
  it('splits a labelled message', () => {
    expect(splitSpeakerPrefix('Dr. Chen: What methods did you use?')).toEqual({
      speaker: 'Dr. Chen',
      text: 'What methods did you use?'
    });
  });

  it('returns null for unlabelled messages', () => {
    expect(splitSpeakerPrefix('No label here.')).toBeNull();
    expect(splitSpeakerPrefix('No colon')).toBeNull();
  });
});
