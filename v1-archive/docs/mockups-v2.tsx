// TalkBuddy V2 - Visual Mockups
// These are React component mockups showing the audio-first interface

import React from 'react';

// ============================================
// CONVERSATION INTERFACE - AUDIO MODE
// ============================================

// State: IDLE (waiting to start)
export const ConversationIdle = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
    {/* Minimal Status Bar */}
    <div className="flex justify-between items-center p-4">
      <div className="text-sm text-gray-500">00:00</div>
      <button className="text-sm text-red-600 hover:text-red-700">
        End Session
      </button>
    </div>

    {/* AI Avatar - Center */}
    <div className="flex-1 flex items-center justify-center">
      <div className="relative">
        {/* Avatar Circle */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
      </div>
    </div>

    {/* Push to Talk Button */}
    <div className="p-8 flex justify-center">
      <button className="w-24 h-24 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-lg flex items-center justify-center">
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        </svg>
      </button>
    </div>
  </div>
);

// State: LISTENING (user speaking)
export const ConversationListening = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
    <div className="flex justify-between items-center p-4">
      <div className="text-sm text-gray-600">00:45</div>
      <button className="text-sm text-red-600 hover:text-red-700">
        End Session
      </button>
    </div>

    <div className="flex-1 flex items-center justify-center">
      <div className="relative">
        {/* Pulsing animation for listening */}
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-400 animate-ping opacity-25"></div>
        <div className="absolute inset-0 w-32 h-32 rounded-full bg-blue-400 animate-ping animation-delay-200 opacity-25"></div>
        
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg relative">
          <svg className="w-16 h-16 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
      </div>
    </div>

    {/* Active Push to Talk Button */}
    <div className="p-8 flex justify-center">
      <button className="w-24 h-24 rounded-full bg-red-600 scale-110 shadow-xl flex items-center justify-center">
        <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
      </button>
    </div>
  </div>
);

// State: THINKING (processing)
export const ConversationThinking = () => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col">
    <div className="flex justify-between items-center p-4">
      <div className="text-sm text-gray-600">01:23</div>
      <button className="text-sm text-red-600 hover:text-red-700">
        End Session
      </button>
    </div>

    <div className="flex-1 flex items-center justify-center">
      <div className="relative">
        {/* Thinking animation - rotating dots */}
        <div className="absolute inset-0 w-40 h-40 -m-4">
          <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full animate-orbit"></div>
          <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full animate-orbit animation-delay-200"></div>
          <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full animate-orbit animation-delay-400"></div>
        </div>
        
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      </div>
    </div>

    <div className="p-8 flex justify-center">
      <button className="w-24 h-24 rounded-full bg-gray-400 shadow-lg flex items-center justify-center opacity-50 cursor-not-allowed">
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        </svg>
      </button>
    </div>
  </div>
);

// State: SPEAKING (AI talking)
export const ConversationSpeaking = () => (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col">
    <div className="flex justify-between items-center p-4">
      <div className="text-sm text-gray-600">02:15</div>
      <button className="text-sm text-red-600 hover:text-red-700">
        End Session
      </button>
    </div>

    <div className="flex-1 flex items-center justify-center">
      <div className="relative">
        {/* Speaking rings animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full ring-4 ring-green-300 animate-ripple"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full ring-4 ring-green-300 animate-ripple animation-delay-300"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full ring-4 ring-green-300 animate-ripple animation-delay-600"></div>
        </div>
        
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg relative">
          <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 9v6h4l5 5V4l-5 5H9zm-2 0H5v6h2V9z"/>
          </svg>
        </div>
      </div>
    </div>

    <div className="p-8 flex justify-center">
      <button className="w-24 h-24 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-lg flex items-center justify-center">
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        </svg>
      </button>
    </div>
  </div>
);

// ============================================
// DASHBOARD - With text elements
// ============================================
export const Dashboard = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold">TalkBuddy</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">John Doe</span>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
              JD
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Main Content */}
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-6 text-white mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back, John!</h2>
        <p className="mb-4">Ready to practice? You've completed 5 sessions this week.</p>
        <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
          Start New Session
        </button>
      </div>

      {/* Recent Sessions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">Technical Interview</h4>
                <span className="text-xs text-gray-500">2 hours ago</span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Duration: 15 minutes
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Completed
                </span>
                <button className="text-sm text-blue-600 hover:underline">
                  View Transcript
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start Scenarios */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Start</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {['Technical', 'Behavioral', 'Academic', 'Medical'].map((type) => (
            <button
              key={type}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow text-left"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-medium">{type}</h4>
              <p className="text-sm text-gray-600">5 scenarios</p>
            </button>
          ))}
        </div>
      </div>
    </main>
  </div>
);

// ============================================
// SESSION HISTORY - Transcript View
// ============================================
export const TranscriptView = () => (
  <div className="min-h-screen bg-gray-50">
    <header className="bg-white shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <button className="mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Session Transcript</h1>
        </div>
      </div>
    </header>

    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Session Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Scenario</p>
            <p className="font-medium">Technical Interview</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="font-medium">15:32</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-medium">Nov 20, 2024</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Words/Min</p>
            <p className="font-medium">142</p>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Conversation</h2>
          
          <div className="space-y-4">
            <div className="flex">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm mr-3">
                AI
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">00:00</p>
                <p className="text-gray-800">
                  Hello! I'm here to help you practice for your technical interview. 
                  Let's start with a common question. Can you tell me about a challenging 
                  project you've worked on recently?
                </p>
              </div>
            </div>

            <div className="flex">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm mr-3">
                JD
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">00:15</p>
                <p className="text-gray-800">
                  Sure! I recently worked on implementing a real-time chat application 
                  using WebSockets. The main challenge was handling message ordering 
                  and ensuring messages were delivered even when users had intermittent 
                  connections...
                </p>
              </div>
            </div>

            {/* More messages... */}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t px-6 py-4 flex justify-between">
          <button className="text-blue-600 hover:underline flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
            </svg>
            Play Audio
          </button>
          <button className="text-blue-600 hover:underline flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-9.707a1 1 0 011.414 0L9 8.586V3a1 1 0 112 0v5.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
            Export
          </button>
        </div>
      </div>
    </main>
  </div>
);

// ============================================
// CSS ANIMATIONS (add to your CSS file)
// ============================================
const animationStyles = `
@keyframes orbit {
  from {
    transform: rotate(0deg) translateX(70px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(70px) rotate(-360deg);
  }
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

.animate-orbit {
  animation: orbit 2s linear infinite;
}

.animate-ripple {
  animation: ripple 1.5s ease-out infinite;
}

.animation-delay-200 {
  animation-delay: 200ms;
}

.animation-delay-300 {
  animation-delay: 300ms;
}

.animation-delay-400 {
  animation-delay: 400ms;
}

.animation-delay-600 {
  animation-delay: 600ms;
}
`;

export default animationStyles;