// ErrorBoundary — the app's last line of defence.
//
// Without one, a render crash anywhere in the tree unmounts everything and
// leaves a blank white window with no way back but a reload. For an app
// whose core loop is "speak for ten uninterrupted minutes", that reads as
// "my conversation is gone" — so the fallback says otherwise, truthfully:
// transcripts are persisted per Turn, in SQLite, before this point.
//
// Renders plain DOM (no router, no hooks) so it works even when the crash
// came from a provider above it.
import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Console tap in services/diagnostics captures this into the report the
    // user can copy from Settings → Diagnostics.
    console.error('[ui] render crash:', error.message, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-full flex items-center justify-center px-8 py-16">
        <div className="max-w-md w-full">
          <p className="text-[0.68rem] uppercase tracking-[0.2em] text-accent font-medium mb-4">
            Something went wrong
          </p>
          <h1 className="font-sans text-ink font-medium tracking-display text-[1.75rem] leading-tight mb-4">
            This screen didn&rsquo;t load.
          </h1>
          <p className="text-[0.95rem] text-ink-muted leading-relaxed mb-2">
            Your conversations are saved on this device — nothing was lost. You
            can try again, or reload the app.
          </p>
          {error.message && (
            <p className="text-[0.8rem] text-ink-quiet font-mono mb-8 break-words">
              {error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={this.reset} className="btn-gradient px-6 py-3 text-[0.92rem]">
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-[0.92rem] text-ink-muted hover:text-accent transition-colors"
            >
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
