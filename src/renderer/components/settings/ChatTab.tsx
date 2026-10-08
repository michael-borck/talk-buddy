// AI Brain tab — which model generates the reply, and its credentials.
import { CHAT_PROVIDER_URLS, CHAT_PROVIDER_ENV_VARS } from '../../services/chat';
import { ApiKeyInput } from './ApiKeyInput';
import { ModelSelector } from './ModelSelector';
import { useSettings } from './SettingsContext';

export function ChatTab() {
  const {
    preferences, setPreferences, testService,
    testing, testResults, models, loadingModels, modelErrors, fetchModels,
  } = useSettings();

  return (
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">The AI that drives conversations</h2>
        <div className="space-y-4">
          {/* Provider Selection — one decision, shown as cards. The
              fields below adapt to the choice. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which AI service should power your conversations?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'anthropic', label: 'Anthropic (Claude)', hint: 'Paste a key' },
                { value: 'openai', label: 'OpenAI (GPT)', hint: 'Paste a key' },
                { value: 'gemini', label: 'Google (Gemini)', hint: 'Paste a key' },
                { value: 'groq', label: 'Groq', hint: 'Paste a key' },
                { value: 'ollama', label: 'Ollama', hint: 'Local & private — no key' },
                { value: 'custom', label: 'Custom / Other', hint: 'Any OpenAI-compatible endpoint' }
              ].map(provider => {
                const selected = preferences.chatProvider === provider.value;
                return (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => setPreferences({ ...preferences, chatProvider: provider.value as any })}
                    className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`block text-sm font-medium ${selected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {provider.label}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">{provider.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL field: editable for Ollama/Custom, read-only for hosted
              providers that have canonical endpoints. */}
          {(preferences.chatProvider === 'anthropic' ||
            preferences.chatProvider === 'openai' ||
            preferences.chatProvider === 'groq' ||
            preferences.chatProvider === 'gemini') ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 px-4 py-2 border border-ink/10 bg-paper-warm text-ink-muted font-mono text-sm">
                  {CHAT_PROVIDER_URLS[preferences.chatProvider as keyof typeof CHAT_PROVIDER_URLS]}
                </div>
                <button
                  onClick={() => testService('chat')}
                  disabled={testing.chat}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing.chat ? 'Testing...' : 'Test'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Connected automatically — nothing to configure.
              </p>
              {testResults.chat && (
                <p className={`mt-2 text-sm ${testResults.chat.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.chat}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Server address
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={preferences.ollamaUrl}
                  onChange={(e) => setPreferences({ ...preferences, ollamaUrl: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={
                    preferences.chatProvider === 'ollama' ? "http://localhost:11434 or https://ollama.serveur.au" :
                    "Enter API endpoint URL"
                  }
                />
                <button
                  onClick={() => testService('chat')}
                  disabled={testing.chat || !preferences.ollamaUrl}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing.chat ? 'Testing...' : 'Test'}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {preferences.chatProvider === 'ollama'
                  ? 'Where your Ollama server is running'
                  : 'The address of your custom AI service'}
              </p>
              {testResults.chat && (
                <p className={`mt-2 text-sm ${testResults.chat.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.chat}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret key{preferences.chatProvider === 'ollama' ? ' (usually not needed)' : ''}
            </label>
            <ApiKeyInput
              value={preferences.ollamaApiKey}
              onChange={(value) => setPreferences({ ...preferences, ollamaApiKey: value })}
              placeholder={
                preferences.chatProvider === 'anthropic' ? 'sk-ant-... or leave empty' :
                preferences.chatProvider === 'openai' ? 'sk-... or leave empty' :
                preferences.chatProvider === 'groq' ? 'gsk_... or leave empty' :
                preferences.chatProvider === 'gemini' ? 'AIza... or leave empty' :
                'Leave empty for local services'
              }
              envVarName={CHAT_PROVIDER_ENV_VARS[preferences.chatProvider as keyof typeof CHAT_PROVIDER_ENV_VARS] || 'API_KEY'}
              fieldName="chatApiKey"
            />
            <p className="mt-1 text-sm text-gray-600">
              {preferences.ollamaApiKey?.startsWith('env:')
                ? `Reading key from your computer's settings (${preferences.ollamaApiKey.substring(4)})`
                : preferences.chatProvider === 'ollama'
                  ? 'Your Ollama password — leave empty if you don\'t have one'
                  : 'The secret key from your AI provider — you get this when you sign up'}
            </p>
          </div>

          <ModelSelector
            value={preferences.ollamaModel}
            onChange={(value) => setPreferences({ ...preferences, ollamaModel: value })}
            placeholder="Choose an AI model"
            models={models.chat}
            loading={loadingModels.chat}
            error={modelErrors.chat}
            onRefresh={() => fetchModels('chat')}
            label="AI model"
            description="Which AI model should power your conversations"
          />
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer select-none hover:text-gray-700">
              Not sure which model to pick?
            </summary>
            <div className="mt-2 space-y-1">
              <p>• Claude (Anthropic): claude-sonnet-4-5, claude-haiku-4-5</p>
              <p>• GPT (OpenAI): gpt-4o, gpt-4o-mini</p>
              <p>• Gemini (Google): gemini-1.5-flash, gemini-1.5-pro</p>
              <p>• Ollama (local): llama3, mistral, phi3</p>
            </div>
          </details>
        </div>
      </section>
  );
}
