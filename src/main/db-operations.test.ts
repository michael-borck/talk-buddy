// Unit tests for the main-process named-operation registry.
// Uses a stub db that records the SQL and bind values each operation
// produces, so we can pin the security-relevant behavior: parameterized
// statements only, allowlisted column names in dynamic SET clauses, and
// rejection of unknown operation names.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runOperation } = require('./db-operations.js');

interface Call {
  sql: string;
  method: 'all' | 'run';
  values: unknown[];
}

function makeStubDb(calls: Call[]) {
  return {
    prepare(sql: string) {
      return {
        all: (...values: unknown[]) => {
          calls.push({ sql, method: 'all', values });
          return [];
        },
        run: (...values: unknown[]) => {
          calls.push({ sql, method: 'run', values });
          return { changes: 1 };
        },
      };
    },
  };
}

describe('runOperation', () => {
  it('throws on unknown operation names', () => {
    const db = makeStubDb([]);
    expect(() => runOperation(db, 'definitely:notAnOp', {})).toThrow(
      'Unknown db operation: definitely:notAnOp'
    );
  });

  it('binds values through placeholders for simple lookups', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:get', { id: 'scn_1' });
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe('SELECT * FROM scenarios WHERE id = ?');
    expect(calls[0].method).toBe('all');
    expect(calls[0].values).toEqual(['scn_1']);
  });

  it('applies optional filters as parameterized conditions', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:list', {
      filter: { category: 'Business', difficulty: 'beginner' },
    });
    expect(calls[0].sql).toBe(
      'SELECT * FROM scenarios WHERE archived = 0 AND deleted_at IS NULL AND category = ? AND difficulty = ? ORDER BY pinned DESC, name'
    );
    expect(calls[0].values).toEqual(['Business', 'beginner']);
  });

  it('omits filter conditions when no filter is provided', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:list', {});
    expect(calls[0].sql).toBe(
      'SELECT * FROM scenarios WHERE archived = 0 AND deleted_at IS NULL ORDER BY pinned DESC, name'
    );
    expect(calls[0].values).toEqual([]);
  });

  it('builds partial updates only from allowlisted columns', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'sessions:update', {
      id: 'ses_1',
      fields: {
        status: 'ended',
        updated: '2026-01-01T00:00:00.000Z',
        'archived = 1; DROP TABLE sessions; --': 'pwned',
        notAColumn: 'pwned',
      },
    });
    expect(calls[0].sql).toBe('UPDATE sessions SET status = ?, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual(['ended', '2026-01-01T00:00:00.000Z', 'ses_1']);
  });

  it('never interpolates field values into SQL', () => {
    const calls: Call[] = [];
    const malicious = "'; DROP TABLE packs; --";
    runOperation(makeStubDb(calls), 'packs:update', {
      id: 'pack_1',
      fields: { name: malicious, updated: 'now' },
    });
    expect(calls[0].sql).not.toContain(malicious);
    expect(calls[0].values).toEqual([malicious, 'now', 'pack_1']);
  });

  it('packScenarios:listAll reads every link in one unparameterised SELECT', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'packScenarios:listAll', {});
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('FROM pack_scenarios');
    expect(calls[0].sql).toContain('scenario_id');
    expect(calls[0].values).toEqual([]); // no binds needed — no user input
  });

  it('packScenarios:listPacks still scopes to one scenario', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'packScenarios:listPacks', { scenarioId: 'scn_1' });
    expect(calls[0].sql).toContain('WHERE ps.scenario_id = ?');
    expect(calls[0].values).toEqual(['scn_1']);
  });

  it('scenarios:delete is a soft-delete that stamps deleted_at, not a DELETE', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:delete', { id: 'scn_1', deletedAt: '2026-01-01' });
    expect(calls[0].sql).toContain('UPDATE scenarios SET deleted_at = ?');
    expect(calls[0].sql).not.toContain('DELETE FROM');
    expect(calls[0].values).toEqual(['2026-01-01', '2026-01-01', 'scn_1']);
  });

  it('scenarios:restore clears deleted_at', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:restore', { id: 'scn_1', updated: 'now' });
    expect(calls[0].sql).toContain('SET deleted_at = NULL');
    expect(calls[0].values).toEqual(['now', 'scn_1']);
  });

  it('trash:purge hard-deletes rows older than the cutoff', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'trash:purge', { cutoff: '2026-01-01' });
    const sqls = calls.map((c) => c.sql).join('\n');
    expect(sqls).toContain('DELETE FROM scenarios WHERE deleted_at IS NOT NULL AND deleted_at < ?');
    expect(sqls).toContain('DELETE FROM sessions WHERE deleted_at IS NOT NULL AND deleted_at < ?');
    // Four tables, four binds.
    expect(calls).toHaveLength(4);
  });

  it('trash:restore rejects an unknown kind rather than interpolating it', () => {
    const calls: Call[] = [];
    expect(() =>
      runOperation(makeStubDb(calls), 'trash:restore', { kind: 'evil; DROP TABLE x', id: '1', updated: 'now' })
    ).toThrow('Unknown trash kind');
    expect(calls).toHaveLength(0);
  });

  it('trash:restore maps a known kind to its table with a bound id', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'trash:restore', { kind: 'session', id: 'ses_1', updated: 'now' });
    expect(calls[0].sql).toBe('UPDATE sessions SET deleted_at = NULL, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual(['now', 'ses_1']);
  });

  it('sessions:update allowlists deleted_at so a restore can flow through update', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'sessions:update', {
      id: 'ses_1',
      fields: { deleted_at: null, updated: 'now' },
    });
    expect(calls[0].sql).toBe('UPDATE sessions SET deleted_at = ?, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual([null, 'now', 'ses_1']);
  });

  it('scenarios:pin sets the pinned flag to 1 or 0, never interpolates it', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:pin', { id: 'scn_1', pinned: true, updated: 'now' });
    expect(calls[0].sql).toBe('UPDATE scenarios SET pinned = ?, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual([1, 'now', 'scn_1']);

    runOperation(makeStubDb(calls), 'scenarios:pin', { id: 'scn_1', pinned: false, updated: 'now' });
    expect(calls[1].values).toEqual([0, 'now', 'scn_1']);
  });

  it('sessions:pin is the same shape for sessions', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'sessions:pin', { id: 'ses_1', pinned: true, updated: 'now' });
    expect(calls[0].sql).toBe('UPDATE sessions SET pinned = ?, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual([1, 'now', 'ses_1']);
  });

  it('sessions:update allowlists pinned', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'sessions:update', {
      id: 'ses_1',
      fields: { pinned: 1, updated: 'now' },
    });
    expect(calls[0].sql).toBe('UPDATE sessions SET pinned = ?, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual([1, 'now', 'ses_1']);
  });

  it('scenarios:listByProject scopes to one project, trashed rows hidden', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:listByProject', { projectId: 'proj_1' });
    expect(calls[0].sql).toContain('WHERE project_id = ? AND deleted_at IS NULL');
    expect(calls[0].sql).toContain('ORDER BY position IS NULL, position, name');
    expect(calls[0].values).toEqual(['proj_1']);
  });

  it('projects:create binds the name and defaults the colour', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'projects:create', {
      id: 'proj_1', name: 'Interviews', created: 'now', updated: 'now',
    });
    expect(calls[0].sql).toContain('INSERT INTO projects');
    expect(calls[0].values).toEqual(['proj_1', 'Interviews', null, '#3B82F6', 'now', 'now']);
  });

  it('projects:update only writes allowlisted columns', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'projects:update', {
      id: 'proj_1',
      fields: { name: 'Renamed', 'evil = 1; DROP TABLE x': 'pwned', updated: 'now' },
    });
    expect(calls[0].sql).toBe('UPDATE projects SET name = ?, updated = ? WHERE id = ?');
    expect(calls[0].values).toEqual(['Renamed', 'now', 'proj_1']);
  });

  it('scenarios:create accepts project_id and position', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:create', {
      id: 'scn_1', name: 'Step 2', description: '', category: '', difficulty: 'beginner',
      estimatedMinutes: 10, systemPrompt: '', initialMessage: '', tags: [], isPublic: 1,
      voice: 'female', projectId: 'proj_1', position: 2, created: 'now', updated: 'now',
    });
    expect(calls[0].sql).toContain('project_id, position');
    expect(calls[0].values).toContain('proj_1');
    expect(calls[0].values).toContain(2);
  });

  it('scenarios:bulkDelete soft-deletes each id, no DELETE', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:bulkDelete', { ids: ['a', 'b'], deletedAt: 'now' });
    expect(calls).toHaveLength(2);
    expect(calls[0].sql).toContain('UPDATE scenarios SET deleted_at = ?');
    expect(calls[0].sql).not.toContain('DELETE FROM');
    expect(calls[0].values).toEqual(['now', 'now', 'a']);
  });

  it('scenarios:bulkMove binds the target project (null when empty)', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:bulkMove', { ids: ['a'], projectId: 'proj_1', updated: 'now' });
    expect(calls[0].sql).toContain('SET project_id = ?');
    expect(calls[0].values).toEqual(['proj_1', 'now', 'a']);

    runOperation(makeStubDb(calls), 'scenarios:bulkMove', { ids: ['a'], projectId: '', updated: 'now' });
    expect(calls[1].values[0]).toBeNull();
  });

  it('sessions:bulkDelete soft-deletes each id', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'sessions:bulkDelete', { ids: ['s1'], deletedAt: 'now' });
    expect(calls[0].sql).toContain('UPDATE sessions SET deleted_at = ?');
    expect(calls[0].values).toEqual(['now', 'now', 's1']);
  });
});
