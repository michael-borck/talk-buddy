import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pb, type Scenario } from '../services/pocketbase';

interface FormData {
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  systemPrompt: string;
  initialMessage: string;
  voice: 'male' | 'female';
  tags: string[];
  isPublic: boolean;
}

const CATEGORIES = [
  'technical',
  'behavioral', 
  'academic',
  'medical',
  'language',
  'custom'
];

export function ScenarioFormPage() {
  const navigate = useNavigate();
  const { scenarioId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'custom',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    systemPrompt: '',
    initialMessage: '',
    voice: 'female',
    tags: [],
    isPublic: false
  });

  const isEditing = !!scenarioId;

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, navigate]);

  // Load scenario for editing
  useEffect(() => {
    if (isEditing && scenarioId) {
      loadScenario(scenarioId);
    }
  }, [isEditing, scenarioId]);

  const loadScenario = async (id: string) => {
    setLoading(true);
    try {
      const scenario = await pb.collection('scenarios').getOne<Scenario>(id);
      
      // Check if user owns this scenario
      if (scenario.createdBy !== user?.id) {
        setError('You can only edit scenarios you created');
        return;
      }

      setFormData({
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        difficulty: scenario.difficulty,
        estimatedMinutes: scenario.estimatedMinutes,
        systemPrompt: scenario.systemPrompt,
        initialMessage: scenario.initialMessage,
        voice: scenario.voice || 'female',
        tags: scenario.tags || [],
        isPublic: scenario.isPublic
      });

      setTagsInput(scenario.tags?.join(', ') || '');
    } catch (err) {
      setError('Failed to load scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setFormData(prev => ({ ...prev, tags }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.systemPrompt.trim()) {
      setError('System prompt is required');
      return false;
    }
    if (!formData.initialMessage.trim()) {
      setError('Initial message is required');
      return false;
    }
    if (formData.estimatedMinutes < 1 || formData.estimatedMinutes > 120) {
      setError('Duration must be between 1 and 120 minutes');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const scenarioData = {
        ...formData,
        createdBy: user?.id
      };

      let result;
      if (isEditing) {
        result = await pb.collection('scenarios').update(scenarioId!, scenarioData);
      } else {
        result = await pb.collection('scenarios').create(scenarioData);
      }

      console.log('Scenario saved:', result);
      navigate('/scenarios');
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scenario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit Scenario' : 'Create New Scenario'}
              </h1>
              <p className="text-gray-600">
                {isEditing ? 'Update your custom scenario' : 'Design a custom conversation practice scenario'}
              </p>
            </div>
            <button
              onClick={() => navigate('/scenarios')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Scenarios
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Job Interview - Software Engineer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what users will practice in this scenario..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.estimatedMinutes}
                  onChange={(e) => handleInputChange('estimatedMinutes', parseInt(e.target.value))}
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Voice
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="female"
                    checked={formData.voice === 'female'}
                    onChange={(e) => handleInputChange('voice', e.target.value)}
                    className="mr-2"
                  />
                  👩‍💼 Female
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="male"
                    checked={formData.voice === 'male'}
                    onChange={(e) => handleInputChange('voice', e.target.value)}
                    className="mr-2"
                  />
                  👨‍💼 Male
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="interview, technical, communication"
              />
            </div>

            {/* AI Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Prompt *
                  </label>
                  <textarea
                    value={formData.systemPrompt}
                    onChange={(e) => handleInputChange('systemPrompt', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the AI's role, personality, and behavior. For example: 'You are a hiring manager conducting a technical interview. Be professional but friendly, ask follow-up questions, and probe for technical depth...'"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This tells the AI how to behave during the conversation
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Message *
                  </label>
                  <textarea
                    value={formData.initialMessage}
                    onChange={(e) => handleInputChange('initialMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="The first thing the AI will say to start the conversation..."
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    This is what the AI will say to begin the conversation
                  </p>
                </div>
              </div>
            </div>

            {/* Sharing Options */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sharing Options</h3>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="mr-3"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make this scenario public (visible to all users)
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Public scenarios appear in the public library. Private scenarios are only visible to you.
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/scenarios')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (isEditing ? 'Update Scenario' : 'Create Scenario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}