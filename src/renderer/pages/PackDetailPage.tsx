import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getPack,
  getPackScenarios,
  removeScenarioFromPack,
  addScenarioToPack,
  listScenarios,
  getScenarioPacks,
  startSessionFromPack
} from '../services/sqlite';
import { Pack, Scenario } from '../types';
import { 
  Package, 
  Plus, 
  Play, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Clock,
  Search,
  X,
  Filter
} from 'lucide-react';

interface ScenarioWithPacks extends Scenario {
  packs?: Pack[];
}

export function PackDetailPage() {
  const navigate = useNavigate();
  const { packId } = useParams<{ packId: string }>();
  const [pack, setPack] = useState<Pack | null>(null);
  const [packScenarios, setPackScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (packId) {
      loadPackData();
    }
  }, [packId]);

  const loadPackData = async () => {
    if (!packId) return;
    
    setLoading(true);
    try {
      const [packData, scenarios] = await Promise.all([
        getPack(packId),
        getPackScenarios(packId)
      ]);
      
      setPack(packData);
      setPackScenarios(scenarios);
    } catch (error) {
      console.error('Failed to load pack data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveScenario = async (scenarioId: string) => {
    if (!packId) return;
    
    if (!confirm('Remove this scenario from the pack?')) {
      return;
    }

    setRemovingId(scenarioId);
    try {
      await removeScenarioFromPack(packId, scenarioId);
      await loadPackData();
    } catch (error) {
      console.error('Failed to remove scenario:', error);
      alert('Failed to remove scenario. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddScenarios = async (scenarioIds: string[]) => {
    if (!packId) return;
    
    try {
      for (const scenarioId of scenarioIds) {
        await addScenarioToPack(packId, scenarioId);
      }
      setShowAddModal(false);
      await loadPackData();
    } catch (error) {
      console.error('Failed to add scenarios:', error);
      alert('Failed to add scenarios. Please try again.');
    }
  };

  const handleStartScenario = async (scenarioId: string) => {
    if (!packId) return;
    
    try {
      const { session } = await startSessionFromPack(packId, scenarioId);
      navigate(`/conversation/${scenarioId}?sessionId=${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pack...</p>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Pack not found.</p>
          <button
            onClick={() => navigate('/packs')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Packs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/packs')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Practice Packs
        </button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-6 h-6 rounded" 
              style={{ backgroundColor: pack.color }}
            ></div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{pack.name}</h1>
              {pack.description && (
                <p className="text-gray-600 mt-1">{pack.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Scenarios
            </button>
          </div>
        </div>

        {/* Pack Info */}
        <div className="mt-6 flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Package size={16} />
            {packScenarios.length} scenarios
          </span>
          {pack.difficulty && (
            <span className="capitalize">{pack.difficulty}</span>
          )}
          {pack.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {pack.estimatedMinutes}m estimated
            </span>
          )}
        </div>
      </div>

      {/* Scenarios */}
      {packScenarios.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No scenarios in this pack yet.</p>
          <p className="text-gray-500 mb-6">Add scenarios to get started with this practice pack.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus size={20} />
            Add Scenarios
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1 pr-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {scenario.name}
                    </h3>
                    <span className="text-lg" title={`${scenario.voice || 'default'} voice`}>
                      {scenario.voice === 'female' ? '👩' : scenario.voice === 'male' ? '👨' : '🗣️'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveScenario(scenario.id)}
                    disabled={removingId === scenario.id}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Remove from pack"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {scenario.description}
                </p>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${{
                    'beginner': 'bg-green-100 text-green-800',
                    'intermediate': 'bg-yellow-100 text-yellow-800',
                    'advanced': 'bg-red-100 text-red-800'
                  }[scenario.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                    {scenario.difficulty}
                  </span>
                  {scenario.isDefault && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Default
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {scenario.estimatedMinutes}m
                  </span>
                  <span className="capitalize">{scenario.category}</span>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartScenario(scenario.id)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Start
                  </button>
                  <button
                    onClick={() => navigate(`/scenarios/edit/${scenario.id}`)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Edit scenario"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Scenarios Modal */}
      {showAddModal && (
        <AddScenariosModal
          packId={packId!}
          existingScenarioIds={packScenarios.map(s => s.id)}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddScenarios}
        />
      )}
    </div>
  );
}

interface AddScenariosModalProps {
  packId: string;
  existingScenarioIds: string[];
  onClose: () => void;
  onAdd: (scenarioIds: string[]) => void;
}

function AddScenariosModal({ packId, existingScenarioIds, onClose, onAdd }: AddScenariosModalProps) {
  const [allScenarios, setAllScenarios] = useState<ScenarioWithPacks[]>([]);
  const [filteredScenarios, setFilteredScenarios] = useState<ScenarioWithPacks[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ 
    category: '', 
    difficulty: '',
    source: 'all'
  });

  useEffect(() => {
    loadScenarios();
  }, []);

  useEffect(() => {
    filterScenarios();
  }, [allScenarios, searchTerm, filter]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const scenarios = await listScenarios();
      
      // Load pack information and filter out scenarios already in this pack
      const scenariosWithPacks = await Promise.all(
        scenarios
          .filter(scenario => !existingScenarioIds.includes(scenario.id))
          .map(async (scenario) => {
            const packs = await getScenarioPacks(scenario.id);
            return { ...scenario, packs };
          })
      );
      
      setAllScenarios(scenariosWithPacks);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterScenarios = () => {
    let filtered = allScenarios;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(scenario => 
        scenario.name.toLowerCase().includes(search) ||
        scenario.description.toLowerCase().includes(search) ||
        scenario.category.toLowerCase().includes(search) ||
        scenario.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    // Category filter
    if (filter.category) {
      filtered = filtered.filter(scenario => scenario.category === filter.category);
    }

    // Difficulty filter
    if (filter.difficulty) {
      filtered = filtered.filter(scenario => scenario.difficulty === filter.difficulty);
    }

    // Source filter
    if (filter.source !== 'all') {
      if (filter.source === 'default') {
        filtered = filtered.filter(scenario => scenario.isDefault);
      } else if (filter.source === 'custom') {
        filtered = filtered.filter(scenario => !scenario.isDefault);
      }
    }

    setFilteredScenarios(filtered);
  };

  const toggleScenario = (scenarioId: string) => {
    setSelectedIds(prev => 
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const handleAdd = () => {
    if (selectedIds.length > 0) {
      onAdd(selectedIds);
    }
  };

  const categories = [...new Set(allScenarios.map(s => s.category))].filter(Boolean);
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Add Scenarios to Pack</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={filter.difficulty}
              onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Difficulties</option>
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty} className="capitalize">
                  {difficulty}
                </option>
              ))}
            </select>

            <select
              value={filter.source}
              onChange={(e) => setFilter({ ...filter, source: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              <option value="default">Default</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
            {selectedIds.length} selected • {filteredScenarios.length} available
          </div>
        </div>

        {/* Scenarios List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading scenarios...</p>
            </div>
          ) : filteredScenarios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No scenarios available to add.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  onClick={() => toggleScenario(scenario.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedIds.includes(scenario.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(scenario.id)}
                          onChange={() => toggleScenario(scenario.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <h4 className="font-medium text-gray-800">{scenario.name}</h4>
                        <span className="text-lg" title={`${scenario.voice || 'default'} voice`}>
                          {scenario.voice === 'female' ? '👩' : scenario.voice === 'male' ? '👨' : '🗣️'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${{
                          'beginner': 'bg-green-100 text-green-800',
                          'intermediate': 'bg-yellow-100 text-yellow-800',
                          'advanced': 'bg-red-100 text-red-800'
                        }[scenario.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                          {scenario.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {scenario.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{scenario.category}</span>
                        <span>{scenario.estimatedMinutes}m</span>
                        {scenario.packs && scenario.packs.length > 0 && (
                          <span>In {scenario.packs.length} other pack(s)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedIds.length} Scenario{selectedIds.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}