// Natural sort — numeric-aware ordering for human-facing names.
//
// A plain string sort puts "Step 10" before "Step 2", which reads as broken
// when a user numbers their Scenarios or Projects. This compares digit runs as
// numbers while everything else compares as text, so "Step 2" < "Step 10" and
// "Chapter 1" < "Chapter 2" without the user having to zero-pad.
//
// Built on Intl.Collator with numeric:true where available (handles
// locale-aware case and accents), with a manual fallback so the app never
// depends on a specific ICU build.

const collator = (() => {
  try {
    return new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  } catch {
    return null;
  }
})();

/**
 * Compare two strings naturally: case-insensitive, numeric runs by value.
 * Returns <0, 0, or >0 like String.prototype.localeCompare.
 */
export function naturalCompare(a: string, b: string): number {
  if (collator) return collator.compare(a, b);
  return fallbackCompare(a, b);
}

function fallbackCompare(a: string, b: string): number {
  const ax = a.toLowerCase().match(/(\d+|\D+)/g) ?? [];
  const bx = b.toLowerCase().match(/(\d+|\D+)/g) ?? [];
  const len = Math.min(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const an = /^\d+$/.test(ax[i]);
    const bn = /^\d+$/.test(bx[i]);
    if (an && bn) {
      const diff = parseInt(ax[i], 10) - parseInt(bx[i], 10);
      if (diff !== 0) return diff;
    } else {
      const diff = ax[i].localeCompare(bx[i]);
      if (diff !== 0) return diff;
    }
  }
  return ax.length - bx.length;
}

/**
 * Sort a list by a name field, naturally. `position` (when present) takes
 * precedence so a user can pin an order; otherwise the name decides. Returns
 * a new array; the input is not mutated.
 */
export function sortByName<T extends { name?: string | null; position?: number | null }>(
  items: T[]
): T[] {
  return items.slice().sort((a, b) => {
    const ap = a.position;
    const bp = b.position;
    if (ap != null && bp != null && ap !== bp) return ap - bp;
    if (ap != null && bp == null) return -1;
    if (ap == null && bp != null) return 1;
    return naturalCompare(a.name ?? '', b.name ?? '');
  });
}