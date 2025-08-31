import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  createScenario, 
  updateScenario, 
  getScenario,
  listPacks,
  getScenarioPacks,
  addScenarioToPack,
  removeScenarioFromPack
} from '../services/sqlite';
import { Pack } from '../types';
import { Save, X, Plus, Package } from 'lucide-react';

export function ScenarioFormPage() {
  const navigate = useNavigate();
  const { scenarioId } = useParams();
  const isEditing = !!scenarioId;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [availablePacks, setAvailablePacks] = useState<Pack[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [originalPacks, setOriginalPacks] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    estimatedMinutes: 10,
    systemPrompt: '',
    initialMessage: '',
    tags: [] as string[],
    isPublic: true,
    voice: 'male' as 'male' | 'female'
  });

  useEffect(() => {
    loadPacks();
    if (isEditing && scenarioId) {
      loadScenario();
    }
  }, [scenarioId]);

  const loadPacks = async () => {
    try {
      const packs = await listPacks();
      setAvailablePacks(packs);
    } catch (error) {
      console.error('Failed to load packs:', error);
    }
  };

  const loadScenario = async () => {
    if (!scenarioId) return;
    
    setLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      if (scenario) {
        setFormData({
          name: scenario.name,
          description: scenario.description,
          category: scenario.category,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
          systemPrompt: scenario.systemPrompt,
          initialMessage: scenario.initialMessage,
          tags: scenario.tags || [],
          isPublic: scenario.isPublic || false,
          voice: scenario.voice || 'male'
        });
        
        // Load scenario's current packs
        const scenarioPacks = await getScenarioPacks(scenarioId);
        const packIds = scenarioPacks.map(p => p.id);
        setSelectedPacks(packIds);
        setOriginalPacks(packIds);
      } else {
        alert('Scenario not found');
        navigate('/scenarios/local');
      }
    } catch (error) {
      console.error('Failed to load scenario:', error);
      alert('Failed to load scenario');
      navigate('/scenarios/local');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      let savedScenarioId: string;
      
      if (isEditing && scenarioId) {
        await updateScenario(scenarioId, formData);
        savedScenarioId = scenarioId;
      } else {
        const newScenario = await createScenario(formData);
        savedScenarioId = newScenario.id;
      }
      
      // Update pack assignments
      await updatePackAssignments(savedScenarioId);
      
      navigate('/scenarios');
    } catch (error) {
      console.error('Failed to save scenario:', error);
      alert('Failed to save scenario. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePackAssignments = async (scenarioId: string) => {
    // Remove from packs that are no longer selected
    const packsToRemove = originalPacks.filter(packId => !selectedPacks.includes(packId));
    for (const packId of packsToRemove) {
      await removeScenarioFromPack(packId, scenarioId);
    }
    
    // Add to newly selected packs
    const packsToAdd = selectedPacks.filter(packId => !originalPacks.includes(packId));
    for (const packId of packsToAdd) {
      await addScenarioToPack(packId, scenarioId);
    }
  };

  const togglePackSelection = (packId: string) => {
    setSelectedPacks(prev => 
      prev.includes(packId) 
        ? prev.filter(id => id !== packId)
        : [...prev, packId]
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const defaultSystemPrompts = {
    'job-interview': `You are conducting a job interview. Be professional, ask relevant questions about the candidate's experience and skills, and provide a realistic interview experience. Keep responses concise and natural.`,
    'customer-service': `You are a customer service representative. Be helpful, patient, and professional. Address the customer's concerns and try to resolve their issues effectively.`,
    'restaurant': `You are a waiter at a restaurant. Be friendly and helpful, take orders, answer questions about the menu, and provide good service.`,
    'hotel': `You are a hotel receptionist. Help guests with check-in/check-out, answer questions about amenities, and handle requests professionally.`
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scenario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {isEditing ? 'Edit Scenario' : 'Create New Scenario'}
        </h1>
        <p className="text-gray-600">
          Design a conversation scenario for practice
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scenario Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Coffee Shop Order"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Describe what the user will practice in this scenario"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Restaurant, Business"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.estimatedMinutes}
                onChange={(e) => setFormData({ ...formData, estimatedMinutes: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Voice
              </label>
              <select
                value={formData.voice}
                onChange={(e) => setFormData({ ...formData, voice: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">AI Configuration</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Prompt
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={6}
              placeholder="Instructions for the AI on how to behave in this scenario..."
            />
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Quick templates:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(defaultSystemPrompts).map(([key, prompt]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, systemPrompt: prompt })}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                  >
                    {key.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial AI Message
            </label>
            <textarea
              value={formData.initialMessage}
              onChange={(e) => setFormData({ ...formData, initialMessage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="The first message the AI will say to start the conversation..."
            />
          </div>
        </div>

        {/* Practice Packs */}
        {availablePacks.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Practice Packs</h2>
            <p className="text-sm text-gray-600">Select which practice packs this scenario should belong to</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availablePacks.map((pack) => (
                <label
                  key={pack.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPacks.includes(pack.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPacks.includes(pack.id)}
                    onChange={() => togglePackSelection(pack.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: pack.color }}></div>
                  <Package size={16} className="text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{pack.name}</div>
                    {pack.description && (
                      <div className="text-xs text-gray-600">{pack.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Tags</h2>
          
          <div>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-blue-900"
                  >
                    <X size={16} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/scenarios')}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {saving ? 'Saving...' : (isEditing ? 'Update Scenario' : 'Create Scenario')}
          </button>
        </div>
      </form>
    </div>
  );
}