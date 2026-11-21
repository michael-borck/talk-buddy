// Search — one matcher for the app's two findable things: Scenarios and
// Sessions. Kept out of the pages so the rules live in one place and are
// testable: a search that only matches whole words is frustrating, and a
// search that matches everything is useless.
//
// The matcher is deliberately small and predictable:
//   - case-insensitive substring across a set of named fields
//   - multi-term: every whitespace-separated term must match some field
//     (so "job interview" finds a Scenario named "Job Interview" even when
//     the words are not adjacent)
//   - an empty query matches everything (callers decide whether to show all
//     or nothing; the matcher just says "no filter")

/** A field to search over: its display name and the text to match against. */
export interface SearchField {
  name: string;
  value: string | undefined | null;
}

function normalize(s: string | undefined | null): string {
  return (s ?? '').toLowerCase();
}

/**
 * Does `query` match `fields`? Every term in the query must appear in some
 * field. An empty / whitespace-only query returns true.
 */
export function matchesQuery(query: string, fields: SearchField[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.map((f) => normalize(f.value)).join('\n');
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/**
 * The Scenarios a query matches, searching name, description, category, and
 * tags. Exported so the Journal and the rail can search scenarios without
 * re-deriving the field list.
 */
export function searchScenarios<T extends {
  name?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
}>(query: string, scenarios: T[]): T[] {
  return scenarios.filter((s) =>
    matchesQuery(query, [
      { name: 'name', value: s.name },
      { name: 'description', value: s.description },
      { name: 'category', value: s.category },
      { name: 'tags', value: (s.tags ?? []).join(' ') },
    ])
  );
}

/**
 * Does a Session match? Searches the Scenario name (already joined by the
 * caller), the session pack name, and the transcript text — so "promotion"
 * finds a Session where the student said "promotion" three turns in.
 */
export function sessionMatchesQuery(
  query: string,
  session: {
    scenarioName?: string | null;
    packName?: string | null;
    transcript?: string | null;
  }
): boolean {
  return matchesQuery(query, [
    { name: 'scenario', value: session.scenarioName },
    { name: 'pack', value: session.packName },
    { name: 'transcript', value: session.transcript },
  ]);
}

/**
 * Flatten a Session's transcript into searchable text. Joins every message's
 * content; cheap and good enough for a substring match.
 */
export function sessionSearchText(
  transcript: Array<{ content?: string | null }> | undefined | null
): string {
  return (transcript ?? [])
    .map((m) => m.content ?? '')
    .join(' ');
}