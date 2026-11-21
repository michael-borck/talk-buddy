import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const toastError = vi.fn();
const toastSuccess = vi.fn();
const toastInfo = vi.fn();

vi.mock('react-hot-toast', () => {
  const toast = (msg: string, opts?: unknown) => toastInfo(msg, opts);
  toast.error = (msg: string, opts?: unknown) => toastError(msg, opts);
  toast.success = (msg: string, opts?: unknown) => toastSuccess(msg, opts);
  return { default: toast };
});

import {
  notify,
  notifyCaught,
  messageFor,
  getNotices,
  subscribeNotices,
  clearNotices,
  type NoticeCode,
} from './notices';

const ALL_CODES: NoticeCode[] = [
  'home.loadFailed', 'scenarios.loadFailed', 'sessions.loadFailed',
  'packs.loadFailed', 'archive.loadFailed', 'scenario.loadFailed',
  'scenario.notFound', 'scenario.saveFailed', 'scenario.deleteFailed',
  'scenario.archiveFailed', 'scenario.unarchiveFailed',
  'scenario.restoreDefaultsFailed', 'pack.createFailed', 'pack.deleteFailed',
  'pack.archiveFailed', 'pack.unarchiveFailed', 'pack.addScenariosFailed',
  'pack.removeScenarioFailed', 'session.deleteFailed', 'session.packDeleteFailed',
  'session.endFailed', 'session.saveFailed', 'bulk.unarchiveFailed',
  'import.failed', 'import.openFailed', 'export.failed',
  'conversation.startFailed', 'conversation.resumeFailed',
  'settings.loadFailed', 'settings.saveFailed', 'settings.exportFailed',
  'settings.importFailed', 'settings.resetFailed',
  'session.started', 'session.endedNaturally', 'settings.saved',
  'scenarios.restoredDefaults', 'import.succeeded', 'inputMode.changed',
];

describe('notices', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
    toastInfo.mockClear();
    clearNotices();
  });

  afterEach(() => vi.restoreAllMocks());

  it('every code has a non-empty message', () => {
    for (const code of ALL_CODES) {
      expect(messageFor(code).length).toBeGreaterThan(0);
    }
  });

  it('routes error codes to toast.error', () => {
    notify('scenario.saveFailed');
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('routes success codes to toast.success', () => {
    notify('settings.saved');
    expect(toastSuccess).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('folds detail into the message', () => {
    notify('import.failed', { detail: 'bad json' });
    expect(toastError.mock.calls[0][0]).toContain('bad json');
  });

  it('notifyCaught extracts an Error message', () => {
    notifyCaught('session.saveFailed', new Error('disk full'));
    expect(toastError.mock.calls[0][0]).toContain('disk full');
  });

  it('notifyCaught keeps an explicit detail over the error', () => {
    notifyCaught('session.saveFailed', new Error('disk full'), { detail: 'while saving' });
    expect(toastError.mock.calls[0][0]).toContain('while saving');
  });

  it('records notices in the debug log and notifies subscribers', () => {
    const seen: number[] = [];
    const unsub = subscribeNotices((entries) => seen.push(entries.length));
    notify('scenario.saveFailed');
    notify('settings.saved');
    expect(getNotices()).toHaveLength(2);
    expect(getNotices()[0].code).toBe('scenario.saveFailed');
    expect(getNotices()[1].code).toBe('settings.saved');
    expect(seen).toEqual([1, 2]);
    unsub();
  });

  it('caps the debug log at 50 entries', () => {
    for (let i = 0; i < 60; i++) notify('settings.saved', { detail: String(i) });
    const entries = getNotices();
    expect(entries).toHaveLength(50);
    expect(entries[entries.length - 1].message).toContain('59');
  });

  it('clear empties the log and notifies subscribers', () => {
    const seen: number[] = [];
    const unsub = subscribeNotices((entries) => seen.push(entries.length));
    notify('settings.saved');
    clearNotices();
    expect(getNotices()).toHaveLength(0);
    expect(seen).toEqual([1, 0]);
    unsub();
  });

  it('passes a toast id through for collapse-able toasts', () => {
    notify('inputMode.changed', { detail: 'hands-free', id: 'input-mode' });
    expect(toastInfo.mock.calls[0][1]).toEqual({ id: 'input-mode' });
  });
});