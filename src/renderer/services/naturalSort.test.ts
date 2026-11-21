import { describe, it, expect } from 'vitest';
import { naturalCompare, sortByName } from './naturalSort';

describe('naturalCompare', () => {
  it('orders numbered names numerically, not lexically', () => {
    const names = ['Step 10', 'Step 2', 'Step 1'];
    const sorted = names.slice().sort(naturalCompare);
    expect(sorted).toEqual(['Step 1', 'Step 2', 'Step 10']);
  });

  it('handles leading numbers', () => {
    const names = ['10. Ten', '2. Two', '1. One'];
    expect(names.slice().sort(naturalCompare)).toEqual(['1. One', '2. Two', '10. Ten']);
  });

  it('is case-insensitive for text', () => {
    expect(naturalCompare('apple', 'Banana')).toBeLessThan(0);
  });

  it('falls back to text when there are no numbers', () => {
    expect(naturalCompare('alpha', 'beta')).toBeLessThan(0);
  });
});

describe('sortByName', () => {
  it('sorts by name naturally by default', () => {
    const items = [{ name: 'Step 10' }, { name: 'Step 2' }, { name: 'Step 1' }];
    expect(sortByName(items).map((i) => i.name)).toEqual(['Step 1', 'Step 2', 'Step 10']);
  });

  it('lets position take precedence over name', () => {
    const items = [
      { name: 'A', position: 2 },
      { name: 'B', position: 1 },
      { name: 'C', position: null },
    ];
    // Positioned items first (by position), then unpositioned by name.
    expect(sortByName(items).map((i) => i.name)).toEqual(['B', 'A', 'C']);
  });

  it('does not mutate the input', () => {
    const items = [{ name: 'b' }, { name: 'a' }];
    sortByName(items);
    expect(items.map((i) => i.name)).toEqual(['b', 'a']);
  });

  it('treats a missing name as empty', () => {
    expect(sortByName([{ name: null }, { name: 'a' }]).map((i) => i.name)).toEqual([null, 'a']);
  });
});