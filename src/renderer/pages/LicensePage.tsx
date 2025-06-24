import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart, Code2 } from 'lucide-react';

export function LicensePage() {
  const navigate = useNavigate();

  const openExternal = (url: string) => {
    if (window.electronAPI?.shell?.openExternal) {
      window.electronAPI.shell.openExternal(url);
    }
  };

  const dependencies = [
    {
      name: 'React',
      version: '^18.2.0',
      license: 'MIT',
      description: 'A JavaScript library for building user interfaces',
      url: 'https://reactjs.org/'
    },
    {
      name: 'Electron',
      version: '^28.1.3',
      license: 'MIT',
      description: 'Build cross-platform desktop apps with JavaScript, HTML, and CSS',
      url: 'https://electronjs.org/'
    },
    {
      name: 'React Router',
      version: '^6.8.0',
      license: 'MIT',
      description: 'Declarative routing for React applications',
      url: 'https://reactrouter.com/'
    },
    {
      name: 'Better SQLite3',
      version: '^9.2.2',
      license: 'MIT',
      description: 'Fast, simple, and reliable SQLite3 bindings for Node.js',
      url: 'https://github.com/WiseLibs/better-sqlite3'
    },
    {
      name: 'Lucide React',
      version: '^0.316.0',
      license: 'ISC',
      description: 'Beautiful & consistent icon toolkit made by the community',
      url: 'https://lucide.dev/'
    },
    {
      name: 'Tailwind CSS',
      version: '^3.4.1',
      license: 'MIT',
      description: 'A utility-first CSS framework for rapid UI development',
      url: 'https://tailwindcss.com/'
    },
    {
      name: 'Vite',
      version: '^5.0.11',
      license: 'MIT',
      description: 'Next generation frontend tooling',
      url: 'https://vitejs.dev/'
    },
    {
      name: 'TypeScript',
      version: '^5.3.3',
      license: 'Apache-2.0',
      description: 'TypeScript is a language for application-scale JavaScript',
      url: 'https://www.typescriptlang.org/'
    },
    {
      name: 'React Markdown',
      version: '^10.1.0',
      license: 'MIT',
      description: 'Markdown component for React',
      url: 'https://github.com/remarkjs/react-markdown'
    },
    {
      name: 'Rehype Highlight',
      version: '^7.0.2',
      license: 'MIT',
      description: 'Syntax highlighting for markdown code blocks',
      url: 'https://github.com/rehypejs/rehype-highlight'
    },
    {
      name: 'Remark GFM',
      version: '^4.0.1',
      license: 'MIT',
      description: 'GitHub Flavored Markdown support for Remark',
      url: 'https://github.com/remarkjs/remark-gfm'
    },
    {
      name: 'Electron-is-dev',
      version: '^2.0.0',
      license: 'MIT',
      description: 'Check if Electron is running in development mode',
      url: 'https://github.com/sindresorhus/electron-is-dev'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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

        {/* Talk Buddy License */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Heart size={24} className="text-red-500" />
            <h1 className="text-2xl font-semibold text-gray-800">License & Credits</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Talk Buddy License</h2>
            <div className="bg-gray-50 p-6 rounded-lg font-mono text-sm">
              <div className="text-gray-700">
                <p className="mb-4"><strong>MIT License</strong></p>
                <p className="mb-4">Copyright (c) {new Date().getFullYear()} Michael Borck</p>
                <p className="mb-4">
                  Permission is hereby granted, free of charge, to any person obtaining a copy
                  of this software and associated documentation files (the "Software"), to deal
                  in the Software without restriction, including without limitation the rights
                  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                  copies of the Software, and to permit persons to whom the Software is
                  furnished to do so, subject to the following conditions:
                </p>
                <p className="mb-4">
                  The above copyright notice and this permission notice shall be included in all
                  copies or substantial portions of the Software.
                </p>
                <p>
                  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                  SOFTWARE.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Third-Party Dependencies */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <Code2 size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Third-Party Dependencies</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Talk Buddy is built upon many excellent open source projects. We are grateful to 
            the developers and maintainers of these libraries that make this application possible.
          </p>

          <div className="space-y-4">
            {dependencies.map((dep, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-800">{dep.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {dep.version}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {dep.license}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{dep.description}</p>
                  </div>
                  <button
                    onClick={() => openExternal(dep.url)}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Visit website"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Special Thanks</h3>
            <p className="text-blue-800 text-sm">
              To all the open source contributors who make projects like Talk Buddy possible. 
              Your dedication to sharing knowledge and building tools that benefit everyone 
              is truly appreciated.
            </p>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => openExternal('https://github.com/michael-borck/talk-buddy')}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Code2 size={16} />
              View Talk Buddy Source Code
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}