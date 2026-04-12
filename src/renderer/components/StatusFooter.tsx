import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllPreferences } from '../services/sqlite';
import * as speechProvider from '../services/speechProvider';
import { CHAT_PROVIDER_URLS } from '../services/chat';

interface ServiceStatus {
  status: 'connected' | 'error' | 'checking' | 'unknown';
  message?: string;
}

type ChatProvider = 'ollama' | 'anthropic' | 'openai' | 'groq' | 'gemini' | 'custom';

// The chat service reuses the legacy `ollamaUrl` / `ollamaApiKey` pref
// names for ALL providers — see src/renderer/services/chat.ts where
// those keys are explicitly kept "for backward compatibility." The
// provider only switches the endpoint PATH, not the base URL key.
interface FooterPrefs {
  sttUrl: string;
  ttsUrl: string;
  chatProvider: ChatProvider;
  chatUrl: string;      // reads from `ollamaUrl` pref
  chatApiKey: string;   // reads from `ollamaApiKey` pref
}

const EMPTY_PREFS: FooterPrefs = {
  sttUrl: '',
  ttsUrl: '',
  chatProvider: 'ollama',
  chatUrl: '',
  chatApiKey: '',
};

export function StatusFooter() {
  const [statuses, setStatuses] = useState<{
    stt: ServiceStatus;
    tts: ServiceStatus;
    chat: ServiceStatus;
  }>({
    stt: { status: 'unknown' },
    tts: { status: 'unknown' },
    chat: { status: 'unknown' },
  });

  // Keep preferences in a ref so the polling interval + event listener
  // always read the current values. Otherwise we hit a closure-stale
  // bug where the interval fires with EMPTY_PREFS forever.
  const prefsRef = useRef<FooterPrefs>(EMPTY_PREFS);
  const [appVersion, setAppVersion] = useState('');

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await getAllPreferences();
      const provider = (prefs.chatProvider as ChatProvider) || 'ollama';
      // Hosted providers have hardcoded URLs — don't trust the stored
      // pref for those, it may be stale from a previous choice.
      const chatUrl =
        provider === 'anthropic' || provider === 'openai' ||
        provider === 'groq'      || provider === 'gemini'
          ? CHAT_PROVIDER_URLS[provider]
          : prefs.ollamaUrl || '';
      prefsRef.current = {
        sttUrl: prefs.sttUrl || '',
        ttsUrl: prefs.ttsUrl || '',
        chatProvider: provider,
        chatUrl,
        chatApiKey: prefs.ollamaApiKey || '',
      };
    } catch (error) {
      console.error('StatusFooter: failed to load preferences', error);
    }
  }, []);

  const checkChatStatus = useCallback(async (): Promise<ServiceStatus> => {
    const prefs = prefsRef.current;
    if (!prefs.chatUrl) {
      return { status: 'unknown', message: 'Not configured' };
    }
    const cleanUrl = prefs.chatUrl.endsWith('/') ? prefs.chatUrl.slice(0, -1) : prefs.chatUrl;

    // Resolve env:VAR -> real value via main process. Renderer can't
    // see the shell environment directly.
    let apiKey = prefs.chatApiKey;
    if (apiKey.startsWith('env:')) {
      try {
        apiKey = (await window.electronAPI.app.getEnvVar(apiKey.substring(4))) || '';
      } catch {
        apiKey = '';
      }
    }

    // Gemini is special: key goes in ?key=... query string, no header,
    // and the model list endpoint is /v1beta/models.
    if (prefs.chatProvider === 'gemini') {
      try {
        const url = `${cleanUrl}/v1beta/models${apiKey ? `?key=${encodeURIComponent(apiKey)}` : ''}`;
        const response = await window.electronAPI.fetch({
          url,
          options: { method: 'GET', headers: {} },
        });
        if (response.ok || response.status === 401 || response.status === 403) {
          return { status: 'connected', message: 'Online' };
        }
        return { status: 'error', message: `HTTP ${response.status}` };
      } catch {
        return { status: 'error', message: 'Unreachable' };
      }
    }

    // Everyone else: header-based auth, endpoint-scan.
    const headers: Record<string, string> = {};
    if (apiKey) {
      if (prefs.chatProvider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    // Endpoint order: OpenAI-compatible first (covers OpenAI, Groq,
    // Anthropic, Speaches-for-chat); then Ollama's native paths; then
    // generic health probes. Treat 401/403 as reachable-but-rejected.
    const endpoints = [
      '/v1/models',
      '/api/tags',
      '/api/version',
      '/health',
      '/',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await window.electronAPI.fetch({
          url: `${cleanUrl}${endpoint}`,
          options: { method: 'GET', headers },
        });
        if (response.ok || response.status === 401 || response.status === 403) {
          return { status: 'connected', message: 'Online' };
        }
      } catch {
        // try the next endpoint
      }
    }

    return { status: 'error', message: 'Unreachable' };
  }, []);

  const checkAllStatuses = useCallback(async () => {
    const prefs = prefsRef.current;
    // Even if no URLs are configured we still want the UI to show
    // something — mark them all as Unknown instead of skipping entirely.
    if (!prefs.sttUrl && !prefs.ttsUrl && !prefs.chatProvider) {
      setStatuses({
        stt: { status: 'unknown', message: 'Not configured' },
        tts: { status: 'unknown', message: 'Not configured' },
        chat: { status: 'unknown', message: 'Not configured' },
      });
      return;
    }

    setStatuses((prev) => ({
      stt: { ...prev.stt, status: 'checking' },
      tts: { ...prev.tts, status: 'checking' },
      chat: { ...prev.chat, status: 'checking' },
    }));

    const [sttResult, ttsResult, chatResult] = await Promise.allSettled([
      speechProvider.checkSTTConnection(),
      speechProvider.checkTTSConnection(),
      checkChatStatus(),
    ]);

    setStatuses({
      stt:
        sttResult.status === 'fulfilled'
          ? sttResult.value
            ? { status: 'connected', message: 'Online' }
            : { status: 'error', message: 'Offline' }
          : { status: 'error', message: 'Check failed' },
      tts:
        ttsResult.status === 'fulfilled'
          ? ttsResult.value
            ? { status: 'connected', message: 'Online' }
            : { status: 'error', message: 'Offline' }
          : { status: 'error', message: 'Check failed' },
      chat:
        chatResult.status === 'fulfilled'
          ? chatResult.value
          : { status: 'error', message: 'Check failed' },
    });
  }, [checkChatStatus]);

  useEffect(() => {
    // Initial load + first check (deferred so preferences populate first).
    void loadPreferences().then(() => {
      void checkAllStatuses();
    });

    // Poll every 30s (reads prefsRef, so it's always current).
    const interval = setInterval(() => {
      void checkAllStatuses();
    }, 30000);

    // Cross-component refresh: when Settings → Test finishes it dispatches
    // this custom event so the footer updates without waiting for the
    // next poll window.
    const handleRefreshEvent = () => {
      void loadPreferences().then(() => {
        void checkAllStatuses();
      });
    };
    window.addEventListener('talkbuddy:status-refresh', handleRefreshEvent);

    // App version
    if (window.electronAPI?.app?.getVersion) {
      window.electronAPI.app.getVersion().then(setAppVersion);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('talkbuddy:status-refresh', handleRefreshEvent);
    };
  }, [loadPreferences, checkAllStatuses]);

  const dotColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'text-accent';
      case 'error':
        return 'text-error';
      case 'checking':
        return 'text-paper/60';
      case 'unknown':
      default:
        return 'text-paper/30';
    }
  };

  const labelText = (status: ServiceStatus['status'], message?: string) => {
    switch (status) {
      case 'connected':
        return message || 'Online';
      case 'error':
        return message || 'Offline';
      case 'checking':
        return 'Checking';
      case 'unknown':
      default:
        return message || 'Unknown';
    }
  };

  const handleRefresh = () => {
    void loadPreferences().then(() => {
      void checkAllStatuses();
    });
  };

  return (
    <footer className="bg-ink text-paper px-8 py-2.5 text-[0.72rem] font-sans border-t border-ink/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-7">
          <StatusCell
            label="STT"
            status={statuses.stt}
            dotColor={dotColor}
            labelText={labelText}
            onClick={handleRefresh}
          />
          <StatusCell
            label="TTS"
            status={statuses.tts}
            dotColor={dotColor}
            labelText={labelText}
            onClick={handleRefresh}
          />
          <StatusCell
            label="Chat"
            status={statuses.chat}
            dotColor={dotColor}
            labelText={labelText}
            onClick={handleRefresh}
          />
        </div>
        <div className="text-paper/40 text-[0.68rem] tracking-wide uppercase">
          Talk Buddy {appVersion ? `v${appVersion}` : ''}
        </div>
      </div>
    </footer>
  );
}

interface StatusCellProps {
  label: string;
  status: ServiceStatus;
  dotColor: (s: ServiceStatus['status']) => string;
  labelText: (s: ServiceStatus['status'], m?: string) => string;
  onClick: () => void;
}

function StatusCell({ label, status, dotColor, labelText, onClick }: StatusCellProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 hover:text-paper transition-colors"
      title="Click to refresh status"
    >
      <span className={`${dotColor(status.status)} leading-none text-[0.7rem]`} aria-hidden="true">
        ●
      </span>
      <span className="text-paper/50 uppercase tracking-[0.14em]">{label}</span>
      <span className="text-paper/90">{labelText(status.status, status.message)}</span>
    </button>
  );
}
