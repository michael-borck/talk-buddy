import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  listPacksWithScenarios, 
  deletePack,
  createPack 
} from '../services/sqlite';
import { PackWithScenarios } from '../types';
import { 
  Package, 
  Plus, 
  Trash2, 
  Play, 
  Users, 
  Clock,
  Target,
  BookOpen
} from 'lucide-react';

export function PracticePacksPage() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<PackWithScenarios[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    setLoading(true);
    try {
      const packList = await listPacksWithScenarios();
      setPacks(packList);
    } catch (error) {
      console.error('Failed to load packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this practice pack?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deletePack(id);
      await loadPacks();
    } catch (error) {
      console.error('Failed to delete pack:', error);
      alert('Failed to delete pack. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreatePack = async (packData: any) => {
    try {
      await createPack(packData);
      setShowCreateForm(false);
      await loadPacks();
    } catch (error) {
      console.error('Failed to create pack:', error);
      alert('Failed to create pack. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading practice packs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Practice Packs</h1>
          <p className="text-gray-600">Organize scenarios into themed learning collections</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Create Pack
        </button>
      </div>

      {packs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">No practice packs yet.</p>
          <p className="text-gray-500 mb-6">Create your first pack to organize scenarios by theme, difficulty, or learning goal.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
          >
            <Plus size={20} />
            Create Your First Pack
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/packs/${pack.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded" 
                      style={{ backgroundColor: pack.color }}
                    ></div>
                    <Package size={20} className="text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {pack.name}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => handleDelete(pack.id, e)}
                    disabled={deletingId === pack.id}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Delete pack"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {pack.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {pack.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen size={16} />
                    <span>{pack.scenarioCount} scenarios</span>
                  </div>
                  {pack.difficulty && (
                    <div className="flex items-center gap-1">
                      <Target size={16} />
                      <span className="capitalize">{pack.difficulty}</span>
                    </div>
                  )}
                  {pack.estimatedMinutes && (
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{pack.estimatedMinutes}m</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <CreatePackModal
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreatePack}
        />
      )}
    </div>
  );
}

interface CreatePackModalProps {
  onClose: () => void;
  onSubmit: (packData: any) => void;
}

function CreatePackModal({ onClose, onSubmit }: CreatePackModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Package',
    difficulty: '',
    estimatedMinutes: '',
    orderIndex: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    onSubmit({
      ...formData,
      estimatedMinutes: formData.estimatedMinutes ? parseInt(formData.estimatedMinutes) : undefined,
      difficulty: formData.difficulty || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Practice Pack</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pack Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Job Interview Prep"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of this pack's focus"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select...</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.estimatedMinutes}
              onChange={(e) => setFormData({ ...formData, estimatedMinutes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Total estimated time"
              min="1"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Pack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}