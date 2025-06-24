import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart, Code2, Mic, Users } from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState('');
  const [electronVersion, setElectronVersion] = useState('');

  useEffect(() => {
    // Get app version
    if (window.electronAPI?.app?.getVersion) {
      window.electronAPI.app.getVersion().then(version => {
        setAppVersion(version);
      });
    }

    // Get Electron version from process
    setElectronVersion(window.process?.versions?.electron || 'Unknown');
  }, []);

  const features = [
    {
      icon: Mic,
      title: 'Voice Practice',
      description: 'Practice conversations with AI using natural speech-to-text and text-to-speech technology.'
    },
    {
      icon: Code2,
      title: 'Scenario Builder',
      description: 'Create custom conversation scenarios tailored to your specific learning needs.'
    },
    {
      icon: Users,
      title: 'Practice Packs',
      description: 'Organize scenarios into structured practice sessions for systematic improvement.'
    },
    {
      icon: Heart,
      title: 'Session Tracking',
      description: 'Track your progress over time with detailed conversation transcripts and analytics.'
    }
  ];

  const team = [
    {
      name: 'Michael Borck',
      role: 'Creator & Developer',
      description: 'Passionate about making AI-powered learning tools accessible to everyone.'
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

        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Mic size={48} className="text-blue-600" />
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Talk Buddy</h1>
                <p className="text-lg text-gray-600">Desktop Edition</p>
              </div>
            </div>
            <p className="text-xl text-gray-700 mb-4">
              AI-Powered Conversation Practice
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>Version {appVersion}</span>
              <span>•</span>
              <span>Electron {electronVersion}</span>
              <span>•</span>
              <span>MIT Licensed</span>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">About Talk Buddy</h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-700 mb-4">
              Talk Buddy is an AI-powered conversation practice application designed to help you 
              improve your speaking skills through realistic dialogue scenarios. Whether you're 
              preparing for job interviews, practicing a new language, or developing communication 
              skills, Talk Buddy provides a safe and supportive environment to practice.
            </p>
            <p className="text-gray-700 mb-4">
              Built with modern web technologies and packaged as a desktop application, Talk Buddy 
              offers a seamless experience with features like voice recognition, text-to-speech, 
              conversation analytics, and progress tracking.
            </p>
            <p className="text-gray-700">
              This project is open source and available under the MIT license, encouraging 
              community contributions and educational use.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Icon size={24} className="text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Development Team</h2>
          <div className="space-y-4">
            {team.map((member, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{member.name}</h3>
                  <p className="text-blue-600 text-sm mb-1">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Links Section */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Project Links</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (window.electronAPI?.shell?.openExternal) {
                  window.electronAPI.shell.openExternal('https://github.com/michael-borck/talk-buddy');
                }
              }}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Code2 size={20} className="text-gray-600" />
              <div>
                <p className="font-medium text-gray-800">Source Code</p>
                <p className="text-sm text-gray-600">View on GitHub</p>
              </div>
              <ExternalLink size={16} className="text-gray-400 ml-auto" />
            </a>
            
            <button
              onClick={() => navigate('/license')}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <Heart size={20} className="text-red-500" />
              <div>
                <p className="font-medium text-gray-800">License & Credits</p>
                <p className="text-sm text-gray-600">MIT License & Acknowledgments</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}