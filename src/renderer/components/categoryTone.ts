// The tint on a Scenario card's leading edge.
//
// Categories are the one axis on a card that is neither the title nor the
// difficulty, so a scan across a grid has no way to group them. The tint
// gives that grouping back without adding objects to a palette that has one
// hue in it — the card stays paper-coloured and only its edge takes colour.
//
// Deliberately redundant: the category name is printed on the card as well,
// so nothing is conveyed by colour alone.

/** The categories that have a hand-tuned tone, in the order they were tuned. */
const TONES = [
  'academic',
  'business',
  'customer-service',
  'finance',
  'international',
  'management',
  'marketing',
  'networking',
  'sales',
  'technology',
] as const;

/**
 * A CSS colour for a category. Unknown categories — anything a user typed on
 * the Scenario form — hash to a stable tone rather than falling back to grey,
 * so a custom Scenario still gets an edge instead of looking unfinished.
 */
export function categoryTone(category: string): string {
  const key = (category ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if ((TONES as readonly string[]).includes(key)) return `var(--cat-${key})`;

  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return `var(--cat-${TONES[hash % TONES.length]})`;
}