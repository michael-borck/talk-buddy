import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

window.matchMedia = vi.fn().mockReturnValue({
  matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
}) as any;

function mockBridge(prefs: Record<string, string>) {
  (window as any).electronAPI = {
    database: {
      op: vi.fn(async (name: string, params: any) => {
        if (name === 'prefs:get') {
          const v = prefs[params.key];
          return { success: true, data: v !== undefined ? [{ value: v }] : [] };
        }
        if (name === 'prefs:getAll') {
          return { success: true, data: Object.entries(prefs).map(([key, value]) => ({ key, value })) };
        }
        return { success: true, data: [] };
      }),
      reset: vi.fn(),
    },
    secrets: { get: vi.fn(async () => ''), set: vi.fn(async () => ({ success: true })) },
    app: { getVersion: vi.fn(async () => '0.0.0'), getPath: vi.fn(), getEnvVar: vi.fn(async () => null) },
  };
}

describe('first-run gate', () => {
  it('fresh install shows the privacy choice, not the home screen', async () => {
    mockBridge({});
    const { default: App } = await import('./App');
    render(<App />);
    expect(await screen.findByText(/where should your voice go/i)).toBeTruthy();
    expect(screen.getByText(/Stay private/)).toBeTruthy();
    expect(screen.getByText(/Use community servers/)).toBeTruthy();
    expect(screen.queryByText(/Good (morning|afternoon|evening)\./)).toBeNull();
  });

  it('onboarded install goes straight to home', async () => {
    mockBridge({ onboardingComplete: 'true' });
    const { default: App } = await import('./App');
    render(<App />);
    expect(await screen.findByText(/Good (morning|afternoon|evening)\./)).toBeTruthy();
  });
});
