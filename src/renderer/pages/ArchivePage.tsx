import { useState, useEffect } from 'react';
import { 
  listArchivedScenarios, 
  listArchivedPacks,
  unarchiveScenario,
  unarchivePack,
  deleteScenario,
  deletePack,
  bulkArchiveScenarios,
  bulkArchivePacks
} from '../services/sqlite';
import { Scenario, Pack } from '../types';
import { 
  Archive,
  Search,
  Unarchive,
  Trash2,
  Package,
  MessageSquare,
  Clock,
  CheckSquare,
  Square,
  RotateCcw,
  X
} from 'lucide-react';

export function ArchivePage() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'packs'>('scenarios');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [selectedPacks, setSelectedPacks] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scenarioList, packList] = await Promise.all([
        listArchivedScenarios(),
        listArchivedPacks()
      ]);
      setScenarios(scenarioList);
      setPacks(packList);
    } catch (error) {
      console.error('Failed to load archived data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchiveScenario = async (id: string) => {
    setActionLoading(id);
    try {
      await unarchiveScenario(id);
      await loadData();
    } catch (error) {
      console.error('Failed to unarchive scenario:', error);
      alert('Failed to unarchive scenario. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnarchivePack = async (id: string) => {
    setActionLoading(id);
    try {
      await unarchivePack(id);
      await loadData();
    } catch (error) {
      console.error('Failed to unarchive pack:', error);
      alert('Failed to unarchive pack. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this scenario? This action cannot be undone.')) {
      return;
    }

    setActionLoading(id);
    try {
      await deleteScenario(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      alert('Failed to delete scenario. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this practice pack? This action cannot be undone.')) {
      return;
    }

    setActionLoading(id);
    try {
      await deletePack(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete pack:', error);
      alert('Failed to delete pack. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkUnarchive = async () => {
    const items = activeTab === 'scenarios' ? selectedScenarios : selectedPacks;
    if (items.length === 0) return;

    setActionLoading('bulk');
    try {
      if (activeTab === 'scenarios') {
        for (const id of selectedScenarios) {
          await unarchiveScenario(id);
        }
        setSelectedScenarios([]);
      } else {
        for (const id of selectedPacks) {
          await unarchivePack(id);
        }
        setSelectedPacks([]);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to bulk unarchive:', error);
      alert('Failed to unarchive items. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleScenarioSelection = (id: string) => {
    setSelectedScenarios(prev => 
      prev.includes(id) 
        ? prev.filter(scenarioId => scenarioId !== id)
        : [...prev, id]
    );
  };

  const togglePackSelection = (id: string) => {
    setSelectedPacks(prev => 
      prev.includes(id) 
        ? prev.filter(packId => packId !== id)
        : [...prev, id]
    );
  };

  const selectAllScenarios = () => {
    const filtered = filteredScenarios;
    setSelectedScenarios(
      selectedScenarios.length === filtered.length 
        ? [] 
        : filtered.map(s => s.id)
    );
  };

  const selectAllPacks = () => {
    const filtered = filteredPacks;
    setSelectedPacks(
      selectedPacks.length === filtered.length 
        ? [] 
        : filtered.map(p => p.id)
    );
  };

  const filteredScenarios = scenarios.filter(scenario =>
    scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scenario.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPacks = packs.filter(pack =>
    pack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pack.description && pack.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading archived content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Archive size={32} className="text-gray-600" />
          Archive
        </h1>
        <p className="text-gray-600">Manage your archived scenarios and practice packs</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search archived content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scenarios'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                Scenarios ({filteredScenarios.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('packs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'packs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={16} />
                Practice Packs ({filteredPacks.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Bulk Actions */}
      {((activeTab === 'scenarios' && selectedScenarios.length > 0) ||
        (activeTab === 'packs' && selectedPacks.length > 0)) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {activeTab === 'scenarios' ? selectedScenarios.length : selectedPacks.length} items selected
          </span>
          <button
            onClick={handleBulkUnarchive}
            disabled={actionLoading === 'bulk'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw size={16} />
            Unarchive Selected
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'scenarios' ? (
        <div>
          {filteredScenarios.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No archived scenarios found.</p>
              {searchTerm && (
                <p className="text-gray-500">Try adjusting your search terms.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={selectAllScenarios}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {selectedScenarios.length === filteredScenarios.length ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  Select All
                </button>
              </div>

              {filteredScenarios.map((scenario) => (
                <div key={scenario.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => toggleScenarioSelection(scenario.id)}
                        className="mt-1"
                      >
                        {selectedScenarios.includes(scenario.id) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {scenario.name}
                          </h3>
                          <span className="text-lg" title={`${scenario.voice || 'default'} voice`}>
                            {scenario.voice === 'female' ? '👩' : scenario.voice === 'male' ? '👨' : '🗣️'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {scenario.category}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Archived
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{scenario.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={16} />
                            {scenario.estimatedMinutes} min
                          </span>
                          <span className="capitalize">{scenario.difficulty}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleUnarchiveScenario(scenario.id)}
                        disabled={actionLoading === scenario.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Unarchive scenario"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteScenario(scenario.id)}
                        disabled={actionLoading === scenario.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete permanently"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {filteredPacks.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No archived practice packs found.</p>
              {searchTerm && (
                <p className="text-gray-500">Try adjusting your search terms.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={selectAllPacks}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {selectedPacks.length === filteredPacks.length ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                  Select All
                </button>
              </div>

              {filteredPacks.map((pack) => (
                <div key={pack.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => togglePackSelection(pack.id)}
                        className="mt-1"
                      >
                        {selectedPacks.includes(pack.id) ? (
                          <CheckSquare size={20} className="text-blue-600" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: pack.color }}
                          ></div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            {pack.name}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            Archived
                          </span>
                        </div>
                        
                        {pack.description && (
                          <p className="text-gray-600 mb-3">{pack.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {pack.difficulty && (
                            <span className="capitalize">{pack.difficulty}</span>
                          )}
                          {pack.estimatedMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock size={16} />
                              {pack.estimatedMinutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleUnarchivePack(pack.id)}
                        disabled={actionLoading === pack.id}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Unarchive practice pack"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePack(pack.id)}
                        disabled={actionLoading === pack.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete permanently"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}