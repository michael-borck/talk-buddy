import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// React logs caught render errors to console.error; silence them so the
// test output stays readable, and assert the tap separately.
function Boom(): JSX.Element {
  throw new Error('kaboom from a child');
}

describe('ErrorBoundary', () => {
  it('renders children when nothing crashes', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeTruthy();
  });

  it('catches a render crash and reassures about saved conversations', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
    // The promise Studio Calm makes: nothing was lost.
    expect(screen.getByText(/saved on this device/i)).toBeTruthy();
    expect(screen.getByText(/kaboom from a child/)).toBeTruthy();
    // The crash reaches the console tap, so Diagnostics can report it.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('offers both a retry and a reload escape hatch', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reload app/i })).toBeTruthy();
    spy.mockRestore();
  });
});
