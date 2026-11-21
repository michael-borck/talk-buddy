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
});
