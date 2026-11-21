// Projects — a way to group Scenarios that belong together ("Job interviews",
// "Difficult conversations"). A Project owns no rows of its own; Scenarios
// carry a project_id, and Sessions inherit their project from their Scenario,
// so a project's practice history is just the sessions of its Scenarios.
//
// This page lists Projects and creates new ones. Opening one goes to its
// Scenarios, filtered by project, where they can be reordered and practised.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Sparkles } from 'lucide-react';
import { listProjectsWithCounts, createProject, deleteProject } from '../services/sqlite';
import { Project } from '../types';
import { EmptyState, LoadingState, PageHeader } from '../components/layout/PageShell';
import { notify, notifyCaught } from '../services/notices';

const PROJECT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await listProjectsWithCounts());
    } catch (error) {
      notifyCaught('home.loadFailed', error, { detail: 'Could not load projects.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createProject({ name: name.trim(), color });
      setName('');
      await load();
    } catch (error) {
      notifyCaught('scenario.saveFailed', error, { detail: 'Could not create the project.' });
    } finally {
      setCreating(false);
    }
  };

  const remove = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete “${p.name}”? Its Scenarios move back to the ungrouped library.`)) return;
    try {
      await deleteProject(p.id);
      notify('scenario.deleteFailed', { detail: `“${p.name}” deleted` });
      await load();
    } catch (error) {
      notifyCaught('scenario.deleteFailed', error, { detail: 'Could not delete the project.' });
    }
  };

  return (
    <div className="page page-canvas p-8">
      <PageHeader
        title="Projects"
        subtitle="Group Scenarios that belong together so you can practise and review them as one."
        icon={<FolderOpen size={28} />}
        actions={
          <button
            onClick={() => navigate('/collections')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Sparkles size={16} />
            Smart collections
          </button>
        }
      />

      {/* Create form */}
      <form onSubmit={create} className="mb-8 bg-white rounded-lg shadow p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-sm font-medium text-gray-700 mb-1">New project</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Job interviews"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Use colour ${c}`}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-gray-800' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Plus size={16} />
          Add project
        </button>
      </form>

      {loading ? (
        <LoadingState label="Loading projects…" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={40} />}
          message="No projects yet."
        >
          <p className="text-gray-500">
            Create one above, then assign Scenarios to it from the Scenario editor.
          </p>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <li key={p.id}>
              <div
                className="bg-white rounded-lg shadow p-5 flex items-center gap-4 border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderLeftColor: p.color }}
                onClick={() => navigate(`/scenarios?project=${encodeURIComponent(p.id)}`)}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-800 truncate">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-gray-500 truncate">{p.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {p.scenarioCount ?? 0} scenario{(p.scenarioCount ?? 0) === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={(e) => remove(p, e)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete project"
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}