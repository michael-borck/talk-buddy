// First-run privacy choice. Shown once, before any network preference
// exists — a fresh install sends nothing anywhere until the user picks.
// "Private" keeps speech on-device and leaves the AI Brain unconfigured;
// "Community" opts into the project's hosted servers with a plain
// statement of what that means for their data.
import { useState } from 'react';
import { setPreference } from '../services/sqlite';
import { COMMUNITY_SERVERS } from '../services/config';
import { ShieldCheck, Globe } from 'lucide-react';

interface WelcomePageProps {
  onComplete: () => void;
}

export function WelcomePage({ onComplete }: WelcomePageProps) {
  const [saving, setSaving] = useState(false);

  const choose = async (mode: 'private' | 'community') => {
    setSaving(true);
    try {
      if (mode === 'private') {
        await setPreference('sttProvider', 'embedded');
        await setPreference('ttsProvider', 'embedded');
        // No chat provider configured — HomePage prompts to connect one.
      } else {
        await setPreference('sttProvider', 'speaches');
        await setPreference('ttsProvider', 'speaches');
        await setPreference('speachesUrl', COMMUNITY_SERVERS.speech);
        await setPreference('sttUrl', COMMUNITY_SERVERS.speech);
        await setPreference('ttsUrl', COMMUNITY_SERVERS.speech);
        await setPreference('chatProvider', 'ollama');
        await setPreference('ollamaUrl', COMMUNITY_SERVERS.chat);
        await setPreference('ollamaModel', COMMUNITY_SERVERS.chatModel);
      }
      await setPreference('onboardingComplete', 'true');
      onComplete();
    } catch (error) {
      console.error('Failed to save onboarding choice:', error);
      setSaving(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto animate-fade-in">
      <div className="max-w-[720px] mx-auto px-8 py-16">
        <div className="flex items-center mb-6">
          <span className="editorial-rule" aria-hidden="true" />
          <span className="text-[0.7rem] uppercase tracking-[0.22em] text-ink-muted font-medium">
            Welcome to Talk Buddy
          </span>
        </div>
        <h1 className="font-sans text-ink font-medium tracking-display text-[2.6rem] leading-tight mb-4">
          Before we begin: where should your voice go?
        </h1>
        <p className="text-[1rem] text-ink-muted leading-[1.7] font-sans mb-12 max-w-[52ch]">
          Talk Buddy practises spoken conversations with you. That involves
          turning your speech into text, and an AI generating replies. You
          choose where that happens — you can change it any time in Settings.
        </p>

        <div className="grid md:grid-cols-2 gap-5">
          <button
            onClick={() => choose('private')}
            disabled={saving}
            className="group text-left glass-card rounded-soft px-7 py-6 border-l-2 border-l-accent hover:border-accent transition-colors disabled:opacity-50"
          >
            <ShieldCheck size={20} strokeWidth={1.5} className="text-accent mb-4" />
            <h2 className="font-sans text-[1.25rem] text-ink font-medium mb-2">
              Private
              <span className="ml-2 text-[0.65rem] uppercase tracking-[0.14em] text-accent align-middle">
                Recommended
              </span>
            </h2>
            <p className="text-[0.88rem] text-ink-muted leading-relaxed font-sans mb-4">
              Speech is recognised and spoken on this device. Nothing leaves
              your machine. To converse, connect an AI of your choice in
              Settings — your own server or your own API key.
            </p>
            <span className="text-[0.85rem] font-sans text-ink group-hover:text-accent transition-colors border-b border-ink/30 group-hover:border-accent pb-0.5">
              Stay private →
            </span>
          </button>

          <button
            onClick={() => choose('community')}
            disabled={saving}
            className="group text-left glass-card rounded-soft px-7 py-6 hover:border-accent transition-colors disabled:opacity-50"
          >
            <Globe size={20} strokeWidth={1.5} className="text-ink-quiet mb-4" />
            <h2 className="font-sans text-[1.25rem] text-ink font-medium mb-2">
              Community servers
            </h2>
            <p className="text-[0.88rem] text-ink-muted leading-relaxed font-sans mb-4">
              Works immediately, no setup. Your voice audio and conversation
              text are sent to the Talk Buddy project&rsquo;s servers
              ({new URL(COMMUNITY_SERVERS.speech).hostname} and{' '}
              {new URL(COMMUNITY_SERVERS.chat).hostname}) for processing.
            </p>
            <span className="text-[0.85rem] font-sans text-ink group-hover:text-accent transition-colors border-b border-ink/30 group-hover:border-accent pb-0.5">
              Use community servers →
            </span>
          </button>
        </div>

        <p className="mt-10 text-[0.78rem] text-ink-quiet font-sans leading-relaxed max-w-[60ch]">
          Either way: your scenarios, transcripts, and analysis are stored
          only on this device.
        </p>
      </div>
    </div>
  );
}
