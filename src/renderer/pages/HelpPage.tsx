import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Search, Book, Users, Wrench, HelpCircle, Play, FileText, Settings } from 'lucide-react';

export function HelpPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const DOCS_BASE_URL = 'https://michael-borck.github.io/chatter-box';

  const openDocs = (path: string) => {
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(`${DOCS_BASE_URL}${path}`);
    }
  };

  const quickHelp = [
    {
      icon: Play,
      title: 'Getting Started',
      description: 'New to ChatterBox? Start here for installation and first steps.',
      links: [
        { title: 'Installation Guide', path: '/getting-started/installation' },
        { title: 'First Setup', path: '/getting-started/first-setup' },
        { title: 'Your First Scenario', path: '/workflows/your-first-scenario' }
      ]
    },
    {
      icon: Users,
      title: 'User Guides',
      description: 'Role-specific guides for students, teachers, and self-learners.',
      links: [
        { title: 'For Students', path: '/user-guides/for-students' },
        { title: 'For Teachers', path: '/user-guides/for-teachers' },
        { title: 'For Self-Learners', path: '/user-guides/for-self-learners' }
      ]
    },
    {
      icon: Book,
      title: 'Interface Guide',
      description: 'Master every part of the ChatterBox interface.',
      links: [
        { title: 'Home Dashboard', path: '/interface-guide/home-dashboard' },
        { title: 'Scenarios Page', path: '/interface-guide/scenarios-page' },
        { title: 'Session History', path: '/interface-guide/session-history' }
      ]
    },
    {
      icon: FileText,
      title: 'Essential Workflows',
      description: 'Learn core ChatterBox workflows and best practices.',
      links: [
        { title: 'Creating Scenarios', path: '/workflows/creating-scenarios' },
        { title: 'Building Skill Packages', path: '/workflows/building-skill-packages' },
        { title: 'Importing Content', path: '/workflows/importing-packages' }
      ]
    },
    {
      icon: Settings,
      title: 'Service Setup',
      description: 'Configure external services for full functionality.',
      links: [
        { title: 'Speech-to-Text Setup', path: '/services/stt-setup' },
        { title: 'AI Model Integration', path: '/services/ai-model-integration' },
        { title: 'Connection Issues', path: '/troubleshooting/connection-issues' }
      ]
    },
    {
      icon: Wrench,
      title: 'Troubleshooting',
      description: 'Solve common issues and get ChatterBox working smoothly.',
      links: [
        { title: 'Connection Issues', path: '/troubleshooting/connection-issues' },
        { title: 'Common Errors', path: '/troubleshooting/common-errors' },
        { title: 'Performance Tips', path: '/troubleshooting/performance-tips' }
      ]
    }
  ];

  const filteredHelp = quickHelp.filter(section =>
    searchTerm === '' ||
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.links.some(link => link.title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <HelpCircle size={48} className="text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Help & Documentation</h1>
                <p className="text-lg text-gray-600">Get the most out of ChatterBox</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openDocs('')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Book size={20} />
              Full Documentation
              <ExternalLink size={16} />
            </button>
            <button
              onClick={() => openDocs('/getting-started/your-first-scenario')}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play size={20} />
              Quick Start Guide
              <ExternalLink size={16} />
            </button>
            <button
              onClick={() => openDocs('/troubleshooting/connection-issues')}
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Wrench size={20} />
              Fix Problems
              <ExternalLink size={16} />
            </button>
          </div>
        </div>

        {/* Help Sections */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHelp.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 text-sm">{section.description}</p>
                
                <div className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <button
                      key={linkIndex}
                      onClick={() => openDocs(link.path)}
                      className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <span className="text-gray-700 group-hover:text-gray-900">{link.title}</span>
                      <ExternalLink size={16} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {searchTerm && filteredHelp.length === 0 && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-4">
              Try different keywords or browse the categories above.
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Additional Resources */}
        <div className="mt-12 bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Additional Resources</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Community & Support</h3>
              <div className="space-y-2">
                <button
                  onClick={() => openDocs('/reference/faq')}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Frequently Asked Questions
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.electronAPI?.shell?.openExternal) {
                      window.electronAPI.shell.openExternal('https://github.com/michael-borck/chatter-box/issues');
                    }
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Report a Bug
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.electronAPI?.shell?.openExternal) {
                      window.electronAPI.shell.openExternal('https://github.com/michael-borck/chatter-box');
                    }
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  GitHub Repository
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Advanced Topics</h3>
              <div className="space-y-2">
                <button
                  onClick={() => openDocs('/content-creation/scenario-writing-guide')}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Content Creation Guide
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={() => openDocs('/advanced/session-analytics')}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Advanced Features
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={() => openDocs('/technical/architecture')}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Technical Documentation
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Help Note */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <HelpCircle size={20} className="text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Need Help Offline?</h3>
              <p className="text-blue-800 text-sm">
                Some help content is available within the app. Check the About page, Settings tooltips, 
                and scenario descriptions for quick guidance without internet access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}