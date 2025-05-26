import React, { useState } from 'react';
import { Mic, Home, Users, MessageSquare, Info, ChevronLeft, Search, Bell, MoreVertical, CheckCircle, AlertCircle, Download, Upload, ArrowUp, ArrowDown, Plus, ArrowLeft, Calendar, Clock, Settings, Menu, Star } from 'lucide-react';

// --- Color System (from talkbuddy-ui-practical.tsx) ---
const colors = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  },
  success: {
    100: '#dcfce7',
    500: '#10b981',
  },
  warning: {
    100: '#fef3c7',
    500: '#f59e0b',
  },
  danger: {
    100: '#fee2e2',
    500: '#ef4444',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

// --- Reusable UI Components (adapted from talkbuddy-ui-practical.tsx) ---

const Button = ({ variant = 'primary', size = 'md', children, onClick, className = '', fullWidth = false, icon: Icon = null }) => {
  const baseStyle = "flex items-center justify-center font-medium rounded-lg transition-colors duration-200";
  
  const variants = {
    primary: `bg-[${colors.primary[600]}] text-white hover:bg-[${colors.primary[700]}]`,
    secondary: `bg-white border border-[${colors.gray[300]}] text-[${colors.gray[700]}] hover:bg-[${colors.gray[100]}]`,
    danger: `bg-[${colors.danger[500]}] text-white hover:bg-opacity-90`,
    ghost: `bg-transparent text-[${colors.gray[700]}] hover:bg-[${colors.gray[100]}]`,
    link: `bg-transparent text-[${colors.primary[600]}] hover:underline p-0`,
    gradient: `bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600`,
  };
  
  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-md px-5 py-2.5",
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      onClick={onClick}
    >
      {Icon && <Icon className="w-4 h-4 mr-1" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', padding = 'md' }) => {
  const paddingSize = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm ${paddingSize[padding]} ${className}`}>
      {children}
    </div>
  );
};

const Badge = ({ type, children }) => {
  const types = {
    technical: 'bg-blue-100 text-blue-800',
    academic: 'bg-indigo-100 text-indigo-800',
    behavioral: 'bg-green-100 text-green-800',
    professional: 'bg-amber-100 text-amber-800',
    language: 'bg-red-100 text-red-800',
    custom: 'bg-gray-200 text-gray-700'
  };
  
  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mr-2 ${types[type]}`}>
      {children}
    </span>
  );
};

const ProviderPill = ({ type, name }) => {
  const types = {
    free: 'bg-green-50 text-green-700',
    premium: 'bg-amber-50 text-amber-700',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full mr-1 ${types[type]}`}>
      <span>{name}</span>
    </span>
  );
};

const Tab = ({ label, icon: Icon, active, onClick }) => {
  return (
    <button 
      className={`flex flex-col items-center p-2 rounded-lg ${active ? 'text-[${colors.primary[600]}]' : 'text-[${colors.gray[600]}]'} hover:bg-gray-100`}
      onClick={onClick}
    >
      <div className="mb-1">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs">{label}</span>
    </button>
  );
};

// App header component
const AppHeader = ({ title, showBackButton = false, showUser = true, onBackClick, rightContent = null }) => {
  return (
    <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center">
        {showBackButton && (
          <ChevronLeft className="w-5 h-5 mr-2 cursor-pointer" onClick={onBackClick} />
        )}
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
      <div className="flex items-center">
        {rightContent}
        {showUser && (
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium ml-2">
            JS
          </div>
        )}
      </div>
    </div>
  );
};

// TabBar navigation
const TabBar = ({ activeTab = 'home', onTabChange }) => {
  return (
    <div className="flex justify-around items-center p-3 bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-10 shadow-lg">
      <Tab 
        label="Home" 
        icon={Home} 
        active={activeTab === 'home'} 
        onClick={() => onTabChange('home')}
      />
      <Tab 
        label="Scenarios" 
        icon={Users} 
        active={activeTab === 'scenarios'} 
        onClick={() => onTabChange('scenarios')}
      />
      <Tab 
        label="Sessions" 
        icon={MessageSquare} 
        active={activeTab === 'sessions'} 
        onClick={() => onTabChange('sessions')}
      />
      <Tab 
        label="About" 
        icon={Info} 
        active={activeTab === 'about'} 
        onClick={() => onTabChange('about')}
      />
    </div>
  );
};

// Scenario card component
const ScenarioCard = ({ title, description, categories, provider, onPractice, onImport, onEdit }) => {
  return (
    <Card className="mb-3">
      <div className="flex justify-between mb-2">
        <div>
          {categories.map((cat, index) => (
            <Badge key={index} type={cat.toLowerCase()}>{cat}</Badge>
          ))}
        </div>
        <MoreVertical className="w-5 h-5 text-gray-400 cursor-pointer" />
      </div>
      <h3 className="font-medium text-lg mb-1">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <ProviderPill type={provider.type} name={provider.name} />
        </div>
        <div className="flex gap-2">
          {onEdit && <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>}
          {onImport && <Button size="sm" onClick={onImport}>Import</Button>}
          {onPractice && <Button size="sm" onClick={onPractice}>Practice</Button>}
        </div>
      </div>
    </Card>
  );
};

// Message bubble for conversation
const MessageBubble = ({ isUser, children }) => {
  const userStyle = `bg-[${colors.primary[500]}] text-white ml-auto rounded-br-sm`;
  const aiStyle = `bg-[${colors.gray[100]}] text-[${colors.gray[800]}] mr-auto rounded-bl-sm`;
  
  return (
    <div className={`max-w-[80%] p-3 rounded-lg mb-3 shadow-sm ${isUser ? userStyle : aiStyle}`}>
      {children}
    </div>
  );
};

// Push to talk button with animation
const PushToTalkButton = ({ state = 'idle', onClick }) => {
  const buttonState = {
    idle: {
      bgColor: `bg-[${colors.primary[500]}]`,
      iconColor: 'text-white',
      label: 'Push to Talk',
      animation: ''
    },
    listening: {
      bgColor: `bg-[${colors.primary[500]}]`,
      iconColor: 'text-white',
      label: 'Listening...',
      animation: 'animate-pulse'
    },
    speaking: {
      bgColor: `bg-[${colors.danger[500]}]`,
      iconColor: 'text-white',
      label: 'Release to Stop',
      animation: 'animate-ping-once' // Custom animation for speaking
    },
    thinking: {
      bgColor: `bg-[${colors.primary[500]}]`,
      iconColor: 'text-white',
      label: 'AI is thinking...',
      animation: 'animate-pulse'
    }
  };

  const current = buttonState[state];

  return (
    <div className="flex flex-col items-center relative">
      <style>{`
        @keyframes ping-once {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-ping-once {
          animation: ping-once 1s ease-in-out infinite;
        }
      `}</style>
      <button 
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${current.bgColor} ${current.animation}`}
        onClick={onClick}
      >
        <Mic className={`w-10 h-10 ${current.iconColor}`} />
      </button>
      <span className="text-sm text-gray-500 mt-2">{current.label}</span>
    </div>
  );
};

// Scenario feedback component
const FeedbackItem = ({ type, title, description }) => {
  const types = {
    positive: (
      <div className={`w-6 h-6 rounded-full bg-[${colors.success[100]}] flex items-center justify-center mr-2 mt-0.5`}>
        <CheckCircle className={`w-4 h-4 text-[${colors.success[500]}]`} />
      </div>
    ),
    warning: (
      <div className={`w-6 h-6 rounded-full bg-[${colors.warning[100]}] flex items-center justify-center mr-2 mt-0.5`}>
        <AlertCircle className={`w-4 h-4 text-[${colors.warning[500]}]`} />
      </div>
    ),
  };
  
  return (
    <div className="flex items-start mb-3">
      {types[type]}
      <div>
        <h5 className="font-medium text-sm">{title}</h5>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
};

// --- Screen Components ---

const WelcomeScreen = ({ onSignIn, onCreateAccount, onContinueAsGuest }) => (
  <div className="flex flex-col items-center justify-between min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white">
    <div className="flex flex-col items-center text-center mt-12">
      <div className={`w-24 h-24 rounded-full bg-[${colors.primary[100]}] flex items-center justify-center mb-6 shadow-md`}>
        <Mic className={`w-12 h-12 text-[${colors.primary[600]}]`} />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-3">TalkBuddy</h1>
      <p className="text-lg text-gray-600 mb-10 max-w-sm">Open-Source AI Conversation Practice for Students</p>
      
      <div className="space-y-6 text-left w-full max-w-xs">
        <div className="flex items-start">
          <div className={`w-10 h-10 rounded-full bg-[${colors.primary[50]}] flex items-center justify-center mr-4 flex-shrink-0`}>
            <Users className={`w-5 h-5 text-[${colors.primary[600]}]`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Interview Practice</h3>
            <p className="text-sm text-gray-600">Academic, technical, and professional interviews</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className={`w-10 h-10 rounded-full bg-[${colors.primary[50]}] flex items-center justify-center mr-4 flex-shrink-0`}>
            <MessageSquare className={`w-5 h-5 text-[${colors.primary[600]}]`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Language Learning</h3>
            <p className="text-sm text-gray-600">Conversation practice in multiple languages</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className={`w-10 h-10 rounded-full bg-[${colors.primary[50]}] flex items-center justify-center mr-4 flex-shrink-0`}>
            <Star className={`w-5 h-5 text-[${colors.primary[600]}]`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Always Free & Private</h3>
            <p className="text-sm text-gray-600">Open-source with no required API keys</p>
          </div>
        </div>
      </div>
    </div>
    
    <div className="w-full max-w-xs space-y-3 mb-12">
      <Button variant="primary" fullWidth onClick={onSignIn}>Sign In</Button>
      <Button variant="secondary" fullWidth onClick={onCreateAccount}>Create Account</Button>
      <div className="text-center text-sm text-gray-600 mt-2">
        <span>Just exploring? </span>
        <button className={`text-[${colors.primary[600]}] font-medium hover:underline`} onClick={onContinueAsGuest}>Continue as Guest</button>
      </div>
    </div>
  </div>
);

const DashboardScreen = ({ onStartNewSession, onImportScenario, onScenarioPractice, onSessionViewTranscript, onSessionContinue, onTabChange }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader title="Dashboard" rightContent={<Bell className="w-5 h-5 text-gray-700 cursor-pointer mr-2" />} />
    
    <div className="flex-grow p-4 overflow-y-auto pb-20">
      <Card className={`bg-gradient-to-r from-[${colors.primary[500]}] to-purple-500 text-white mb-6 p-5`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Welcome back, Jamie!</h3>
            <p className="text-indigo-100 text-sm">Ready for some practice today?</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg px-3 py-1 text-sm">
            <span className="font-medium">5</span> sessions this week
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="bg-white text-indigo-600 hover:bg-white hover:bg-opacity-90" onClick={onStartNewSession}>Start New Session</Button>
          <Button variant="ghost" className="bg-white bg-opacity-20 text-white hover:bg-white hover:bg-opacity-30" onClick={onImportScenario}>Import Scenario</Button>
        </div>
      </Card>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg text-gray-800">Recent Scenarios</h3>
          <button className={`text-[${colors.primary[600]}] text-sm`} onClick={() => onTabChange('scenarios')}>View All</button>
        </div>
        
        <ScenarioCard 
          title="Software Engineering Interview"
          description="Technical interview preparation for software roles. Covers data structures, algorithms, and system design."
          categories={['Technical', 'Professional']}
          provider={{type: 'free', name: 'Browser API'}}
          onPractice={onScenarioPractice}
        />
        
        <ScenarioCard 
          title="Graduate School Interview"
          description="Prepare for your graduate program interview with common questions about research interests and career goals."
          categories={['Academic']}
          provider={{type: 'premium', name: 'OpenAI'}}
          onPractice={onScenarioPractice}
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg text-gray-800">Recent Sessions</h3>
          <button className={`text-[${colors.primary[600]}] text-sm`} onClick={() => onTabChange('sessions')}>View All</button>
        </div>
        
        <Card className="mb-4">
          <div className="flex justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-800">Software Engineering Interview</h4>
              <p className="text-sm text-gray-600">45 min session · Yesterday</p>
            </div>
            <div className={`w-10 h-10 rounded-full bg-[${colors.success[100]}] flex items-center justify-center`}>
              <CheckCircle className={`w-5 h-5 text-[${colors.success[500]}]`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" fullWidth onClick={onSessionViewTranscript}>View Transcript</Button>
            <Button variant="primary" fullWidth onClick={onSessionContinue}>Continue</Button>
          </div>
        </Card>
        
        <Card className="mb-4">
          <div className="flex justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-800">Graduate School Interview</h4>
              <p className="text-sm text-gray-600">32 min session · May 23, 2025</p>
            </div>
            <div className={`w-10 h-10 rounded-full bg-[${colors.primary[100]}] flex items-center justify-center`}>
              <ArrowDown className={`w-5 h-5 text-[${colors.primary[600]}]`} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" fullWidth onClick={onSessionViewTranscript}>View Transcript</Button>
            <Button variant="primary" fullWidth onClick={onSessionContinue}>Continue</Button>
          </div>
        </Card>
      </div>
    </div>
    <TabBar activeTab="home" onTabChange={onTabChange} />
  </div>
);

const ScenarioLibraryScreen = ({ onBack, onTabChange, onCreateNewScenario, onScenarioPractice, onScenarioImport, onScenarioEdit }) => {
  const [filter, setFilter] = useState('All');

  const scenarios = [
    { 
      id: 1, 
      title: "Software Engineering Interview", 
      description: "Technical interview preparation for software roles. Covers data structures, algorithms, and system design.", 
      categories: ['Technical', 'Professional'], 
      createdBy: 'TechU', 
      rating: 4.2, 
      provider: {type: 'free', name: 'Browser API'},
      type: 'community'
    },
    { 
      id: 2, 
      title: "Graduate School Interview", 
      description: "Prepare for your graduate program interview with common questions about research interests and career goals.", 
      categories: ['Academic'], 
      createdBy: 'AcademicPrep', 
      rating: 4.8, 
      provider: {type: 'free', name: 'Ollama'},
      type: 'community'
    },
    { 
      id: 3, 
      title: "English Conversation Practice", 
      description: "Practice everyday English conversations with a friendly AI partner. Great for ESL students.", 
      categories: ['Language'], 
      createdBy: 'LanguageBuddy', 
      rating: 4.1, 
      provider: {type: 'premium', name: 'ElevenLabs'},
      type: 'community'
    },
    {
      id: 4,
      title: "My Custom Behavioral Interview",
      description: "A scenario I created to practice behavioral questions for leadership roles.",
      categories: ['Behavioral', 'Custom'],
      createdBy: 'You',
      rating: 5.0,
      provider: {type: 'free', name: 'Browser API'},
      type: 'personal'
    }
  ];

  const filteredScenarios = scenarios.filter(scenario => 
    filter === 'All' || scenario.categories.includes(filter) || scenario.type === filter.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader 
        title="Scenario Library" 
        showBackButton={true} 
        onBackClick={onBack} 
        rightContent={<Search className="w-5 h-5 text-gray-700 cursor-pointer" />} 
      />
      
      <div className="flex-grow p-4 overflow-y-auto pb-20">
        <div className="flex gap-2 mb-4 overflow-x-auto py-1 whitespace-nowrap scrollbar-hide">
          {['All', 'Technical', 'Academic', 'Behavioral', 'Language', 'Personal'].map(f => (
            <Button 
              key={f}
              variant={filter === f ? 'primary' : 'secondary'} 
              size="sm" 
              className="flex-shrink-0"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg text-gray-800">
            {filter === 'Personal' ? 'My Scenarios' : 'Community Library'}
          </h3>
          <Button icon={Plus} size="sm" onClick={onCreateNewScenario}>
            Create New
          </Button>
        </div>
        
        {filteredScenarios.map(scenario => (
          <ScenarioCard 
            key={scenario.id}
            title={scenario.title}
            description={scenario.description}
            categories={scenario.categories}
            provider={scenario.provider}
            onPractice={() => onScenarioPractice(scenario)}
            onImport={scenario.type === 'community' ? () => onScenarioImport(scenario) : null}
            onEdit={scenario.type === 'personal' ? () => onScenarioEdit(scenario) : null}
          />
        ))}

        {filteredScenarios.length === 0 && (
          <Card className="text-center text-gray-600 py-8">
            No scenarios found for this filter.
          </Card>
        )}
      </div>
      <TabBar activeTab="scenarios" onTabChange={onTabChange} />
    </div>
  );
};

const ScenarioCreatorScreen = ({ onBack, onSaveScenario }) => {
  const [scenarioName, setScenarioName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [persona, setPersona] = useState('');
  const [context, setContext] = useState('');
  const [sampleQuestions, setSampleQuestions] = useState(['']);
  const [webSpeech, setWebSpeech] = useState(true);
  const [huggingFace, setHuggingFace] = useState(true);
  const [openAI, setOpenAI] = useState(false);
  const [elevenLabs, setElevenLabs] = useState(false);
  const [sharePublic, setSharePublic] = useState(false);
  const [personalOnly, setPersonalOnly] = useState(true);

  const handleAddQuestion = () => {
    setSampleQuestions([...sampleQuestions, '']);
  };

  const handleQuestionChange = (index, value) => {
    const newQuestions = [...sampleQuestions];
    newQuestions[index] = value;
    setSampleQuestions(newQuestions);
  };

  const handleRemoveQuestion = (index) => {
    const newQuestions = sampleQuestions.filter((_, i) => i !== index);
    setSampleQuestions(newQuestions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newScenario = {
      scenarioName,
      description,
      category,
      difficulty,
      persona,
      context,
      sampleQuestions: sampleQuestions.filter(q => q.trim() !== ''),
      providers: { webSpeech, huggingFace, openAI, elevenLabs },
      sharing: { sharePublic, personalOnly }
    };
    onSaveScenario(newScenario);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader title="Create New Scenario" showBackButton={true} onBackClick={onBack} />
      
      <div className="flex-grow p-4 overflow-y-auto pb-20">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Name</label>
            <input 
              type="text" 
              placeholder="E.g., Data Science Technical Interview" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              placeholder="Describe the purpose and content of this scenario..." 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Technical</option>
                <option>Academic</option>
                <option>Behavioral</option>
                <option>Language</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interviewer Persona</label>
            <textarea 
              placeholder="Describe the AI interviewer's role, personality, and style..." 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interview Context</label>
            <textarea 
              placeholder="Describe the interview setting, purpose, and expectations..." 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sample Questions</label>
            <div className="space-y-2">
              {sampleQuestions.map((question, index) => (
                <div key={index} className="flex items-center">
                  <input 
                    type="text" 
                    placeholder={`Question ${index + 1}`} 
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                    value={question}
                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                  />
                  {sampleQuestions.length > 1 && (
                    <button type="button" className="ml-2 p-2 text-gray-500 hover:text-red-500" onClick={() => handleRemoveQuestion(index)}>
                      <Trash2 className="w-5 h-5" /> {/* Using Trash2 for delete icon */}
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className={`flex items-center text-[${colors.primary[600]}] text-sm font-medium hover:underline`} onClick={handleAddQuestion}>
                <Plus className="w-4 h-4 mr-1" />
                Add Question
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider Requirements</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input type="checkbox" id="web-speech" className={`h-4 w-4 text-[${colors.primary[600]}] focus:ring-[${colors.primary[500]}] border-gray-300 rounded`} checked={webSpeech} onChange={(e) => setWebSpeech(e.target.checked)} />
                <label htmlFor="web-speech" className="ml-2 block text-sm text-gray-700">Web Speech API (Default Free)</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="huggingface" className={`h-4 w-4 text-[${colors.primary[600]}] focus:ring-[${colors.primary[500]}] border-gray-300 rounded`} checked={huggingFace} onChange={(e) => setHuggingFace(e.target.checked)} />
                <label htmlFor="huggingface" className="ml-2 block text-sm text-gray-700">Hugging Face (Default Free)</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="openai" className={`h-4 w-4 text-[${colors.primary[600]}] focus:ring-[${colors.primary[500]}] border-gray-300 rounded`} checked={openAI} onChange={(e) => setOpenAI(e.target.checked)} />
                <label htmlFor="openai" className="ml-2 block text-sm text-gray-700">OpenAI (Optional)</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="elevenlabs" className={`h-4 w-4 text-[${colors.primary[600]}] focus:ring-[${colors.primary[500]}] border-gray-300 rounded`} checked={elevenLabs} onChange={(e) => setElevenLabs(e.target.checked)} />
                <label htmlFor="elevenlabs" className="ml-2 block text-sm text-gray-700">ElevenLabs (Optional)</label>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sharing Options</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input type="checkbox" id="public-library" className={`h-4 w-4 text-[${colors.primary[600]}] focus:ring-[${colors.primary[500]}] border-gray-300 rounded`} checked={sharePublic} onChange={(e) => setSharePublic(e.target.checked)} />
                <label htmlFor="public-library" className="ml-2 block text-sm text-gray-700">Add to public community library</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="personal-only" className={`h-4 w-4 text-[${colors.primary[600]}] focus:ring-[${colors.primary[500]}] border-gray-300 rounded`} checked={personalOnly} onChange={(e) => setPersonalOnly(e.target.checked)} />
                <label htmlFor="personal-only" className="ml-2 block text-sm text-gray-700">Keep in my personal library only</label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-3">
            <Button type="button" variant="secondary" fullWidth onClick={onBack}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth>Create Scenario</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Trash2 icon for deleting questions
const Trash2 = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);


const ConversationScreen = ({ onBack, onEndSession }) => {
  const [conversationState, setConversationState] = useState('idle'); // idle, listening, speaking, thinking

  const handleMicClick = () => {
    if (conversationState === 'idle') {
      setConversationState('listening');
      // Simulate AI response after a delay
      setTimeout(() => {
        setConversationState('thinking');
        setTimeout(() => {
          setConversationState('idle');
        }, 3000); // Simulate AI speaking duration
      }, 2000); // Simulate listening duration
    } else if (conversationState === 'listening') {
      setConversationState('thinking');
      // Simulate AI response after a delay
      setTimeout(() => {
        setConversationState('idle');
      }, 3000); // Simulate AI speaking duration
    } else if (conversationState === 'speaking') {
      setConversationState('thinking');
      // Simulate AI response after a delay
      setTimeout(() => {
        setConversationState('idle');
      }, 3000); // Simulate AI speaking duration
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader 
        title="Software Engineering Interview" 
        showBackButton={true} 
        onBackClick={onBack} 
        rightContent={<Settings className="w-5 h-5 text-gray-700 cursor-pointer" />} 
      />
      
      <div className="bg-indigo-50 p-3 flex items-center space-x-3 mb-4 shadow-sm">
        <div className={`w-12 h-12 rounded-full bg-[${colors.primary[100]}] flex items-center justify-center`}>
          <Menu className={`w-6 h-6 text-[${colors.primary[600]}]`} /> {/* Placeholder for AI avatar */}
        </div>
        <div>
          <h3 className="font-medium text-gray-800">Sarah, Senior Engineer</h3>
          <p className="text-sm text-gray-600">Technical Interviewer</p>
        </div>
        <div className="flex ml-auto gap-1">
          <ProviderPill type="free" name="Browser API" />
          <ProviderPill type="free" name="HF Model" />
        </div>
      </div>
      
      <div className="flex-grow px-4 overflow-y-auto pb-28"> {/* Increased padding for fixed bottom bar */}
        <MessageBubble isUser={false}>
          <p>Hi there! I'm Sarah, a Senior Software Engineer. I'll be conducting your technical interview today. Let's start with an introduction - could you tell me a bit about your background and experience?</p>
        </MessageBubble>
        
        <MessageBubble isUser={true}>
          <p>Hi Sarah, thanks for having me today. I'm Jamie, a recent computer science graduate with a focus on web development. I've completed internships at two tech startups where I worked on full-stack development with React and Node.js.</p>
        </MessageBubble>
        
        <MessageBubble isUser={false}>
          <p>Great introduction, Jamie! I'd like to dive into some technical questions. Let's start with data structures. Could you explain the difference between arrays and linked lists, and give an example of when you might choose one over the other?</p>
        </MessageBubble>
        
        <MessageBubble isUser={true}>
          <p>Arrays store elements in contiguous memory locations, providing O(1) access to elements using their index. Linked lists store elements at scattered locations with pointers connecting them, offering O(1) insertion and deletion at any position.</p>
          <p className="mt-2">I'd choose arrays when I need fast random access or have a fixed size collection. Linked lists are better when I need frequent insertions or deletions, especially at the beginning, or when the collection size changes frequently.</p>
        </MessageBubble>
        
        <MessageBubble isUser={false}>
          <p>That's a solid explanation, Jamie. Now, let's move to a coding question. How would you implement a function to reverse a linked list? Could you walk me through your approach and then the code?</p>
        </MessageBubble>
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex flex-col items-center z-10 shadow-lg">
        <div className="w-full mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-gray-700 mr-2" />
            <span className="text-sm text-gray-700">00:08:42</span>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={onEndSession}>End Session</Button>
          </div>
        </div>
        
        <PushToTalkButton state={conversationState} onClick={handleMicClick} />
      </div>
    </div>
  );
};

const SessionResultsScreen = ({ onBack, onPracticeAgain, onViewFullTranscript, onTabChange }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <AppHeader 
      title="Session Results" 
      showBackButton={true} 
      onBackClick={onBack} 
      rightContent={<Download className="w-5 h-5 text-gray-700 cursor-pointer" />} 
    />
    
    <div className="flex-grow p-4 overflow-y-auto pb-20">
      <Card className="mb-4">
        <h3 className="font-semibold text-lg mb-1 text-gray-800">Software Engineering Interview</h3>
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-gray-600">Completed May 25, 2025 • 45 minutes</p>
          <div className={`bg-[${colors.success[100]}] text-[${colors.success[800]}] text-xs px-2 py-1 rounded-full font-medium`}>Completed</div>
        </div>
        
        <div className="flex items-center mb-4">
          <div className={`w-10 h-10 rounded-full bg-[${colors.primary[100]}] flex items-center justify-center mr-3`}>
            <Menu className={`w-5 h-5 text-[${colors.primary[600]}]`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Sarah, Senior Engineer</h4>
            <p className="text-sm text-gray-600">Technical Interviewer</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Questions Asked</div>
            <div className="text-xl font-semibold text-gray-800">12</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Your Responses</div>
            <div className="text-xl font-semibold text-gray-800">12</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Avg. Response Time</div>
            <div className="text-xl font-semibold text-gray-800">42s</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Technical Score</div>
            <div className={`text-xl font-semibold text-[${colors.success[600]}]`}>8.4/10</div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="font-medium mb-2 text-gray-800">AI Feedback Summary</h4>
          <div className="bg-gray-50 p-3 rounded-lg mb-3">
            <FeedbackItem 
              type="positive" 
              title="Strong Technical Knowledge" 
              description="You demonstrated solid understanding of data structures, algorithms, and system design concepts."
            />
            <FeedbackItem 
              type="positive" 
              title="Clear Communication" 
              description="Your explanations were well-structured and easy to follow, with good examples."
            />
            <FeedbackItem 
              type="warning" 
              title="Consider Time Management" 
              description="Some of your answers were very detailed, which is good, but consider being more concise for time-sensitive interviews."
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button variant="primary" fullWidth onClick={onViewFullTranscript}>View Full Transcript</Button>
          <Button variant="secondary" fullWidth onClick={onPracticeAgain}>Practice Again</Button>
        </div>
      </Card>
      
      <Card className="mb-4">
        <h3 className="font-semibold text-lg mb-2 text-gray-800">Transcript Highlights</h3>
        
        <div className={`border-l-4 border-[${colors.primary[500]}] pl-3 py-1 mb-3`}>
          <p className="text-gray-600 text-sm">
            <span className="font-medium text-gray-800">Sarah:</span> 
            Could you explain the difference between arrays and linked lists, and give an example of when you might choose one over the other?
          </p>
        </div>
        
        <div className={`border-l-4 border-[${colors.success[500]}] pl-3 py-1 mb-3`}>
          <p className="text-gray-600 text-sm">
            <span className="font-medium text-gray-800">You:</span> 
            Arrays store elements in contiguous memory locations, providing O(1) access to elements using their index. Linked lists store elements at scattered locations with pointers connecting them, offering O(1) insertion and deletion at any position.
          </p>
          <p className="text-gray-600 text-sm mt-1">
            I'd choose arrays when I need fast random access or have a fixed size collection. Linked lists are better when I need frequent insertions or deletions, especially at the beginning, or when the collection size changes frequently.
          </p>
        </div>
        
        <Button variant="secondary" fullWidth>See More</Button>
      </Card>
      
      <Card>
        <h3 className="font-semibold text-lg mb-2 text-gray-800">Performance Over Time</h3>
        
        <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
          <span>Technical Score</span>
          <span>Last 5 Sessions</span>
        </div>
        
        <div className="h-40 bg-gray-50 rounded-lg p-3 mb-3 flex items-end overflow-hidden">
          {/* Simple bar chart mock for performance */}
          <div className="flex-1 h-1/2 bg-indigo-100 rounded-t-md relative mx-1">
            <div className={`absolute bottom-0 left-0 right-0 h-4/5 bg-[${colors.primary[500]}] rounded-t-md`}></div>
          </div>
          <div className="flex-1 h-3/5 bg-indigo-100 rounded-t-md relative mx-1">
            <div className={`absolute bottom-0 left-0 right-0 h-4/5 bg-[${colors.primary[500]}] rounded-t-md`}></div>
          </div>
          <div className="flex-1 h-4/5 bg-indigo-100 rounded-t-md relative mx-1">
            <div className={`absolute bottom-0 left-0 right-0 h-4/5 bg-[${colors.primary[500]}] rounded-t-md`}></div>
          </div>
          <div className="flex-1 h-4/5 bg-indigo-100 rounded-t-md relative mx-1">
            <div className={`absolute bottom-0 left-0 right-0 h-9/10 bg-[${colors.primary[500]}] rounded-t-md`}></div>
          </div>
          <div className="flex-1 h-full bg-indigo-100 rounded-t-md relative mx-1">
            <div className={`absolute bottom-0 left-0 right-0 h-[84%] bg-[${colors.primary[500]}] rounded-t-md`}></div>
          </div>
        </div>
        
        <Button variant="secondary" fullWidth>View Detailed Analytics</Button>
      </Card>
    </div>
    <TabBar activeTab="sessions" onTabChange={onTabChange} />
  </div>
);


// --- Main App Component ---
export default function App() {
  const [activeView, setActiveView] = useState('welcome'); // 'welcome', 'dashboard', 'scenarios', 'create-scenario', 'conversation', 'results'

  const handleSignIn = () => setActiveView('dashboard');
  const handleCreateAccount = () => setActiveView('dashboard');
  const handleContinueAsGuest = () => setActiveView('dashboard');

  const handleStartNewSession = () => setActiveView('conversation');
  const handleImportScenario = () => setActiveView('scenarios'); // Go to scenarios to import

  const handleScenarioPractice = (scenario) => {
    console.log('Practicing scenario:', scenario.title);
    setActiveView('conversation');
  };
  const handleScenarioImport = (scenario) => {
    console.log('Importing scenario:', scenario.title);
    // Logic to import scenario
  };
  const handleScenarioEdit = (scenario) => {
    console.log('Editing scenario:', scenario.title);
    // Logic to edit scenario
    setActiveView('create-scenario'); // Reuse create screen for editing
  };
  const handleCreateNewScenario = () => setActiveView('create-scenario');
  const handleSaveScenario = (newScenario) => {
    console.log('Saving new scenario:', newScenario);
    setActiveView('scenarios'); // Go back to scenario library after saving
  };

  const handleSessionViewTranscript = () => setActiveView('results');
  const handleSessionContinue = () => setActiveView('conversation');

  const handleEndSession = () => setActiveView('results');
  const handlePracticeAgain = () => setActiveView('conversation');
  const onViewFullTranscript = () => console.log('Viewing full transcript');

  return (
    <div className="min-h-screen bg-gray-100 antialiased">
      {activeView === 'welcome' && (
        <WelcomeScreen 
          onSignIn={handleSignIn} 
          onCreateAccount={handleCreateAccount} 
          onContinueAsGuest={handleContinueAsGuest} 
        />
      )}

      {activeView === 'dashboard' && (
        <DashboardScreen 
          onStartNewSession={handleStartNewSession}
          onImportScenario={handleImportScenario}
          onScenarioPractice={handleScenarioPractice}
          onSessionViewTranscript={handleSessionViewTranscript}
          onSessionContinue={handleSessionContinue}
          onTabChange={setActiveView}
        />
      )}

      {activeView === 'scenarios' && (
        <ScenarioLibraryScreen 
          onBack={() => setActiveView('dashboard')}
          onTabChange={setActiveView}
          onCreateNewScenario={handleCreateNewScenario}
          onScenarioPractice={handleScenarioPractice}
          onScenarioImport={handleScenarioImport}
          onScenarioEdit={handleScenarioEdit}
        />
      )}

      {activeView === 'create-scenario' && (
        <ScenarioCreatorScreen 
          onBack={() => setActiveView('scenarios')}
          onSaveScenario={handleSaveScenario}
        />
      )}

      {activeView === 'conversation' && (
        <ConversationScreen 
          onBack={() => setActiveView('dashboard')}
          onEndSession={handleEndSession}
        />
      )}

      {activeView === 'results' && (
        <SessionResultsScreen 
          onBack={() => setActiveView('dashboard')}
          onPracticeAgain={handlePracticeAgain}
          onViewFullTranscript={onViewFullTranscript}
          onTabChange={setActiveView}
        />
      )}
    </div>
  );
}

