const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr',
  'st', 'mt', 'ave', 'blvd',
  'e.g', 'i.e', 'etc', 'vs', 'cf',
]);

const TERMINATORS = /[.!?…]/;
const MAX_BUFFER = 200;

export class SentenceStream {
  private buf = '';

  feed(token: string): string[] {
    this.buf += token;
    const out: string[] = [];

    let i = 0;
    while (i < this.buf.length) {
      const ch = this.buf[i];
      if (TERMINATORS.test(ch)) {
        const next = this.buf[i + 1];
        const isBoundary = next !== undefined && /\s/.test(next);
        if (isBoundary && !this.endsWithAbbreviation(i)) {
          const sentence = this.buf.slice(0, i + 1).trim();
          if (sentence) out.push(sentence);
          this.buf = this.buf.slice(i + 1).replace(/^\s+/, '');
          i = 0;
          continue;
        }
      }
      i++;
    }

    if (this.buf.length >= MAX_BUFFER) {
      const sentence = this.buf.trim();
      if (sentence) out.push(sentence);
      this.buf = '';
    }

    return out;
  }

  flush(): string[] {
    const remaining = this.buf.trim();
    this.buf = '';
    return remaining ? [remaining] : [];
  }

  private endsWithAbbreviation(terminatorIdx: number): boolean {
    let start = terminatorIdx - 1;
    while (start >= 0 && /[a-zA-Z.]/.test(this.buf[start])) start--;
    const word = this.buf.slice(start + 1, terminatorIdx).toLowerCase();
    return ABBREVIATIONS.has(word);
  }
}
