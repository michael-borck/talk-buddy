import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listScenarios } from '../services/sqlite';
import { Scenario } from '../types';
import { Play, Clock, Trophy, Filter } from 'lucide-react';

export function ScenariosPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', difficulty: '' });

  useEffect(() => {
    loadScenarios();
  }, [filter]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const data = await listScenarios(filter);
      setScenarios(data);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(scenarios.map(s => s.category).filter(Boolean)));
  const difficulties = ['beginner', 'intermediate', 'advanced'];

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Practice Scenarios</h1>
        <p className="text-gray-600">Choose a scenario to start practicing your conversation skills</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-500" />
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
        </div>
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

      {/* Scenarios Grid */}
      {scenarios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No scenarios found.</p>
          <button
            onClick={() => navigate('/scenarios/new')}
            className="text-blue-600 hover:text-blue-700"
          >
            Create your first scenario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/conversation/${scenario.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">{scenario.name}</h3>
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
                  <button
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/conversation/${scenario.id}`);
                    }}
                  >
                    <Play size={16} />
                    Start
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}