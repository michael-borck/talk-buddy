import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { 
  ArrowLeft, 
  ExternalLink, 
  Search, 
  Book, 
  Users, 
  Wrench, 
  HelpCircle, 
  Play, 
  FileText, 
  Settings,
  ChevronRight,
  Home,
  Menu,
  X
} from 'lucide-react';

import { 
  loadDocumentation, 
  searchDocumentation, 
  getNavigationInfo,
  documentationStructure 
} from '../services/documentationLoader';

// Add icons to the documentation structure
const documentationStructureWithIcons = {
  'getting-started': { ...documentationStructure['getting-started'], icon: Play },
  'user-guides': { ...documentationStructure['user-guides'], icon: Users },
  'workflows': { ...documentationStructure['workflows'], icon: FileText },
  'services': { ...documentationStructure['services'], icon: Settings },
  'troubleshooting': { ...documentationStructure['troubleshooting'], icon: Wrench },
  'reference': { ...documentationStructure['reference'], icon: Book },
  'content-creation': { ...documentationStructure['content-creation'], icon: Book },
  'interface-guide': { ...documentationStructure['interface-guide'], icon: Book }
};

interface DocumentationPageProps {}

export function DocumentationPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('Help & Documentation');
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; path?: string }[]>([]);

  const currentSection = searchParams.get('section');
  const currentPage = searchParams.get('page');

  // Function to load documentation content
  const loadDocContent = async (section: string, page: string) => {
    setLoading(true);
    try {
      const docData = await loadDocumentation(section, page);
      setCurrentContent(docData.content);
      setCurrentTitle(docData.metadata.title);
      
      // Update breadcrumbs
      const sectionInfo = documentationStructureWithIcons[section as keyof typeof documentationStructureWithIcons];
      setBreadcrumbs([
        { label: 'Help', path: '' },
        { label: sectionInfo?.title || section, path: `?section=${section}` },
        { label: docData.metadata.title }
      ]);
    } catch (error) {
      setCurrentContent('# Error\n\nSorry, this documentation page could not be loaded.');
      setCurrentTitle('Error');
      setBreadcrumbs([
        { label: 'Help', path: '' },
        { label: 'Error' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSection && currentPage) {
      loadDocContent(currentSection, currentPage);
    } else {
      setCurrentContent('');
      setCurrentTitle('Help & Documentation');
      setBreadcrumbs([]);
    }
  }, [currentSection, currentPage]);

  const navigateToDoc = (section: string, page: string) => {
    setSearchParams({ section, page });
    setSidebarOpen(false);
  };

  const navigateToSection = (section: string) => {
    setSearchParams({ section });
    setSidebarOpen(false);
  };

  const goHome = () => {
    setSearchParams({});
    setSidebarOpen(false);
  };

  const openExternal = (url: string) => {
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    }
  };

  // Render sidebar
  const renderSidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:shadow-none lg:border-r`}>
      <div className="flex items-center justify-between p-4 border-b lg:hidden">
        <h2 className="text-lg font-semibold">Documentation</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="relative mb-4">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <nav className="space-y-2">
          <button
            onClick={goHome}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${!currentSection ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
          >
            <Home size={20} />
            <span className="font-medium">Overview</span>
          </button>

          {Object.entries(documentationStructureWithIcons).map(([key, section]) => {
            const Icon = section.icon;
            const isCurrentSection = currentSection === key;
            
            return (
              <div key={key} className="space-y-1">
                <button
                  onClick={() => navigateToSection(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${isCurrentSection ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                >
                  <Icon size={20} />
                  <span className="font-medium flex-1">{section.title}</span>
                  <ChevronRight size={16} className={`transition-transform ${isCurrentSection ? 'rotate-90' : ''}`} />
                </button>
                
                {isCurrentSection && (
                  <div className="ml-8 space-y-1">
                    {Object.entries(section.items).map(([pageKey, pageTitle]) => (
                      <button
                        key={pageKey}
                        onClick={() => navigateToDoc(key, pageKey)}
                        className={`w-full text-left p-2 rounded-md transition-colors text-sm ${currentPage === pageKey ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50 text-gray-600'}`}
                      >
                        {pageTitle}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );

  // Render breadcrumbs
  const renderBreadcrumbs = () => (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-4">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight size={16} className="mx-2" />}
          {crumb.path ? (
            <button
              onClick={() => {
                if (crumb.path === '') {
                  goHome();
                } else {
                  const params = new URLSearchParams(crumb.path.replace('?', ''));
                  setSearchParams(Object.fromEntries(params));
                }
              }}
              className="hover:text-blue-600 transition-colors"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-gray-700 font-medium">{crumb.label}</span>
          )}
        </div>
      ))}
    </nav>
  );

  // Render home/overview content
  const renderHomeContent = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <HelpCircle size={48} className="text-blue-600" />
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Help & Documentation</h1>
            <p className="text-lg text-gray-600">Everything you need to master Talk Buddy</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(documentationStructureWithIcons).map(([key, section]) => {
          const Icon = section.icon;
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm p-6 border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon size={24} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
              </div>
              
              <div className="space-y-2">
                {Object.entries(section.items).slice(0, 3).map(([pageKey, pageTitle]) => (
                  <button
                    key={pageKey}
                    onClick={() => navigateToDoc(key, pageKey)}
                    className="w-full flex items-center justify-between p-2 text-left rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-gray-700 group-hover:text-gray-900 text-sm">{pageTitle}</span>
                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                  </button>
                ))}
                
                {Object.keys(section.items).length > 3 && (
                  <button
                    onClick={() => navigateToSection(key)}
                    className="w-full text-left p-2 text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
                  >
                    View all {section.title.toLowerCase()} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigateToDoc('getting-started', 'your-first-scenario')}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Play size={18} />
            Quick Start
          </button>
          <button
            onClick={() => navigateToDoc('troubleshooting', 'connection-issues')}
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Wrench size={18} />
            Fix Problems
          </button>
          <button
            onClick={() => openExternal('https://github.com/michael-borck/talk-buddy/issues')}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Report Issue
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => openExternal('https://michael-borck.github.io/talk-buddy')}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Online Docs
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      {renderSidebar()}
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>

          {/* Content */}
          <div className="max-w-4xl">
            {breadcrumbs.length > 0 && renderBreadcrumbs()}
            
            {currentContent ? (
              <div className="bg-white rounded-xl shadow-sm border">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading documentation...</p>
                  </div>
                ) : (
                  <div className="prose prose-blue max-w-none p-8">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // Custom components for better styling
                        h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-800 mb-6">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">{children}</h3>,
                        a: ({ href, children }) => {
                          if (href?.startsWith('http')) {
                            return (
                              <button
                                onClick={() => openExternal(href)}
                                className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                              >
                                {children}
                                <ExternalLink size={14} />
                              </button>
                            );
                          }
                          return <a href={href} className="text-blue-600 hover:text-blue-700 underline">{children}</a>;
                        }
                      }}
                    >
                      {currentContent}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ) : (
              renderHomeContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}