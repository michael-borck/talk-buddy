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
      'SELECT * FROM scenarios WHERE archived = 0 AND category = ? AND difficulty = ? ORDER BY name'
    );
    expect(calls[0].values).toEqual(['Business', 'beginner']);
  });

  it('omits filter conditions when no filter is provided', () => {
    const calls: Call[] = [];
    runOperation(makeStubDb(calls), 'scenarios:list', {});
    expect(calls[0].sql).toBe('SELECT * FROM scenarios WHERE archived = 0 ORDER BY name');
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
});
