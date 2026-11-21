// Notices — the one channel for telling the user something went wrong (or
// well) while they are not looking at a settings screen.
//
// The problem this solves: Talk Buddy had 46 ad-hoc `toast.error('Failed to
// … Please try again.')` calls and 107 `catch` blocks, many of which only
// `console.error` and showed the user nothing. A failed save that only logs is
// a "failed silently" — the student thinks their work is safe when it is not.
//
// The shape is borrowed from Handy's notices: callers pass a `NoticeCode`, not
// a display string. The code is the contract; `messageFor` maps it to words in
// one place. A new failure is a few lines and needs no new UI. `detail` carries
// what only the call site knows (a model name, a raw error) without the rest of
// the app having to understand it.

import toast from 'react-hot-toast';

/**
 * Every failure the app knows how to name. Grouped by subsystem so a new one
 * is easy to place.
 *
 * - `error`: nothing came out; the user cannot do what they set out to do.
 * - `success`: an action the user asked for worked.
 * - `info`: neutral state change (a toggle), not a result.
 */
export type NoticeCode =
  // Loading / reading data
  | 'home.loadFailed'
  | 'scenarios.loadFailed'
  | 'sessions.loadFailed'
  | 'packs.loadFailed'
  | 'archive.loadFailed'
  | 'scenario.loadFailed'
  | 'scenario.notFound'
  // Saving / deleting / archiving
  | 'scenario.saveFailed'
  | 'scenario.deleteFailed'
  | 'scenario.archiveFailed'
  | 'scenario.unarchiveFailed'
  | 'scenario.restoreDefaultsFailed'
  | 'pack.createFailed'
  | 'pack.deleteFailed'
  | 'pack.archiveFailed'
  | 'pack.unarchiveFailed'
  | 'pack.addScenariosFailed'
  | 'pack.removeScenarioFailed'
  | 'session.deleteFailed'
  | 'session.packDeleteFailed'
  | 'session.endFailed'
  | 'session.saveFailed'
  | 'bulk.unarchiveFailed'
  // Import / export
  | 'import.failed'
  | 'import.openFailed'
  | 'export.failed'
  // Starting a conversation
  | 'conversation.startFailed'
  | 'conversation.resumeFailed'
  // Settings
  | 'settings.loadFailed'
  | 'settings.saveFailed'
  | 'settings.exportFailed'
  | 'settings.importFailed'
  | 'settings.resetFailed'
  // Success
  | 'session.started'
  | 'session.endedNaturally'
  | 'settings.saved'
  | 'scenarios.restoredDefaults'
  | 'import.succeeded'
  // Info
  | 'inputMode.changed';

/** How loud a notice is; decides the toast styling. */
export type NoticeLevel = 'error' | 'success' | 'info';

const LEVEL: Record<NoticeCode, NoticeLevel> = {
  'home.loadFailed': 'error',
  'scenarios.loadFailed': 'error',
  'sessions.loadFailed': 'error',
  'packs.loadFailed': 'error',
  'archive.loadFailed': 'error',
  'scenario.loadFailed': 'error',
  'scenario.notFound': 'error',
  'scenario.saveFailed': 'error',
  'scenario.deleteFailed': 'error',
  'scenario.archiveFailed': 'error',
  'scenario.unarchiveFailed': 'error',
  'scenario.restoreDefaultsFailed': 'error',
  'pack.createFailed': 'error',
  'pack.deleteFailed': 'error',
  'pack.archiveFailed': 'error',
  'pack.unarchiveFailed': 'error',
  'pack.addScenariosFailed': 'error',
  'pack.removeScenarioFailed': 'error',
  'session.deleteFailed': 'error',
  'session.packDeleteFailed': 'error',
  'session.endFailed': 'error',
  'session.saveFailed': 'error',
  'bulk.unarchiveFailed': 'error',
  'import.failed': 'error',
  'import.openFailed': 'error',
  'export.failed': 'error',
  'conversation.startFailed': 'error',
  'conversation.resumeFailed': 'error',
  'settings.loadFailed': 'error',
  'settings.saveFailed': 'error',
  'settings.exportFailed': 'error',
  'settings.importFailed': 'error',
  'settings.resetFailed': 'error',
  'session.started': 'success',
  'session.endedNaturally': 'success',
  'settings.saved': 'success',
  'scenarios.restoredDefaults': 'success',
  'import.succeeded': 'success',
  'inputMode.changed': 'info',
};

/**
 * The sentence shown for a code, with any `detail` folded in. Kept as a
 * switch (not a record) so TypeScript flags a new code until it is handled —
 * the same exhaustiveness trick the backend uses.
 */
export function messageFor(code: NoticeCode, detail?: string): string {
  // `passthrough` codes show the caller's own words (a backend message), not a
  // canned sentence; `detail` is appended to every other code's sentence.
  if (code === 'inputMode.changed') {
    return detail || defaultMessage(code);
  }
  const base = defaultMessage(code);
  if (!detail) return base;
  // Sentences already end in a period; append the detail as its own clause.
  return base.endsWith('.') ? `${base} ${detail}` : `${base}: ${detail}`;
}

function defaultMessage(code: NoticeCode): string {
  switch (code) {
    case 'home.loadFailed': return `Couldn't load your home screen.`;
    case 'scenarios.loadFailed': return `Couldn't load scenarios.`;
    case 'sessions.loadFailed': return `Couldn't load session history.`;
    case 'packs.loadFailed': return `Couldn't load practice packs.`;
    case 'archive.loadFailed': return `Couldn't load the archive.`;
    case 'scenario.loadFailed': return `Couldn't load that scenario.`;
    case 'scenario.notFound': return `That scenario could not be found.`;
    case 'scenario.saveFailed': return `Couldn't save the scenario. Please try again.`;
    case 'scenario.deleteFailed': return `Couldn't delete the scenario. Please try again.`;
    case 'scenario.archiveFailed': return `Couldn't archive the scenario. Please try again.`;
    case 'scenario.unarchiveFailed': return `Couldn't unarchive the scenario. Please try again.`;
    case 'scenario.restoreDefaultsFailed': return `Couldn't restore the default scenarios. Please try again.`;
    case 'pack.createFailed': return `Couldn't create the practice pack. Please try again.`;
    case 'pack.deleteFailed': return `Couldn't delete the practice pack. Please try again.`;
    case 'pack.archiveFailed': return `Couldn't archive the practice pack. Please try again.`;
    case 'pack.unarchiveFailed': return `Couldn't unarchive the practice pack. Please try again.`;
    case 'pack.addScenariosFailed': return `Couldn't add those scenarios to the pack. Please try again.`;
    case 'pack.removeScenarioFailed': return `Couldn't remove that scenario from the pack. Please try again.`;
    case 'session.deleteFailed': return `Couldn't delete that session. Please try again.`;
    case 'session.packDeleteFailed': return `Couldn't delete that session pack. Please try again.`;
    case 'session.endFailed': return `Couldn't end the session. Please try again.`;
    case 'session.saveFailed': return `Couldn't save the session.`;
    case 'bulk.unarchiveFailed': return `Couldn't unarchive the selected items. Please try again.`;
    case 'import.failed': return `Import failed.`;
    case 'import.openFailed': return `Couldn't open the import dialog.`;
    case 'export.failed': return `Couldn't export. Please try again.`;
    case 'conversation.startFailed': return `Couldn't start the conversation. Please try again.`;
    case 'conversation.resumeFailed': return `Couldn't resume that session.`;
    case 'settings.loadFailed': return `Couldn't load your settings.`;
    case 'settings.saveFailed': return `Couldn't save your settings. Please try again.`;
    case 'settings.exportFailed': return `Couldn't export your data.`;
    case 'settings.importFailed': return `Couldn't import your data.`;
    case 'settings.resetFailed': return `Couldn't reset the database. Please try again.`;
    case 'session.started': return `Session started — begin speaking when ready.`;
    case 'session.endedNaturally': return `Great conversation — the session ended naturally.`;
    case 'settings.saved': return `Settings saved.`;
    case 'scenarios.restoredDefaults': return `Restored the default scenarios.`;
    case 'import.succeeded': return `Import complete.`;
    case 'inputMode.changed': return 'Input mode changed.';
  }
}

/** A notice as handed to the UI layer. */
export interface Notice {
  code: NoticeCode;
  level: NoticeLevel;
  message: string;
  /** Wall-clock ms; used to order the debug log and expire old entries. */
  at: number;
}

/** Options a call site can pass. */
export interface NotifyOptions {
  /** What only this call site knows — a name, a raw error, a count. */
  detail?: string;
  /** Collapse repeats (e.g. a toggle) under one toast id. */
  id?: string;
}

/**
 * The single place a notice is raised. Under the hood it is still the app's
 * one toast (react-hot-toast), but every call goes through a code so the set
 * of user-facing failures is enumerable and testable.
 */
export function notify(code: NoticeCode, opts: NotifyOptions = {}): void {
  const notice: Notice = {
    code,
    level: LEVEL[code],
    message: messageFor(code, opts.detail),
    at: Date.now(),
  };
  record(notice);
  if (notice.level === 'success') toast.success(notice.message, { id: opts.id });
  else if (notice.level === 'info') toast(notice.message, { id: opts.id });
  else toast.error(notice.message, { id: opts.id });
}

/** A `catch`-friendly helper: `notifyCaught('scenario.saveFailed', err)`. */
export function notifyCaught(code: NoticeCode, err: unknown, opts: NotifyOptions = {}): void {
  const detail = err instanceof Error ? err.message : err ? String(err) : undefined;
  notify(code, { ...opts, detail: opts.detail ?? detail });
}

// ── Debug log ────────────────────────────────────────────────────────────────
//
// A ring buffer of the last notices, so the (debug-only) diagnostics panel can
// show what actually happened this session. Kept in module scope — it must
// survive a page's component tree, and there is only ever one app.

const LOG_LIMIT = 50;
const log: Notice[] = [];
const listeners = new Set<(entries: Notice[]) => void>();

function record(notice: Notice): void {
  log.push(notice);
  if (log.length > LOG_LIMIT) log.shift();
  for (const l of listeners) l([...log]);
}

/** The notices raised so far this session, oldest first. */
export function getNotices(): Notice[] {
  return [...log];
}

/** Subscribe to the log; returns an unsubscribe. */
export function subscribeNotices(fn: (entries: Notice[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Clear the log (debug panel "Clear"). */
export function clearNotices(): void {
  log.length = 0;
  for (const l of listeners) l([]);
}