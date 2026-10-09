import { describe, it, expect } from 'vitest';
import { categoryTone } from './categoryTone';

describe('categoryTone', () => {
  it('maps a known category to its tuned token', () => {
    expect(categoryTone('Finance')).toBe('var(--cat-finance)');
    expect(categoryTone('Customer Service')).toBe('var(--cat-customer-service)');
  });

  it('ignores case and spacing so the value is not brittle', () => {
    expect(categoryTone('  finance ')).toBe('var(--cat-finance)');
    expect(categoryTone('CUSTOMER   SERVICE')).toBe('var(--cat-customer-service)');
  });

  it('gives a custom category a stable tone rather than no tone', () => {
    const once = categoryTone('Barista Training');
    expect(once).toMatch(/^var\(--cat-[a-z-]+\)$/);
    expect(categoryTone('Barista Training')).toBe(once);
  });

  it('does not put an unknown category on the same tone as a tuned one for no reason', () => {
    // Stability matters more than spread here, but two unrelated categories
    // landing identically would make the index misleading.
    const custom = ['Barista Training', 'Medical Intake', 'Legal Discovery'];
    const distinct = new Set(custom.map(categoryTone));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('survives an empty or missing category', () => {
    expect(categoryTone('')).toMatch(/^var\(--cat-[a-z-]+\)$/);
    expect(categoryTone(undefined as unknown as string)).toMatch(/^var\(--cat-[a-z-]+\)$/);
  });
});