import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  listScenarios, 
  deleteScenario, 
  restoreDefaultScenarios,
  getScenarioPacks,
  startStandaloneSession,
  archiveScenario,
  exportScenario,
  exportScenarios,
  importFromFile
} from '../services/sqlite';
import { Scenario, Pack } from '../types';
import { 
  Play, 
  Clock, 
  Trophy, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Grid, 
  List, 
  RefreshCw,
  Search,
  Package,
  X,
  Archive,
  Download,
  Upload,
  CheckSquare,
  Square
} from 'lucide-react';

interface ScenarioWithPacks extends Scenario {
  packs?: Pack[];
}

export function ScenariosPage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioWithPacks[]>([]);
  const [filteredScenarios, setFilteredScenarios] = useState<ScenarioWithPacks[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ 
    category: '', 
    difficulty: '',
    source: 'all' // 'all', 'default', 'custom'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadScenarios();
  }, []);

  useEffect(() => {
    filterScenarios();
  }, [scenarios, searchTerm, filter]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const scenarioList = await listScenarios();
      
      // Load pack information for each scenario
      const scenariosWithPacks = await Promise.all(
        scenarioList.map(async (scenario) => {
          const packs = await getScenarioPacks(scenario.id);
          return { ...scenario, packs };
        })
      );
      
      setScenarios(scenariosWithPacks);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterScenarios = () => {
    let filtered = scenarios;

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to permanently delete this scenario? This action cannot be undone.')) {
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

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setDeletingId(id);
    try {
      await archiveScenario(id);
      await loadScenarios();
    } catch (error) {
      console.error('Failed to archive scenario:', error);
      alert('Failed to archive scenario. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restoreDefaultScenarios();
      if (result.success) {
        alert(`Restored ${result.restoredCount} default scenarios.`);
        await loadScenarios();
      } else {
        alert('Failed to restore default scenarios.');
      }
    } catch (error) {
      console.error('Failed to restore scenarios:', error);
      alert('Failed to restore default scenarios. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilter({ category: '', difficulty: '', source: 'all' });
  };

  const handleStartScenario = async (scenarioId: string) => {
    try {
      const session = await startStandaloneSession(scenarioId);
      navigate(`/conversation/${scenarioId}?sessionId=${session.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  const handleExportScenario = async (scenarioId: string) => {
    try {
      setIsExporting(true);
      await exportScenario(scenarioId);
    } catch (error) {
      console.error('Failed to export scenario:', error);
      alert('Failed to export scenario. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedScenarios.length === 0) return;
    
    try {
      setIsExporting(true);
      await exportScenarios(selectedScenarios);
      setSelectedScenarios([]);
    } catch (error) {
      console.error('Failed to export scenarios:', error);
      alert('Failed to export scenarios. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.electronAPI.dialog.openFile();
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      
      // For now, we'll use a file input approach since we can't directly read files
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const content = await file.text();
          const result = await importFromFile(content);
          
          if (result.success) {
            alert(result.message);
            await loadScenarios();
          } else {
            alert(`Import failed: ${result.message}`);
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('Failed to import file. Please check the file format.');
        }
      };
      input.click();
    } catch (error) {
      console.error('Failed to open import dialog:', error);
      alert('Failed to open import dialog.');
    }
  };

  const toggleScenarioSelection = (scenarioId: string) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId)
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const selectAllScenarios = () => {
    if (selectedScenarios.length === filteredScenarios.length) {
      setSelectedScenarios([]);
    } else {
      setSelectedScenarios(filteredScenarios.map(s => s.id));
    }
  };

  const categories = [...new Set(scenarios.map(s => s.category))].filter(Boolean);
  const difficulties = ['beginner', 'intermediate', 'advanced'];

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
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Scenarios</h1>
          <p className="text-gray-600">Browse and manage conversation practice scenarios</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Upload size={20} />
            Import
          </button>
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
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

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search scenarios by name, description, category, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filter.difficulty}
            onChange={(e) => setFilter({ ...filter, difficulty: e.target.value })}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sources</option>
            <option value="default">Default Scenarios</option>
            <option value="custom">Custom Scenarios</option>
          </select>

          {(searchTerm || filter.category || filter.difficulty || filter.source !== 'all') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={12} />
              Clear
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-600">
          Showing {filteredScenarios.length} of {scenarios.length} scenarios
        </div>
      </div>

      {/* Bulk Selection Controls */}
      {filteredScenarios.length > 0 && (
        <div className="mb-4 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={selectAllScenarios}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {selectedScenarios.length === filteredScenarios.length ? (
                <CheckSquare size={16} />
              ) : (
                <Square size={16} />
              )}
              {selectedScenarios.length === filteredScenarios.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedScenarios.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedScenarios.length} scenario{selectedScenarios.length > 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          
          {selectedScenarios.length > 0 && (
            <button
              onClick={handleExportSelected}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              Export Selected ({selectedScenarios.length})
            </button>
          )}
        </div>
      )}

      {/* Scenarios List */}
      {filteredScenarios.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            {searchTerm || filter.category || filter.difficulty || filter.source !== 'all'
              ? 'No scenarios match your search criteria.'
              : 'No scenarios available.'
            }
          </p>
          {(!searchTerm && !filter.category && !filter.difficulty && filter.source === 'all') && (
            <div className="space-y-3">
              <p className="text-gray-500">Get started by creating your first scenario or restoring defaults.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate('/scenarios/new')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={20} />
                  Create Scenario
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={20} className={restoring ? 'animate-spin' : ''} />
                  Restore Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' 
          : 'space-y-4'
        }>
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              viewMode={viewMode}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onEdit={(id) => navigate(`/scenarios/edit/${id}`)}
              onStart={handleStartScenario}
              onExport={handleExportScenario}
              onToggleSelect={toggleScenarioSelection}
              isSelected={selectedScenarios.includes(scenario.id)}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ScenarioCardProps {
  scenario: ScenarioWithPacks;
  viewMode: 'grid' | 'list';
  onDelete: (id: string, e: React.MouseEvent) => void;
  onArchive: (id: string, e: React.MouseEvent) => void;
  onEdit: (id: string) => void;
  onStart: (id: string) => void;
  onExport: (id: string) => void;
  onToggleSelect: (id: string) => void;
  isSelected: boolean;
  deletingId: string | null;
}

function ScenarioCard({ 
  scenario, 
  viewMode, 
  onDelete, 
  onArchive,
  onEdit, 
  onStart, 
  onExport,
  onToggleSelect,
  isSelected,
  deletingId 
}: ScenarioCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGenderIcon = (voice?: string) => {
    switch (voice) {
      case 'female': return '👩';
      case 'male': return '👨';
      default: return '🗣️';
    }
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start gap-4">
          <button
            onClick={() => onToggleSelect(scenario.id)}
            className="mt-1"
          >
            {isSelected ? (
              <CheckSquare size={20} className="text-blue-600" />
            ) : (
              <Square size={20} className="text-gray-400" />
            )}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{scenario.name}</h3>
              <span className="text-lg" title={`${scenario.voice || 'default'} voice`}>
                {getGenderIcon(scenario.voice)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyColor(scenario.difficulty)}`}>
                {scenario.difficulty}
              </span>
              {scenario.isDefault && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Default
                </span>
              )}
            </div>
            
            <p className="text-gray-600 mb-3 line-clamp-2">{scenario.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {scenario.estimatedMinutes}m
              </span>
              <span className="capitalize">{scenario.category}</span>
              {scenario.tags && scenario.tags.length > 0 && (
                <span>Tags: {scenario.tags.join(', ')}</span>
              )}
            </div>

            {/* Pack indicators */}
            {scenario.packs && scenario.packs.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Package size={16} className="text-purple-600" />
                <div className="flex flex-wrap gap-1">
                  {scenario.packs.map((pack) => (
                    <span
                      key={pack.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700"
                    >
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: pack.color }}
                      ></div>
                      {pack.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={() => onStart(scenario.id)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Start conversation"
            >
              <Play size={18} />
            </button>
            <button
              onClick={() => onEdit(scenario.id)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit scenario"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onExport(scenario.id)}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Export scenario"
            >
              <Download size={18} />
            </button>
            <button
              onClick={(e) => onArchive(scenario.id, e)}
              disabled={deletingId === scenario.id}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
              title="Archive scenario"
            >
              <Archive size={18} />
            </button>
            <button
              onClick={(e) => onDelete(scenario.id, e)}
              disabled={deletingId === scenario.id}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Delete permanently"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 pr-2">
            <button
              onClick={() => onToggleSelect(scenario.id)}
              className="mr-2"
            >
              {isSelected ? (
                <CheckSquare size={20} className="text-blue-600" />
              ) : (
                <Square size={20} className="text-gray-400" />
              )}
            </button>
            <h3 className="text-lg font-semibold text-gray-800">{scenario.name}</h3>
            <span className="text-lg" title={`${scenario.voice || 'default'} voice`}>
              {getGenderIcon(scenario.voice)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(scenario.id)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onExport(scenario.id)}
              className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Export"
            >
              <Download size={16} />
            </button>
            <button
              onClick={(e) => onArchive(scenario.id, e)}
              disabled={deletingId === scenario.id}
              className="p-1 text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
              title="Archive"
            >
              <Archive size={16} />
            </button>
            <button
              onClick={(e) => onDelete(scenario.id, e)}
              disabled={deletingId === scenario.id}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="Delete permanently"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{scenario.description}</p>
        
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyColor(scenario.difficulty)}`}>
            {scenario.difficulty}
          </span>
          {scenario.isDefault && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Default
            </span>
          )}
        </div>

        {/* Pack indicators */}
        {scenario.packs && scenario.packs.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2">
              <Package size={14} className="text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">In packs:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {scenario.packs.map((pack) => (
                <span
                  key={pack.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: pack.color }}
                  ></div>
                  {pack.name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Clock size={16} />
            {scenario.estimatedMinutes}m
          </span>
          <span className="capitalize">{scenario.category}</span>
        </div>
        
        <button
          onClick={() => onStart(scenario.id)}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Play size={18} />
          Start Conversation
        </button>
      </div>
    </div>
  );
}