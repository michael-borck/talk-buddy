// Conversation Style tab — how the AI Brain is told to behave.
import { DEFAULT_PROMPTS } from '../../services/chat';
import { useSettings } from './SettingsContext';

// Prompt templates
// UI metadata for each template. The actual `prompt` text is pulled
// from DEFAULT_PROMPTS in services/chat.ts — the single source of truth
// the LLM sees. That way "edit one place, not two."
const PROMPT_TEMPLATE_META = {
  natural:     { name: 'Natural Conversation',   description: 'Default conversational style for natural practice' },
  educational: { name: 'Educational/Detailed',   description: 'More detailed responses with gentle corrections' },
  concise:     { name: 'Brief/Concise',          description: 'Very short, to-the-point responses' },
  business:    { name: 'Business Professional',  description: 'Professional business communication style' },
  supportive:  { name: 'Supportive/Encouraging', description: 'Extra encouragement for language learners' },
} as const;

const PROMPT_TEMPLATES: Record<
  keyof typeof PROMPT_TEMPLATE_META,
  { name: string; description: string; prompt: string }
> = Object.fromEntries(
  (Object.keys(PROMPT_TEMPLATE_META) as Array<keyof typeof PROMPT_TEMPLATE_META>).map((key) => [
    key,
    {
      name: PROMPT_TEMPLATE_META[key].name,
      description: PROMPT_TEMPLATE_META[key].description,
      prompt: DEFAULT_PROMPTS[key],
    },
  ])
) as Record<keyof typeof PROMPT_TEMPLATE_META, { name: string; description: string; prompt: string }>;

export function StyleTab() {
  const { preferences, setPreferences } = useSettings();

  return (
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How the AI behaves in conversations</h2>
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conversation style
            </label>
            <select
              value={preferences.promptTemplate}
              onChange={(e) => {
                const template = e.target.value;
                setPreferences({ 
                  ...preferences, 
                  promptTemplate: template,
                  customPrompt: template === 'custom' ? preferences.customPrompt : ''
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="natural">Natural Conversation</option>
              <option value="educational">Educational/Detailed</option>
              <option value="concise">Brief/Concise</option>
              <option value="business">Business Professional</option>
              <option value="supportive">Supportive/Encouraging</option>
              <option value="custom">Custom</option>
            </select>
            
            {/* Template Description */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>{PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.name || 'Custom Template'}:</strong>
                {' '}
                {PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.description || 'Your personalized prompt configuration'}
              </p>
            </div>
          </div>

          {/* Prompt Text Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions for the AI
            </label>
            <textarea
              value={preferences.promptTemplate === 'custom' 
                ? preferences.customPrompt 
                : PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.prompt || ''}
              onChange={(e) => {
                if (preferences.promptTemplate === 'custom') {
                  setPreferences({ ...preferences, customPrompt: e.target.value });
                }
              }}
              disabled={preferences.promptTemplate !== 'custom'}
              rows={8}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                preferences.promptTemplate !== 'custom' ? 'bg-gray-50 text-gray-600' : ''
              }`}
              placeholder={preferences.promptTemplate === 'custom' ? 'Write your own instructions for the AI...' : 'These instructions are read-only. Pick "Custom" above to write your own.'}
            />
            <p className="mt-1 text-sm text-gray-600">
              {preferences.promptTemplate === 'custom'
                ? 'Write your own rules for how the AI should behave in conversations'
                : 'These instructions are built in. Pick "Custom" above to write your own.'
              }
            </p>
          </div>

          {/* Advanced Options */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Advanced</h3>
            <div className="space-y-3">
              {/* Prompt Behavior */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How should these instructions combine with each scenario?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="promptBehavior"
                      value="enhance"
                      checked={preferences.promptBehavior === 'enhance'}
                      onChange={() => setPreferences({ ...preferences, promptBehavior: 'enhance' })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Add to each scenario's instructions</span>
                      <span className="text-sm text-gray-600 ml-1">(recommended)</span>
                      <p className="text-sm text-gray-600">Your style instructions are combined with each scenario's own instructions</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="promptBehavior"
                      value="override"
                      checked={preferences.promptBehavior === 'override'}
                      onChange={() => setPreferences({ ...preferences, promptBehavior: 'override' })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Replace scenario instructions</span>
                      <p className="text-sm text-gray-600">Use only your style instructions, ignore what each scenario says</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="promptBehavior"
                      value="scenario-only"
                      checked={preferences.promptBehavior === 'scenario-only'}
                      onChange={() => setPreferences({ ...preferences, promptBehavior: 'scenario-only' })}
                      className="mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium">Use each scenario's own instructions only</span>
                      <p className="text-sm text-gray-600">Don't add your style instructions — let each scenario control the AI entirely</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={preferences.includeResponseFormat}
                  onChange={(e) => setPreferences({ ...preferences, includeResponseFormat: e.target.checked })}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Keep responses conversational</span>
                  <p className="text-sm text-gray-600">Tell the AI to respond like a real person, not a textbook</p>
                </div>
              </label>
              
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={preferences.addModelOptimizations}
                  onChange={(e) => setPreferences({ ...preferences, addModelOptimizations: e.target.checked })}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">Sound more natural</span>
                  <p className="text-sm text-gray-600">Encourage the AI to use contractions and informal language</p>
                </div>
              </label>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 mb-2">This is what the AI reads before each conversation:</p>
              <div className="bg-white rounded border p-3 text-sm font-mono text-gray-800 max-h-64 overflow-y-auto">
                {(() => {
                  let fullPrompt = '';
                  
                  // Base prompt
                  const basePrompt = preferences.promptTemplate === 'custom' 
                    ? preferences.customPrompt 
                    : PROMPT_TEMPLATES[preferences.promptTemplate as keyof typeof PROMPT_TEMPLATES]?.prompt || '';
                  
                  fullPrompt += basePrompt;
                  
                  // Add response format if enabled
                  if (preferences.includeResponseFormat) {
                    fullPrompt += '\n\nResponse Format Guidelines:\n- Keep responses natural and conversational\n- Ask one question at a time\n- Respond in a way that encourages continued dialogue';
                  }
                  
                  // Add model optimizations if enabled
                  if (preferences.addModelOptimizations) {
                    fullPrompt += '\n\nModel Instructions:\n- Prioritize clarity and engagement\n- Avoid repetitive patterns\n- Maintain consistency in tone and style';
                  }
                  
                  return fullPrompt || 'No prompt configured';
                })()}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {preferences.promptBehavior === 'override'
                  ? 'These instructions will be used for every conversation, replacing each scenario\'s own instructions.'
                  : preferences.promptBehavior === 'enhance'
                  ? 'These instructions will be added to each scenario\'s own instructions.'
                  : 'Each scenario uses its own instructions only — nothing is added.'
                }
              </p>
            </div>
          </div>
        </div>
      </section>
  );
}
