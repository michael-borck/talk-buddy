import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ConversationPage } from './pages/ConversationPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ScenarioFormPage } from './pages/ScenarioFormPage';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConversationAnalysisPage } from './pages/ConversationAnalysisPage';
import { PracticePacksPage } from './pages/PracticePacksPage';
import { PackDetailPage } from './pages/PackDetailPage';
import { ArchivePage } from './pages/ArchivePage';
import { AboutPage } from './pages/AboutPage';
import { LicensePage } from './pages/LicensePage';
import { HelpPage } from './pages/HelpPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { HomePage } from './pages/HomePage';
import { getPreference } from './services/sqlite';
import { StatusFooter } from './components/StatusFooter';
import { TabBar } from './components/TabBar';
import { Toaster } from 'react-hot-toast';

// Apply the user's theme preference and respond to system colour-scheme
// changes when they've chosen "system". Studio Calm CSS already defines
// the dark tokens under html[data-theme='dark']; this hook just toggles
// the attribute. No transition animation — a snap is honest, a fade
// would feel "designed."
function useTheme() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (mode: 'light' | 'dark' | 'system') => {
      const effective = mode === 'system' ? (mq.matches ? 'dark' : 'light') : mode;
      document.documentElement.setAttribute('data-theme', effective);
    };

    let currentMode: 'light' | 'dark' | 'system' = 'system';

    getPreference('theme').then((v) => {
      currentMode = v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
      apply(currentMode);
    });

    const onSystemChange = () => {
      if (currentMode === 'system') apply('system');
    };
    mq.addEventListener('change', onSystemChange);

    // Cross-component bridge: the Settings page dispatches this event
    // when the user changes the theme preference, so we re-apply
    // without a full app reload.
    const onPrefChange = (e: Event) => {
      const detail = (e as CustomEvent<'light' | 'dark' | 'system'>).detail;
      if (detail === 'light' || detail === 'dark' || detail === 'system') {
        currentMode = detail;
        apply(currentMode);
      }
    };
    window.addEventListener('talkbuddy:theme-change', onPrefChange);

    return () => {
      mq.removeEventListener('change', onSystemChange);
      window.removeEventListener('talkbuddy:theme-change', onPrefChange);
    };
  }, []);
}

function App() {
  useTheme();
  return (
    <HashRouter>
      <div className="flex flex-col h-screen relative">
        {/* Toast notifications — editorial: ink card with vermilion rule */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0F0F0E',
              color: '#F6F1E7',
              padding: '14px 18px',
              borderRadius: '2px',
              fontSize: '14px',
              fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
              fontWeight: '400',
              letterSpacing: '0.005em',
              border: '1px solid rgba(246, 241, 231, 0.12)',
              boxShadow: 'none',
            },
            success: {
              iconTheme: { primary: '#D94B2B', secondary: '#0F0F0E' },
            },
            error: {
              iconTheme: { primary: '#D94B2B', secondary: '#0F0F0E' },
              style: {
                background: '#0F0F0E',
                color: '#F6F1E7',
                borderLeft: '2px solid #D94B2B',
                padding: '14px 18px',
                borderRadius: '2px',
                fontSize: '14px',
                fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
              },
            },
          }}
        />
        <AppContent />
      </div>
    </HashRouter>
  );
}

// Conversation-first shell: a bottom TabBar is the whole navigation,
// and the live Conversation gets the window to itself — no tabs, no
// footer — so practising feels like a place, not a panel. The service
// StatusFooter stays on Settings, where someone debugging a provider
// actually wants it.
function AppContent() {
  const location = useLocation();
  const inConversation = location.pathname.startsWith('/conversation');
  const inSettings = location.pathname.startsWith('/settings');

  return (
    <>
      <main className="flex-1 overflow-auto relative z-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/scenarios/new" element={<ScenarioFormPage />} />
          <Route path="/scenarios/edit/:scenarioId" element={<ScenarioFormPage />} />
          <Route path="/scenarios/local" element={<Navigate to="/scenarios" replace />} />
          <Route path="/packs" element={<PracticePacksPage />} />
          <Route path="/packs/:packId" element={<PackDetailPage />} />
          <Route path="/sessions" element={<SessionHistoryPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/conversation/:scenarioId" element={<ConversationPage />} />
          <Route path="/analysis/:sessionId" element={<ConversationAnalysisPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/documentation" element={<DocumentationPage />} />
        </Routes>
      </main>
      {inSettings && <StatusFooter />}
      {!inConversation && <TabBar />}
    </>
  );
}

export default App;
