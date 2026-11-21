// Trash — soft-deleted Scenarios, Practice Packs, and Sessions, restorable for
// a retention window before they are purged.
//
// Delete now moves here instead of destroying the row (see db-operations.js:
// the `*:delete` ops stamp deleted_at). The window is TRASH_RETENTION_DAYS;
// items older than that are purged on load, and the user can empty the Trash
// immediately. This is the base the TODO's archive/favorites work builds on —
// the schema and the restore/purge ops are already in place.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listTrash, restoreTrashItem, purgeTrash, emptyTrash,
  TrashItem, TrashKind, TRASH_RETENTION_DAYS,
} from '../services/sqlite';
import { notify, notifyCaught } from '../services/notices';
import { RotateCcw, Trash2, Package, MessageSquare, Clock, X } from 'lucide-react';
import { EmptyState, LoadingState, PageHeader } from '../components/layout/PageShell';

const KIND_LABEL: Record<TrashKind, string> = {
  scenario: 'Scenario',
  pack: 'Practice Pack',
  session: 'Session',
  session_pack: 'Session Pack',
};

const KIND_ICON: Record<TrashKind, typeof Package> = {
  scenario: MessageSquare,
  pack: Package,
  session: Clock,
  session_pack: Package,
};

/** How long ago a soft-deleted row was trashed, in whole days. */
function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export function TrashPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Purge anything past the retention window, then list what remains.
      const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000).toISOString();
      await purgeTrash(cutoff).catch(() => {});
      setItems(await listTrash());
    } catch (error) {
      notifyCaught('archive.loadFailed', error, { detail: 'Could not load the Trash.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restore = async (item: TrashItem) => {
    setBusyId(item.id);
    try {
      await restoreTrashItem(item.kind, item.id);
      notify('scenarios.restoredDefaults', { detail: `${KIND_LABEL[item.kind]} restored` });
      await load();
    } catch (error) {
      notifyCaught('scenario.unarchiveFailed', error, { detail: 'Could not restore the item.' });
    } finally {
      setBusyId(null);
    }
  };

  const empty = async () => {
    if (!confirm('Permanently delete everything in the Trash? This cannot be undone.')) return;
    setBusyId('__empty__');
    try {
      await emptyTrash();
      notify('scenarios.restoredDefaults', { detail: 'Trash emptied' });
      await load();
    } catch (error) {
      notifyCaught('scenario.deleteFailed', error, { detail: 'Could not empty the Trash.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page page-canvas p-8">
      <PageHeader
        title="Trash"
        subtitle={`Deleted items stay here for ${TRASH_RETENTION_DAYS} days, then are removed automatically.`}
        icon={<Trash2 size={28} />}
        actions={
          items.length > 0 ? (
            <button
              onClick={empty}
              disabled={busyId === '__empty__'}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
            >
              <X size={16} />
              Empty Trash
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <LoadingState label="Loading trash…" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Trash2 size={40} />} message="The Trash is empty." />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const age = daysSince(item.deletedAt);
            return (
              <li
                key={`${item.kind}:${item.id}`}
                className="flex items-center justify-between gap-4 bg-white rounded-lg shadow px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={18} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {KIND_LABEL[item.kind]} · deleted {age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => restore(item)}
                  disabled={busyId === item.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50 shrink-0"
                >
                  <RotateCcw size={14} />
                  Restore
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <button
          onClick={() => navigate('/settings')}
          className="mt-6 text-sm text-gray-500 hover:text-gray-700"
        >
          Retention and Trash settings →
        </button>
      )}
    </div>
  );
}