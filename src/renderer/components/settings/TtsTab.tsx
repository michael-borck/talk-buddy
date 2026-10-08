// Voice tab — where the reply is spoken: the in-app Piper engine
// (Alan & Amy) or a Speaches-compatible cloud server (Kokoro).
import { Cpu, ExternalLink } from 'lucide-react';
import { PiperPanel } from '../PiperPanel';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelSelector } from './ModelSelector';
import { useSettings } from './SettingsContext';

export function TtsTab() {
  const {
    preferences, setPreferences, handleProviderChange, testService,
    testing, testResults, models, loadingModels, modelErrors, fetchModels,
  } = useSettings();

  return (
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How Talk Buddy speaks to you</h2>
        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Where should the voice come from?
            </label>
            <div className="flex gap-4 mb-4 items-center">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="piper"
                  checked={preferences.ttsProvider === 'piper'}
                  onChange={(e) => handleProviderChange('ttsProvider', e.target.value as 'piper' | 'speaches')}
                  className="mr-2"
                />
                <Cpu size={16} className="mr-1" />
                <span>Built-in (works offline)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="speaches"
                  checked={preferences.ttsProvider === 'speaches'}
                  onChange={(e) => handleProviderChange('ttsProvider', e.target.value as 'piper' | 'speaches')}
                  className="mr-2"
                />
                <ExternalLink size={16} className="mr-1" />
                <span>Cloud server</span>
              </label>
            </div>
            <p className="text-sm text-gray-600">
              {preferences.ttsProvider === 'piper'
                ? 'Speaks with the Alan & Amy voices, run by a small engine inside the app — no internet, no server, one download'
                : 'Sends text to a cloud server which speaks it back — needs internet'
              }
            </p>
          </div>

          {/* In-app (piper) model management */}
          {preferences.ttsProvider === 'piper' && (
            <PiperPanel />
          )}

          {/* Voice selection + speed for the in-app engine */}
          {preferences.ttsProvider === 'piper' && (
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose a voice
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Male Voice
                </label>
                <select
                  value="alan"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                >
                  <option value="alan">Alan (British)</option>
                </select>
                <p className="mt-1 text-sm text-gray-600">
                  Voice used when a scenario calls for a male character
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Female Voice
                </label>
                <select
                  value="amy"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                >
                  <option value="amy">Amy (American)</option>
                </select>
                <p className="mt-1 text-sm text-gray-600">
                  Voice used when a scenario calls for a female character
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              💡 You can use Alan for all conversations or Amy for all conversations regardless of scenario gender
            </p>

            {/* Speech Speed Control */}
            <div className="mt-4 border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice speed
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 min-w-[2rem]">Slower</span>
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.1"
                  value={preferences.embeddedSpeechSpeed}
                  onChange={(e) => setPreferences({ ...preferences, embeddedSpeechSpeed: e.target.value })}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-sm text-gray-500 min-w-[2rem]">Faster</span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Drag left for slower speech, right for faster.
              </p>
            </div>
          </div>
          )}

          {/* URL Configuration - show based on provider */}
          {preferences.ttsProvider === 'speaches' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={preferences.ttsUrl}
                onChange={(e) => setPreferences({ ...preferences, ttsUrl: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://speaches.locopuente.org"
              />
              <button
                onClick={() => testService('tts')}
                disabled={testing.tts || !preferences.ttsUrl}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing.tts ? 'Testing...' : 'Test'}
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              The address of the voice server
            </p>
            {testResults.tts && (
              <p className={`mt-2 text-sm ${testResults.tts.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.tts}
              </p>
            )}
          </div>
          )}

          {preferences.ttsProvider === 'speaches' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret key (if needed)
            </label>
            <ApiKeyInput
              value={preferences.ttsApiKey}
              onChange={(value) => setPreferences({ ...preferences, ttsApiKey: value })}
              placeholder="Leave empty if not required"
              envVarName="TTS_API_KEY"
              fieldName="ttsApiKey"
            />
            <p className="mt-1 text-sm text-gray-600">
              {preferences.ttsApiKey?.startsWith('env:')
                ? `Reading key from your computer's settings (${preferences.ttsApiKey.substring(4)})`
                : 'Your server password — leave empty if your server doesn\'t need one'}
            </p>
          </div>
          )}

          {/* External TTS Configuration - only show when external provider selected */}
          {preferences.ttsProvider === 'speaches' && (
          <>
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Voice
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="male"
                    checked={preferences.voice === 'male'}
                    onChange={(e) => setPreferences({ ...preferences, voice: e.target.value as 'male' | 'female' })}
                    className="mr-2"
                  />
                  <span>Male</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="female"
                    checked={preferences.voice === 'female'}
                    onChange={(e) => setPreferences({ ...preferences, voice: e.target.value as 'male' | 'female' })}
                    className="mr-2"
                  />
                  <span>Female</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voice speed
              </label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="2.0"
                value={preferences.ttsSpeed}
                onChange={(e) => setPreferences({ ...preferences, ttsSpeed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1.25"
              />
              <p className="mt-1 text-sm text-gray-600">
                How fast the AI speaks (0.5 = slow, 1.0 = normal, 2.0 = fast)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your-turn cue
              </label>
              <select
                value={preferences.conversationCue}
                onChange={(e) => setPreferences({ ...preferences, conversationCue: e.target.value as 'rise' | 'click' | 'none' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="rise">Rise — a soft two-note lift</option>
                <option value="click">Click — a quick tactile tick</option>
                <option value="none">None — silence</option>
              </select>
              <p className="mt-1 text-sm text-gray-600">
                Subtle audio cue played when the AI finishes speaking and it's your turn.
                Respects the mute toggle in the conversation view.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hands-free conversation
              </label>
              <select
                value={preferences.inputMode}
                onChange={(e) => setPreferences({ ...preferences, inputMode: e.target.value as 'hands-free' | 'ptt' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hands-free">On — just talk; a short pause hands the turn over</option>
                <option value="ptt">Off — push-to-talk (hold or tap space)</option>
              </select>
              <p className="mt-1 text-sm text-gray-600">
                Hands-free listens automatically when it&apos;s your turn and detects when you
                stop speaking. You can also flip this anytime with the wave icon inside a
                conversation.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Push-to-talk mode
              </label>
              <select
                value={preferences.pttMode}
                onChange={(e) => setPreferences({ ...preferences, pttMode: e.target.value as 'hold' | 'toggle' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="hold">Hold — press and hold space to talk</option>
                <option value="toggle">Toggle — tap space to start, tap again to stop</option>
              </select>
              <p className="mt-1 text-sm text-gray-600">
                Used when hands-free is off. Hold works like a walkie-talkie. Toggle is
                friendlier for longer turns or for users who find holding a key awkward.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appearance
              </label>
              <select
                value={preferences.theme}
                onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'system' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="system">Match system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="mt-1 text-sm text-gray-600">
                Dark mode is designed for late-night practice — the warm-paper-and-soft-ink
                character is preserved, just inverted.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ModelSelector
                value={preferences.maleTTSModel}
                onChange={(value) => setPreferences({ ...preferences, maleTTSModel: value })}
                placeholder="Choose a male voice model"
                models={models.tts}
                loading={loadingModels.tts}
                error={modelErrors.tts}
                onRefresh={() => fetchModels('tts')}
                label="Male voice model"
                description="Which voice engine to use for male speakers"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Male voice name
                </label>
                <input
                  type="text"
                  value={preferences.maleVoice}
                  onChange={(e) => setPreferences({ ...preferences, maleVoice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="am_adam"
                />
                <p className="mt-1 text-sm text-gray-600">
                  The specific voice for male speakers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ModelSelector
                value={preferences.femaleTTSModel}
                onChange={(value) => setPreferences({ ...preferences, femaleTTSModel: value })}
                placeholder="Choose a female voice model"
                models={models.tts}
                loading={loadingModels.tts}
                error={modelErrors.tts}
                onRefresh={() => fetchModels('tts')}
                label="Female voice model"
                description="Which voice engine to use for female speakers"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Female voice name
                </label>
                <input
                  type="text"
                  value={preferences.femaleVoice}
                  onChange={(e) => setPreferences({ ...preferences, femaleVoice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="af_bella"
                />
                <p className="mt-1 text-sm text-gray-600">
                  The specific voice for female speakers
                </p>
              </div>
            </div>
          </>
          )}
        </div>
      </section>
  );
}
