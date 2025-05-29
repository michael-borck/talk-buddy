import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listScenarios, deleteScenario, restoreDefaultScenarios } from '../services/sqlite';
import { Scenario } from '../types';
import { Play, Clock, Trophy, Filter, Plus, Edit, Trash2, Grid, List, RefreshCw } from 'lucide-react';

export function ScenariosPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ 
    category: '', 
    difficulty: '',
    source: 'all' // 'all', 'default', 'custom'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, [filter]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const data = await listScenarios({ 
        category: filter.category, 
        difficulty: filter.difficulty 
      });
      
      // Filter by source (default vs custom)
      let filtered = data;
      if (filter.source === 'default') {
        filtered = data.filter(s => s.isDefault);
      } else if (filter.source === 'custom') {
        filtered = data.filter(s => !s.isDefault);
      }
      
      setScenarios(filtered);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteScenario(id);
      await loadScenarios();
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async () => {
    if (!confirm('This will restore any missing default scenarios. Continue?')) {
      return;
    }

    setRestoring(true);
    try {
      const result = await restoreDefaultScenarios();
      if (result.success) {
        await loadScenarios();
        if (result.restoredCount === 0) {
          alert('All default scenarios are already present.');
        } else {
          alert(`Restored ${result.restoredCount} default scenario${result.restoredCount > 1 ? 's' : ''}.`);
        }
      } else {
        alert('Failed to restore scenarios. Please try again.');
      }
    } catch (error) {
      console.error('Failed to restore scenarios:', error);
      alert('Failed to restore scenarios. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const categories = Array.from(new Set(scenarios.map(s => s.category).filter(Boolean)));
  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const customScenariosCount = scenarios.filter(s => !s.isDefault).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-50';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50';
      case 'advanced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Practice Scenarios</h1>
          <p className="text-gray-600">
            {filter.source === 'custom' 
              ? 'Manage your custom conversation scenarios'
              : 'Choose a scenario to start practicing your conversation skills'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Restore missing default scenarios"
          >
            <RefreshCw size={20} className={restoring ? 'animate-spin' : ''} />
            Restore Defaults
          </button>
          <button
            onClick={() => navigate('/scenarios/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            New Scenario
          </button>
        </div>
      </div>

      {/* Filters and View Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={filter.source}
              onChange={(e) => setFilter({ ...filter, source: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Scenarios</option>
              <option value="default">Default Scenarios</option>
              <option value="custom">Custom Scenarios ({customScenariosCount})</option>
            </select>
          </div>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Difficulties</option>
            {difficulties.map(diff => (
              <option key={diff} value={diff}>{diff}</option>
            ))}
          </select>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Grid view"
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="List view"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Scenarios Display */}
      {scenarios.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 mb-4">
            {filter.source === 'custom' 
              ? "You haven't created any scenarios yet."
              : "No scenarios found matching your filters."}
          </p>
          {filter.source === 'custom' && (
            <button
              onClick={() => navigate('/scenarios/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Your First Scenario
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/conversation/${scenario.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    <span className="mr-2">{scenario.voice === 'female' ? '👩' : '👨'}</span>
                    {scenario.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                    {scenario.difficulty}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {scenario.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {scenario.estimatedMinutes} min
                    </span>
                    {scenario.category && (
                      <span className="flex items-center gap-1">
                        <Trophy size={16} />
                        {scenario.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/scenarios/edit/${scenario.id}`);
                      }}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(scenario.id, scenario.name);
                      }}
                      disabled={deletingId === scenario.id}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/conversation/${scenario.id}`);
                      }}
                      title="Start"
                    >
                      <Play size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        <span className="mr-2">{scenario.voice === 'female' ? '👩' : '👨'}</span>
                        {scenario.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                        {scenario.difficulty}
                      </span>
                      {scenario.category && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {scenario.category}
                        </span>
                      )}
                      {scenario.isDefault && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                          Default
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{scenario.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {scenario.estimatedMinutes} minutes
                      </span>
                      <span>
                        Created: {new Date(scenario.created).toLocaleDateString()}
                      </span>
                      {scenario.tags && scenario.tags.length > 0 && (
                        <div className="flex gap-1">
                          {scenario.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => navigate(`/conversation/${scenario.id}`)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Start conversation"
                    >
                      <Play size={20} />
                    </button>
                    <button
                      onClick={() => navigate(`/scenarios/edit/${scenario.id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit scenario"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(scenario.id, scenario.name)}
                      disabled={deletingId === scenario.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete scenario"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}