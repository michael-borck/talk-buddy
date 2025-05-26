from fasthtml.common import *
from fasthtml.core import RedirectResponse
import asyncio
import sqlite3
from pathlib import Path
import json
import os
from datetime import datetime

# Set up the app with WebSocket support
tlink = Script(src="https://cdn.tailwindcss.com")
dlink = Link(rel="stylesheet", href="https://cdn.jsdelivr.net/npm/daisyui@4.11.1/dist/full.min.css")
custom_css = Style("""
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
""")
app, rt = fast_app(
    hdrs=(tlink, dlink, custom_css, picolink), 
    exts='ws',
    static_path='static'
)

# Database setup
def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Scenarios table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scenarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            discipline TEXT,
            difficulty_level TEXT,
            interview_type TEXT,
            persona_prompt TEXT,
            context_prompt TEXT,
            sample_questions TEXT,
            evaluation_criteria TEXT,
            learning_objectives TEXT,
            duration_minutes INTEGER,
            is_default BOOLEAN DEFAULT FALSE,
            is_public BOOLEAN DEFAULT FALSE,
            is_imported BOOLEAN DEFAULT FALSE,
            created_by INTEGER,
            imported_from TEXT,
            share_token TEXT,
            download_count INTEGER DEFAULT 0,
            rating_average DECIMAL(3,2),
            rating_count INTEGER DEFAULT 0,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    ''')
    
    # Conversation sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversation_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            scenario_id INTEGER NOT NULL,
            session_name TEXT,
            transcript TEXT,
            ai_feedback TEXT,
            self_reflection TEXT,
            instructor_notes TEXT,
            duration INTEGER,
            turn_count INTEGER,
            question_count INTEGER,
            providers_used TEXT,
            performance_metrics TEXT,
            shared_with_instructor BOOLEAN DEFAULT FALSE,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (scenario_id) REFERENCES scenarios (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Load default scenarios
def load_default_scenarios():
    """Load default interview scenarios into the database"""
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    # Check if default scenarios already exist
    cursor.execute('SELECT COUNT(*) FROM scenarios WHERE is_default = TRUE')
    if cursor.fetchone()[0] > 0:
        conn.close()
        return
    
    default_scenarios = [
        {
            'name': 'Software Engineering Technical Interview',
            'description': 'Technical interview preparation for software roles. Covers data structures, algorithms, and system design.',
            'category': 'technical',
            'discipline': 'computer_science',
            'difficulty_level': 'intermediate',
            'interview_type': 'technical',
            'persona_prompt': 'You are Sarah, a Senior Software Engineer at a tech company. You are friendly but professional, and you ask clear, well-structured technical questions. You provide helpful feedback and encourage the candidate to think through problems step by step.',
            'context_prompt': 'This is a 45-minute technical interview for a new graduate software engineer position. Focus on fundamental computer science concepts, problem-solving approach, and communication skills.',
            'sample_questions': json.dumps([
                "Tell me about your programming background and experience.",
                "Explain the difference between arrays and linked lists.",
                "How would you implement a function to reverse a linked list?",
                "Describe how you would design a URL shortener service.",
                "What is the time complexity of common sorting algorithms?"
            ]),
            'evaluation_criteria': 'Technical accuracy, problem-solving approach, communication clarity, code quality',
            'learning_objectives': 'Practice technical communication, algorithm implementation, system design thinking',
            'duration_minutes': 45,
            'is_default': True,
            'is_public': True,
            'tags': json.dumps(['programming', 'algorithms', 'system-design'])
        },
        {
            'name': 'Graduate School Research Interview',
            'description': 'Prepare for your graduate program interview with common questions about research interests and career goals.',
            'category': 'academic',
            'discipline': 'general',
            'difficulty_level': 'graduate',
            'interview_type': 'behavioral',
            'persona_prompt': 'You are Dr. Johnson, a faculty member conducting graduate admission interviews. You are encouraging and interested in the candidate\'s research potential. You ask thoughtful questions about academic interests and career goals.',
            'context_prompt': 'This is a graduate program admission interview. Focus on research interests, academic background, motivation for graduate study, and fit with the program.',
            'sample_questions': json.dumps([
                "What research questions interest you most?",
                "Why do you want to pursue graduate study in this field?",
                "Describe a challenging academic project you completed.",
                "How does our program align with your career goals?",
                "What would you like to achieve in your graduate studies?"
            ]),
            'evaluation_criteria': 'Research understanding, motivation, academic fit, communication skills',
            'learning_objectives': 'Articulate research interests, demonstrate academic motivation, practice academic communication',
            'duration_minutes': 30,
            'is_default': True,
            'is_public': True,
            'tags': json.dumps(['academic', 'research', 'graduate-school'])
        }
    ]
    
    for scenario in default_scenarios:
        cursor.execute('''
            INSERT INTO scenarios (
                name, description, category, discipline, difficulty_level, interview_type,
                persona_prompt, context_prompt, sample_questions, evaluation_criteria,
                learning_objectives, duration_minutes, is_default, is_public, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            scenario['name'], scenario['description'], scenario['category'],
            scenario['discipline'], scenario['difficulty_level'], scenario['interview_type'],
            scenario['persona_prompt'], scenario['context_prompt'], scenario['sample_questions'],
            scenario['evaluation_criteria'], scenario['learning_objectives'], scenario['duration_minutes'],
            scenario['is_default'], scenario['is_public'], scenario['tags']
        ))
    
    conn.commit()
    conn.close()

# Load default scenarios on startup
load_default_scenarios()

# Layout template function
def app_layout(sess, content, active_tab="dashboard", page_title="TalkBuddy"):
    """Consistent layout template for all authenticated pages"""
    # Get user info from session
    user_email = sess.get('user_email', 'guest@talkbuddy.ai')
    user_name = sess.get('user_name', 'Guest User')
    user_initials = ''.join([name[0].upper() for name in user_name.split()[:2]])
    return Title(f'{page_title} - TalkBuddy'), Body(
        Div(
            # Desktop navigation sidebar (hidden on mobile)
            Div(
                Div(
                    H2("TalkBuddy", cls="text-xl font-bold text-indigo-600 mb-8"),
                    Nav(
                        A(
                            Div("🏠", cls="mr-3"),
                            Span("Dashboard"),
                            href="/dashboard",
                            cls=f"flex items-center p-3 rounded-lg mb-2 w-full {'text-indigo-600 bg-indigo-50' if active_tab == 'dashboard' else 'text-gray-600 hover:bg-gray-100'}"
                        ),
                        A(
                            Div("📋", cls="mr-3"),
                            Span("Scenarios"),
                            href="/scenarios",
                            cls=f"flex items-center p-3 rounded-lg mb-2 w-full {'text-indigo-600 bg-indigo-50' if active_tab == 'scenarios' else 'text-gray-600 hover:bg-gray-100'}"
                        ),
                        A(
                            Div("💬", cls="mr-3"),
                            Span("Sessions"),
                            href="/sessions",
                            cls=f"flex items-center p-3 rounded-lg mb-2 w-full {'text-indigo-600 bg-indigo-50' if active_tab == 'sessions' else 'text-gray-600 hover:bg-gray-100'}"
                        ),
                        A(
                            Div("⚙️", cls="mr-3"),
                            Span("Settings"),
                            href="/settings",
                            cls=f"flex items-center p-3 rounded-lg mb-2 w-full {'text-indigo-600 bg-indigo-50' if active_tab == 'settings' else 'text-gray-600 hover:bg-gray-100'}"
                        ),
                        A(
                            Div("ℹ️", cls="mr-3"),
                            Span("About"),
                            href="/about",
                            cls=f"flex items-center p-3 rounded-lg mb-2 w-full {'text-indigo-600 bg-indigo-50' if active_tab == 'about' else 'text-gray-600 hover:bg-gray-100'}"
                        ),
                        cls="flex flex-col space-y-1"
                    ),
                    # User section at bottom
                    Div(
                        Div(
                            Div(user_initials, cls="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium mr-3"),
                            Div(
                                P(user_name, cls="font-medium text-sm"),
                                P(user_email, cls="text-xs text-gray-500"),
                                cls="flex-1"
                            ),
                            cls="flex items-center mb-3"
                        ),
                        A("Logout", href="/auth/logout", cls="text-red-600 text-sm hover:underline"),
                        cls="mt-auto pt-4 border-t"
                    ),
                    cls="flex flex-col h-full p-6"
                ),
                cls="w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-full hidden lg:block z-10"
            ),
            
            # Main content area
            Div(
                # Header (mobile only)
                Div(
                    Div(
                        H1(page_title, cls="font-semibold text-lg"),
                        Details(
                            Summary(
                                Div(user_initials, cls="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium cursor-pointer"),
                                cls="list-none"
                            ),
                            Div(
                                Div(
                                    P(user_name, cls="font-medium text-sm"),
                                    P(user_email, cls="text-xs text-gray-500"),
                                    cls="p-3 border-b"
                                ),
                                A("Logout", href="/auth/logout", cls="block px-3 py-2 text-sm text-red-600 hover:bg-gray-50"),
                                cls="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                            ),
                            cls="relative"
                        ),
                        cls="flex flex-wrap gap-2 justify-between items-center"
                    ),
                    cls="p-4 border-b border-gray-200 bg-white lg:hidden"
                ),
                
                # Page content
                content,
                
                cls="flex-1 min-h-screen lg:pl-64 pb-20 lg:pb-0"
            ),
            cls="flex min-h-screen"
        ),
        
        # Mobile bottom navigation (visible on mobile, hidden on desktop)
        Div(
            Div(
                A(
                    Div("🏠", cls="mb-1"),
                    Span("Home", cls="text-xs"),
                    href="/dashboard",
                    cls=f"flex flex-col items-center p-2 rounded-lg {'text-indigo-600' if active_tab == 'dashboard' else 'text-gray-600 hover:bg-gray-100'}"
                ),
                A(
                    Div("📋", cls="mb-1"),
                    Span("Scenarios", cls="text-xs"),
                    href="/scenarios",
                    cls=f"flex flex-col items-center p-2 rounded-lg {'text-indigo-600' if active_tab == 'scenarios' else 'text-gray-600 hover:bg-gray-100'}"
                ),
                A(
                    Div("💬", cls="mb-1"),
                    Span("Sessions", cls="text-xs"),
                    href="/sessions",
                    cls=f"flex flex-col items-center p-2 rounded-lg {'text-indigo-600' if active_tab == 'sessions' else 'text-gray-600 hover:bg-gray-100'}"
                ),
                A(
                    Div("⚙️", cls="mb-1"),
                    Span("Settings", cls="text-xs"),
                    href="/settings",
                    cls=f"flex flex-col items-center p-2 rounded-lg {'text-indigo-600' if active_tab == 'settings' else 'text-gray-600 hover:bg-gray-100'}"
                ),
                A(
                    Div("ℹ️", cls="mb-1"),
                    Span("About", cls="text-xs"),
                    href="/about",
                    cls=f"flex flex-col items-center p-2 rounded-lg {'text-indigo-600' if active_tab == 'about' else 'text-gray-600 hover:bg-gray-100'}"
                ),
                cls="flex justify-around items-center"
            ),
            cls="p-3 bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 shadow-lg lg:hidden"
        ),
        
        # Custom CSS for responsive design
        Style("""
            .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
            .line-clamp-2 {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            /* Ensure proper layout on all screen sizes */
            @media (min-width: 1024px) {
                .lg\\:ml-64 {
                    margin-left: 16rem;
                }
            }
        """),
        
        cls="min-h-screen bg-gray-50"
    )

# Routes
@rt("/")
def get(sess):
    """Main welcome/landing page"""
    # If user is logged in, redirect to dashboard
    if sess.get('logged_in'):
        return RedirectResponse("/dashboard", status_code=302)
    return Title('TalkBuddy - AI Conversation Practice'), Body(
        Div(
            Div(
                Div(
                    Div(cls="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mb-6 shadow-md mx-auto"),
                    H1("TalkBuddy", cls="text-4xl font-bold text-gray-900 mb-3 text-center"),
                    P("Open-Source AI Conversation Practice for Students", 
                      cls="text-lg text-gray-600 mb-10 max-w-sm text-center mx-auto"),
                    
                    # Features
                    Div(
                        Div(
                            Div(cls="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4 flex-shrink-0"),
                            Div(
                                H3("Interview Practice", cls="font-semibold text-gray-800"),
                                P("Academic, technical, and professional interviews", cls="text-sm text-gray-600")
                            ),
                            cls="flex items-start mb-6"
                        ),
                        Div(
                            Div(cls="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4 flex-shrink-0"),
                            Div(
                                H3("Language Learning", cls="font-semibold text-gray-800"),
                                P("Conversation practice in multiple languages", cls="text-sm text-gray-600")
                            ),
                            cls="flex items-start mb-6"
                        ),
                        Div(
                            Div(cls="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-4 flex-shrink-0"),
                            Div(
                                H3("Always Free & Private", cls="font-semibold text-gray-800"),
                                P("Open-source with no required API keys", cls="text-sm text-gray-600")
                            ),
                            cls="flex items-start mb-6"
                        ),
                        cls="space-y-6 text-left w-full max-w-xs mx-auto"
                    ),
                    cls="flex flex-col items-center text-center mt-12"
                ),
                
                # Action buttons
                Div(
                    A("Sign In", href="/auth/signin", 
                      cls="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors text-center block mb-3"),
                    A("Create Account", href="/auth/signup", 
                      cls="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center block mb-3"),
                    Div(
                        Span("Just exploring? ", cls="text-sm text-gray-600"),
                        A("Continue as Guest", href="/dashboard", 
                          cls="text-indigo-600 font-medium hover:underline text-sm"),
                        cls="text-center"
                    ),
                    cls="w-full max-w-xs space-y-3 mb-12 mx-auto"
                ),
                cls="flex flex-col items-center justify-between min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )
    )

@rt("/dashboard")
def dashboard(sess):
    """Main dashboard page"""
    # Check if user is logged in
    if not sess.get('logged_in'):
        return RedirectResponse("/auth/signin", status_code=302)
    # Get recent scenarios and sessions from database
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    # Get default scenarios
    cursor.execute('''
        SELECT id, name, description, category, discipline 
        FROM scenarios 
        WHERE is_default = TRUE OR is_public = TRUE 
        LIMIT 3
    ''')
    scenarios = cursor.fetchall()
    
    conn.close()
    
    content = Div(
        # Welcome card
        Div(
            Div(
                Div(
                    H3("Welcome back!", cls="font-semibold text-lg mb-1 text-white"),
                    P("Ready for some practice today?", cls="text-indigo-100 text-sm"),
                    cls="mb-4"
                ),
                Div(
                    A("Start New Session", href="/conversation/1",
                      cls="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 w-full sm:w-auto text-center"),
                    A("Browse Scenarios", href="/scenarios",
                      cls="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 w-full sm:w-auto text-center"),
                    cls="flex flex-col sm:flex-row gap-2"
                ),
                cls="p-5"
            ),
            cls="bg-gradient-to-r from-indigo-500 to-purple-500 text-white mb-6 rounded-xl"
        ),
        
        # Recent scenarios
        Div(
            Div(
                H3("Recent Scenarios", cls="font-semibold text-lg text-gray-800"),
                A("View All", href="/scenarios", cls="text-indigo-600 text-sm"),
                cls="flex justify-between items-center mb-3"
            ),
            
            # Scenario cards
            *[Div(
                Div(
                    Span(s[3].title(), cls="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mr-2"),
                    cls="mb-2"
                ),
                H4(s[1], cls="font-medium text-lg mb-1"),
                P(s[2], cls="text-gray-600 text-sm mb-3"),
                Div(
                    Span("Browser API", cls="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 mr-1"),
                    A("Practice", href=f"/conversation/{s[0]}", 
                      cls="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"),
                    cls="flex flex-wrap gap-2 justify-between items-center"
                ),
                cls="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-3"
            ) for s in scenarios],
            cls="mb-6"
        ),
        
        cls="p-3 sm:p-4 overflow-y-auto pb-24 lg:pb-4"
    )
    
    return app_layout(sess, content, active_tab="dashboard", page_title="Dashboard")

@rt("/scenarios")
def scenarios(sess, filter: str = "All"):
    """Scenario library page with filtering"""
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    # Apply filter
    if filter == "All":
        cursor.execute('''
            SELECT id, name, description, category, discipline, is_default
            FROM scenarios 
            WHERE is_default = TRUE OR is_public = TRUE
            ORDER BY is_default DESC, created_at DESC
        ''')
    else:
        cursor.execute('''
            SELECT id, name, description, category, discipline, is_default
            FROM scenarios 
            WHERE (is_default = TRUE OR is_public = TRUE) AND category = ?
            ORDER BY is_default DESC, created_at DESC
        ''', (filter.lower(),))
    
    scenarios = cursor.fetchall()
    conn.close()
    
    content = Div(
        # Filter buttons
        Div(
            Div(
                *[A(f, href=f"/scenarios?filter={f}",
                    cls=f"px-3 py-2 text-sm rounded-lg whitespace-nowrap flex-shrink-0 {'bg-indigo-600 text-white' if f == filter else 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}")
                  for f in ['All', 'Technical', 'Academic', 'Behavioral', 'Language']],
                cls="flex gap-2 overflow-x-auto py-1 scrollbar-hide"
            ),
            cls="mb-4 min-w-0"
        ),
        
        # Create new button
        Div(
            H3("Community Library", cls="font-semibold text-base sm:text-lg text-gray-800"),
            A("+ Create New", href="/scenarios/create", 
              cls="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-700"),
            cls="flex justify-between items-center mb-3"
        ),
        
        # Scenario cards
        *[Div(
            Div(
                Span(s[3].title(), cls="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800"),
                cls="mb-2"
            ),
            H4(s[1], cls="font-medium text-base sm:text-lg mb-1 line-clamp-2"),
            P(s[2], cls="text-gray-600 text-sm mb-3 line-clamp-2"),
            Div(
                Div(
                    Span("Browser API", cls="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-50 text-green-700"),
                    cls="flex-shrink-0"
                ),
                A("Practice", href=f"/conversation/{s[0]}", 
                  cls="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 w-full sm:w-auto text-center"),
                cls="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center"
            ),
            cls="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-3"
        ) for s in scenarios],
        
        cls="p-3 sm:p-4 overflow-y-auto pb-24 lg:pb-4"
    )
    
    return app_layout(sess, content, active_tab="scenarios", page_title="Scenarios")

@rt("/conversation/{scenario_id}")
def conversation(sess, scenario_id: int):
    """Conversation interface for a specific scenario"""
    # Check if user is logged in
    if not sess.get('logged_in'):
        return RedirectResponse("/auth/signin", status_code=302)
    # Get scenario details
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT name, description, persona_prompt FROM scenarios WHERE id = ?', (scenario_id,))
    scenario = cursor.fetchone()
    
    conn.close()
    
    if not scenario:
        return "Scenario not found", 404
    
    scenario_name, description, persona_prompt = scenario
    
    return Title(f'{scenario_name} - TalkBuddy'), Body(
        # Header
        Div(
            Div(
                Div(
                    A("←", href="/dashboard", cls="text-gray-700 hover:text-gray-900 mr-3"),
                    H1(scenario_name, cls="font-semibold text-lg"),
                    cls="flex items-center"
                ),
                Div("⚙️", cls="text-gray-700 cursor-pointer"),
                cls="flex justify-between items-center"
            ),
            cls="p-4 border-b border-gray-200 bg-white"
        ),
        
        # AI Interviewer info
        Div(
            Div(
                Div(cls="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mr-3"),
                Div(
                    H3("AI Interviewer", cls="font-medium text-gray-800"),
                    P("Ready to begin", cls="text-sm text-gray-600"),
                    cls="flex-1"
                ),
                Div(
                    Span("Browser API", cls="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 mr-1"),
                    Span("HF Model", cls="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-50 text-green-700"),
                    cls="flex gap-1"
                ),
                cls="flex items-center"
            ),
            cls="bg-indigo-50 p-3 mb-4 shadow-sm"
        ),
        
        # Conversation transcript
        Div(
            id="conversation-transcript",
            cls="flex-grow px-4 overflow-y-auto pb-32 space-y-4"
        ),
        
        # Interim transcript for real-time feedback
        Div(
            Span(id="interim-transcript", cls="text-gray-500 italic text-sm"),
            cls="px-4 py-2 bg-gray-50 border-t"
        ),
        
        # Push-to-talk interface (fixed at bottom)
        Div(
            # Session info
            Div(
                Div(
                    Span("🕐", cls="mr-2"),
                    Span("00:00", id="session-duration", cls="text-sm text-gray-700"),
                    cls="flex items-center"
                ),
                Div(
                    A("End Session", href="/dashboard", 
                      cls="text-red-600 text-sm font-medium hover:underline"),
                    cls="flex items-center"
                ),
                cls="w-full mb-3 flex items-center justify-between"
            ),
            
            # Push-to-talk button
            Div(
                Button(
                    "🎤",
                    id="mic-button",
                    cls="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-all duration-200 text-3xl hover:bg-indigo-700"
                ),
                Span("Push to Talk", id="state-label", cls="text-sm text-gray-500 mt-2"),
                cls="flex flex-col items-center"
            ),
            
            # Error display
            Div(
                id="error-message",
                cls="text-red-600 text-sm text-center mt-2 hidden"
            ),
            
            # Connection status
            Div(
                Span("Status: ", cls="text-xs text-gray-500"),
                Span("Connected", id="connection-status", cls="text-xs text-green-600"),
                cls="text-center mt-2"
            ),
            
            cls="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-200 flex flex-col items-center z-10 shadow-lg"
        ),
        
        # Include conversation JavaScript
        Script(src="/static/js/conversation.js"),
        
        # Custom CSS for conversation
        Style("""
            .message {
                display: flex;
                margin-bottom: 1rem;
            }
            
            .user-message {
                justify-content: flex-end;
            }
            
            .assistant-message {
                justify-content: flex-start;
            }
            
            .message-bubble {
                max-width: 80%;
                padding: 0.75rem 1rem;
                border-radius: 1rem;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            
            .user-bubble {
                background-color: #4f46e5;
                color: white;
                border-bottom-right-radius: 0.25rem;
            }
            
            .assistant-bubble {
                background-color: #f3f4f6;
                color: #1f2937;
                border-bottom-left-radius: 0.25rem;
            }
            
            #mic-button.listening {
                background-color: #ef4444;
            }
            
            #mic-button.thinking {
                background-color: #f59e0b;
            }
            
            #mic-button.speaking {
                background-color: #10b981;
            }
            
            .animate-pulse {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        """),
        
        cls="min-h-screen bg-gray-50 flex flex-col"
    )

@app.ws('/ws/conversation')
async def ws_conversation(msg: str, send):
    """WebSocket handler for conversation"""
    try:
        from services.conversation import conversation_service
        
        data = json.loads(msg)
        message_type = data.get('type')
        
        if message_type == 'start_session':
            scenario_id = data.get('scenario_id', 1)
            session = conversation_service.create_session(scenario_id)
            
            # Send initial AI message
            initial_message = session.messages[0] if session.messages else None
            if initial_message:
                await send(json.dumps({
                    'type': 'ai_message_start'
                }))
                
                # Simulate streaming the initial message
                words = initial_message.content.split()
                full_content = ""
                for word in words:
                    full_content += word + " "
                    await send(json.dumps({
                        'type': 'ai_message_chunk',
                        'content': word + " "
                    }))
                    await asyncio.sleep(0.1)  # Simulate typing delay
                
                await send(json.dumps({
                    'type': 'ai_message_complete',
                    'full_text': full_content.strip()
                }))
            
            # Send session info
            await send(json.dumps({
                'type': 'session_update',
                'data': session.get_session_info()
            }))
            
        elif message_type == 'user_message':
            session_id = data.get('session_id')
            content = data.get('content', '')
            
            # For now, use the first active session
            # In production, you'd track session_id properly
            if conversation_service.active_sessions:
                session = list(conversation_service.active_sessions.values())[0]
                
                await send(json.dumps({
                    'type': 'ai_message_start'
                }))
                
                full_response = ""
                async for chunk in session.process_user_message(content):
                    full_response += chunk
                    await send(json.dumps({
                        'type': 'ai_message_chunk',
                        'content': chunk
                    }))
                
                await send(json.dumps({
                    'type': 'ai_message_complete',
                    'full_text': full_response
                }))
                
                # Send updated session info
                await send(json.dumps({
                    'type': 'session_update',
                    'data': session.get_session_info()
                }))
            
        elif message_type == 'end_session':
            # End all active sessions (for simplicity)
            for session_id in list(conversation_service.active_sessions.keys()):
                conversation_service.end_session(session_id)
            
            await send(json.dumps({
                'type': 'session_ended'
            }))
        
    except Exception as e:
        await send(json.dumps({
            'type': 'error',
            'content': f'An error occurred: {str(e)}'
        }))



@rt("/auth/signin")
def signin_handler(sess, email: str = None, password: str = None):
    """Handle both GET and POST for signin"""
    print(f"DEBUG: signin_handler called with: email={email}, password={'***' if password else None}")
    
    # If no form data, show the signin form (GET request)
    if not email and not password:
        return Title('Sign In - TalkBuddy'), Body(
            Div(
                Div(
                    A("← Back", href="/", cls="text-indigo-600 hover:underline mb-4 inline-block"),
                    H1("Sign In", cls="text-3xl font-bold text-gray-900 mb-6"),
                    
                    Form(
                        Div(
                            Label("Email", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="email",
                                name="email",
                                placeholder="your.email@example.com",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="password",
                                placeholder="Enter your password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-6"
                        ),
                        Button(
                            "Sign In",
                            type="submit",
                            cls="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        ),
                        method="post"
                    ),
                    
                    Div(
                        P("Don't have an account? ", cls="text-sm text-gray-600 inline"),
                        A("Create one here", href="/auth/signup", cls="text-indigo-600 hover:underline text-sm"),
                        cls="text-center mt-4"
                    ),
                    
                    cls="w-full max-w-md mx-auto"
                ),
                cls="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )
    
    # Handle form submission (POST request)
    print(f"DEBUG: Processing signin form - email: {email}")
    import hashlib
    
    # Hash the password for comparison
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, display_name FROM users WHERE email = ? AND password_hash = ?', 
                   (email, password_hash))
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        print(f"DEBUG: Login successful for user: {email}")
        # Set session data
        sess['user_id'] = user[0]
        sess['user_email'] = email
        sess['user_name'] = user[1]
        sess['logged_in'] = True
        return RedirectResponse("/dashboard", status_code=302)
    else:
        print(f"DEBUG: Login failed for user: {email}")
        # Return to sign in page with error
        return Title('Sign In - TalkBuddy'), Body(
            Div(
                Div(
                    A("← Back", href="/", cls="text-indigo-600 hover:underline mb-4 inline-block"),
                    H1("Sign In", cls="text-3xl font-bold text-gray-900 mb-6"),
                    
                    Div(
                        P("Invalid email or password. Please try again.", 
                          cls="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg border border-red-200"),
                        cls="mb-4"
                    ),
                    
                    Form(
                        Div(
                            Label("Email", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="email",
                                name="email",
                                value=email,
                                placeholder="your.email@example.com",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="password",
                                placeholder="Enter your password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-6"
                        ),
                        Button(
                            "Sign In",
                            type="submit",
                            cls="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        ),
                        method="post"
                    ),
                    
                    Div(
                        P("Don't have an account? ", cls="text-sm text-gray-600 inline"),
                        A("Create one here", href="/auth/signup", cls="text-indigo-600 hover:underline text-sm"),
                        cls="text-center mt-4"
                    ),
                    
                    cls="w-full max-w-md mx-auto"
                ),
                cls="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )

@rt("/auth/signup")
def signup_handler(sess, display_name: str = None, email: str = None, password: str = None, confirm_password: str = None):
    """Handle both GET and POST for signup"""
    print(f"DEBUG: signup_handler called with: display_name={display_name}, email={email}")
    
    # If no form data, show the signup form (GET request)
    if not display_name and not email:
        return Title('Create Account - TalkBuddy'), Body(
            Div(
                Div(
                    A("← Back", href="/", cls="text-indigo-600 hover:underline mb-4 inline-block"),
                    H1("Create Account", cls="text-3xl font-bold text-gray-900 mb-6"),
                    
                    Form(
                        Div(
                            Label("Display Name", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="text",
                                name="display_name",
                                placeholder="Your name",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Email", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="email",
                                name="email",
                                placeholder="your.email@example.com",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="password",
                                placeholder="Create a password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Confirm Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="confirm_password",
                                placeholder="Confirm your password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-6"
                        ),
                        Button(
                            "Create Account",
                            type="submit",
                            cls="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        ),
                        method="post"
                    ),
                    
                    Div(
                        P("Already have an account? ", cls="text-sm text-gray-600 inline"),
                        A("Sign in here", href="/auth/signin", cls="text-indigo-600 hover:underline text-sm"),
                        cls="text-center mt-4"
                    ),
                    
                    cls="w-full max-w-md mx-auto"
                ),
                cls="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )
    
    # Handle form submission (POST request)
    print(f"DEBUG: Processing signup form - display_name: {display_name}, email: {email}")
    import hashlib
    
    # Validate passwords match
    if password != confirm_password:
        print("DEBUG: Passwords don't match")
        return Title('Create Account - TalkBuddy'), Body(
            Div(
                Div(
                    A("← Back", href="/", cls="text-indigo-600 hover:underline mb-4 inline-block"),
                    H1("Create Account", cls="text-3xl font-bold text-gray-900 mb-6"),
                    
                    Div(
                        P("Passwords do not match. Please try again.", 
                          cls="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg border border-red-200"),
                        cls="mb-4"
                    ),
                    
                    # Show the form again with error
                    Form(
                        Div(
                            Label("Display Name", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="text",
                                name="display_name",
                                value=display_name,
                                placeholder="Your name",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Email", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="email",
                                name="email",
                                value=email,
                                placeholder="your.email@example.com",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="password",
                                placeholder="Create a password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Confirm Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="confirm_password",
                                placeholder="Confirm your password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-6"
                        ),
                        Button(
                            "Create Account",
                            type="submit",
                            cls="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        ),
                        action="/auth/signup",
                        method="post"
                    ),
                    
                    cls="w-full max-w-md mx-auto"
                ),
                cls="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )
    
    # Hash the password
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    try:
        print(f"DEBUG: Attempting to insert user: {email}")
        cursor.execute('''
            INSERT INTO users (email, password_hash, display_name)
            VALUES (?, ?, ?)
        ''', (email, password_hash, display_name))
        
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        print(f"DEBUG: User created successfully with ID: {user_id}")
        
        # Set session data for auto-login
        sess['user_id'] = user_id
        sess['user_email'] = email
        sess['user_name'] = display_name
        sess['logged_in'] = True
        # Redirect to dashboard on successful account creation
        return RedirectResponse("/dashboard", status_code=302)
        
    except sqlite3.IntegrityError as e:
        # Email already exists
        conn.close()
        print(f"DEBUG: IntegrityError: {e}")
        
        return Title('Create Account - TalkBuddy'), Body(
            Div(
                Div(
                    A("← Back", href="/", cls="text-indigo-600 hover:underline mb-4 inline-block"),
                    H1("Create Account", cls="text-3xl font-bold text-gray-900 mb-6"),
                    
                    Div(
                        P("An account with this email already exists. Please use a different email or sign in.", 
                          cls="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg border border-red-200"),
                        cls="mb-4"
                    ),
                    
                    # Show the form again with error
                    Form(
                        Div(
                            Label("Display Name", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="text",
                                name="display_name",
                                value=display_name,
                                placeholder="Your name",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Email", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="email",
                                name="email",
                                value=email,
                                placeholder="your.email@example.com",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="password",
                                placeholder="Create a password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-4"
                        ),
                        Div(
                            Label("Confirm Password", cls="block text-sm font-medium text-gray-700 mb-1"),
                            Input(
                                type="password",
                                name="confirm_password",
                                placeholder="Confirm your password",
                                cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                                required=True
                            ),
                            cls="mb-6"
                        ),
                        Button(
                            "Create Account",
                            type="submit",
                            cls="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        ),
                        action="/auth/signup",
                        method="post"
                    ),
                    
                    cls="w-full max-w-md mx-auto"
                ),
                cls="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )
    except Exception as e:
        conn.close()
        print(f"DEBUG: Unexpected error: {e}")
        
        return Title('Create Account - TalkBuddy'), Body(
            Div(
                Div(
                    A("← Back", href="/", cls="text-indigo-600 hover:underline mb-4 inline-block"),
                    H1("Create Account", cls="text-3xl font-bold text-gray-900 mb-6"),
                    
                    Div(
                        P(f"An error occurred: {str(e)}. Please try again.", 
                          cls="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg border border-red-200"),
                        cls="mb-4"
                    ),
                    
                    A("Try Again", href="/auth/signup", cls="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"),
                    
                    cls="w-full max-w-md mx-auto"
                ),
                cls="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-indigo-50 to-white"
            )
        )

@rt("/auth/logout")
def logout(sess):
    """Handle logout"""
    # Clear session data
    sess.clear()
    # In a real app, you'd clear the session here
    return RedirectResponse("/", status_code=302)

@rt("/settings")
def settings(sess):
    """Settings page for provider configuration"""
    # Check if user is logged in
    if not sess.get('logged_in'):
        return RedirectResponse("/auth/signin", status_code=302)
    content = Div(
        # Provider Configuration
        Div(
            H2("AI Provider Configuration", cls="text-xl font-semibold mb-4"),
            P("Configure which AI services to use for speech recognition, language processing, and text-to-speech.", cls="text-gray-600 mb-6"),
            
            # Speech-to-Text
            Div(
                H3("Speech-to-Text (STT)", cls="font-medium mb-3"),
                Div(
                    Label(
                        Input(type="radio", name="stt_provider", value="browser", checked=True, cls="mr-2"),
                        "Browser Web Speech API (Free)",
                        cls="flex items-center p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
                    ),
                    Label(
                        Input(type="radio", name="stt_provider", value="openai", cls="mr-2"),
                        "OpenAI Whisper (Requires API key)",
                        cls="flex items-center p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
                    ),
                    cls="space-y-2"
                ),
                cls="mb-6"
            ),
            
            # Language Model
            Div(
                H3("Language Model (LLM)", cls="font-medium mb-3"),
                Div(
                    Label(
                        Input(type="radio", name="llm_provider", value="huggingface", checked=True, cls="mr-2"),
                        "Hugging Face (Free)",
                        cls="flex items-center p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
                    ),
                    Label(
                        Input(type="radio", name="llm_provider", value="openai", cls="mr-2"),
                        "OpenAI GPT-4 (Requires API key)",
                        cls="flex items-center p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
                    ),
                    Label(
                        Input(type="radio", name="llm_provider", value="ollama", cls="mr-2"),
                        "Local Ollama (Self-hosted)",
                        cls="flex items-center p-3 border rounded-lg mb-2 cursor-pointer hover:bg-gray-50"
                    ),
                    cls="space-y-2"
                ),
                cls="mb-6"
            ),
            
            # API Keys Section
            Div(
                H3("API Keys", cls="font-medium mb-3"),
                P("Add your API keys to unlock premium providers:", cls="text-gray-600 mb-4"),
                Div(
                    Div(
                        Label("OpenAI API Key", cls="block text-sm font-medium text-gray-700 mb-1"),
                        Input(
                            type="password",
                            name="openai_key",
                            placeholder="sk-...",
                            cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                        ),
                        cls="mb-4"
                    ),
                    Button("Save Settings", cls="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"),
                    cls="max-w-md"
                ),
                cls="mb-8"
            ),
            
            cls="bg-white rounded-xl shadow-sm p-6 mb-6"
        ),
        
        # Account Settings
        Div(
            H2("Account", cls="text-xl font-semibold mb-4"),
            Div(
                A("Logout", href="/auth/logout", cls="text-red-600 hover:underline font-medium"),
                cls="mb-4"
            ),
            cls="bg-white rounded-xl shadow-sm p-6"
        ),
        
        cls="p-4 max-w-4xl mx-auto pb-20 lg:pb-4"
    )
    
    return app_layout(sess, content, active_tab="settings", page_title="Settings")

@rt("/sessions")
def sessions(sess):
    """Sessions history page"""
    # Get user sessions from database
    conn = sqlite3.connect('talkbuddy.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT cs.id, cs.session_name, s.name as scenario_name, cs.duration, 
               cs.turn_count, cs.status, cs.created_at, cs.completed_at
        FROM conversation_sessions cs
        JOIN scenarios s ON cs.scenario_id = s.id
        ORDER BY cs.created_at DESC
        LIMIT 10
    ''')
    user_sessions = cursor.fetchall()
    
    conn.close()
    
    content = Div(
        # Page header
        Div(
            H2("Session History", cls="text-2xl font-bold text-gray-900 mb-2"),
            P("Review your past conversation practice sessions", cls="text-gray-600 mb-6"),
            cls="mb-6"
        ),
        
        # Sessions list
        Div(
            *[Div(
                Div(
                    Div(
                        H3(session[2], cls="font-medium text-lg text-gray-900"),  # scenario_name
                        P(f"Session #{session[0]}", cls="text-sm text-gray-500"),
                        cls="flex-1"
                    ),
                    Div(
                        Span(f"{session[4]} turns" if session[4] else "0 turns", cls="text-sm text-gray-600 mr-4"),
                        Span(f"{session[3]//60}min" if session[3] else "0min", cls="text-sm text-gray-600"),
                        cls="flex items-center"
                    ),
                    cls="flex justify-between items-start mb-2"
                ),
                P(f"Started: {session[6][:10] if session[6] else 'Unknown'}", cls="text-xs text-gray-500 mb-3"),
                Div(
                    A("View Transcript", href=f"/sessions/{session[0]}/transcript", 
                      cls="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 mr-2"),
                    A("Practice Again", href=f"/conversation/{session[0]}", 
                      cls="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"),
                    cls="flex gap-2"
                ),
                cls="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-3"
            ) for session in user_sessions] if user_sessions else [
                Div(
                    Div(
                        H3("No sessions yet", cls="text-xl font-semibold text-gray-800 mb-2"),
                        P("Start practicing to see your conversation history here.", cls="text-gray-600 mb-4"),
                        A("Start Your First Session", href="/scenarios", 
                          cls="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"),
                        cls="text-center"
                    ),
                    cls="bg-white rounded-xl shadow-sm p-8"
                )
            ]
        ),
        
        cls="p-3 sm:p-4 overflow-y-auto pb-24 lg:pb-4"
    )
    
    return app_layout(sess, content, active_tab="sessions", page_title="Sessions")

@rt("/about")
def about(sess):
    """About page"""
    # Check if user is logged in
    if not sess.get('logged_in'):
        return RedirectResponse("/auth/signin", status_code=302)
    content = Div(
        # Hero section
        Div(
            H1("About TalkBuddy", cls="text-3xl font-bold text-gray-900 mb-4"),
            P("Open-source AI conversation practice platform for students and educators.", cls="text-xl text-gray-600 mb-8"),
            cls="text-center mb-12"
        ),
        
        # Features
        Div(
            H2("Features", cls="text-2xl font-semibold text-gray-900 mb-6"),
            Div(
                Div(
                    H3("🎯 Interview Practice", cls="text-lg font-medium text-gray-900 mb-2"),
                    P("Practice technical, academic, and behavioral interviews with AI personas across various scenarios.", cls="text-gray-600"),
                    cls="bg-white rounded-lg p-6 shadow-sm"
                ),
                Div(
                    H3("🗣️ Language Learning", cls="text-lg font-medium text-gray-900 mb-2"),
                    P("Improve your conversation skills and language fluency through practice sessions.", cls="text-gray-600"),
                    cls="bg-white rounded-lg p-6 shadow-sm"
                ),
                Div(
                    H3("🔒 Privacy First", cls="text-lg font-medium text-gray-900 mb-2"),
                    P("All conversations are processed locally or with privacy-focused providers. Your data stays private.", cls="text-gray-600"),
                    cls="bg-white rounded-lg p-6 shadow-sm"
                ),
                Div(
                    H3("💰 Always Free", cls="text-lg font-medium text-gray-900 mb-2"),
                    P("No required API keys or subscription fees. Optional premium providers for enhanced features.", cls="text-gray-600"),
                    cls="bg-white rounded-lg p-6 shadow-sm"
                ),
                cls="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            ),
            cls="mb-12"
        ),
        
        # Technology
        Div(
            H2("Technology", cls="text-2xl font-semibold text-gray-900 mb-6"),
            Div(
                P("Built with modern web technologies:", cls="text-gray-600 mb-4"),
                Ul(
                    Li("FastHTML for the web framework", cls="text-gray-600"),
                    Li("Browser Web Speech API for speech recognition", cls="text-gray-600"),
                    Li("Hugging Face Inference API for language models", cls="text-gray-600"),
                    Li("Browser SpeechSynthesis for text-to-speech", cls="text-gray-600"),
                    Li("SQLite for local data storage", cls="text-gray-600"),
                    cls="space-y-2 ml-6"
                ),
                cls="bg-white rounded-lg p-6 shadow-sm"
            ),
            cls="mb-12"
        ),
        
        # Open Source
        Div(
            H2("Open Source", cls="text-2xl font-semibold text-gray-900 mb-6"),
            Div(
                P("TalkBuddy is open source software. Contributions, feedback, and feature requests are welcome!", cls="text-gray-600 mb-4"),
                A("View on GitHub", href="https://github.com/talkbuddy/talkbuddy", 
                  cls="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800"),
                cls="bg-white rounded-lg p-6 shadow-sm"
            ),
            cls="mb-12"
        ),
        
        cls="p-4 max-w-4xl mx-auto pb-20 lg:pb-4"
    )
    
    return app_layout(sess, content, active_tab="about", page_title="About")

@rt("/scenarios/create")
def create_scenario(sess):
    """Create new scenario page"""
    # Check if user is logged in
    if not sess.get('logged_in'):
        return RedirectResponse("/auth/signin", status_code=302)
    content = Div(
        H1("Create New Scenario", cls="text-2xl font-bold text-gray-900 mb-6"),
        
        Form(
            Div(
                Label("Scenario Name", cls="block text-sm font-medium text-gray-700 mb-1"),
                Input(
                    type="text",
                    name="scenario_name",
                    placeholder="E.g., Data Science Technical Interview",
                    cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                    required=True
                ),
                cls="mb-4"
            ),
            
            Div(
                Label("Description", cls="block text-sm font-medium text-gray-700 mb-1"),
                Textarea(
                    name="description",
                    placeholder="Describe the purpose and content of this scenario...",
                    cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20",
                    required=True
                ),
                cls="mb-4"
            ),
            
            Div(
                Div(
                    Label("Category", cls="block text-sm font-medium text-gray-700 mb-1"),
                    Select(
                        Option("Technical", value="technical"),
                        Option("Academic", value="academic"),
                        Option("Behavioral", value="behavioral"),
                        Option("Language", value="language"),
                        Option("Custom", value="custom"),
                        name="category",
                        cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    ),
                    cls="flex-1"
                ),
                Div(
                    Label("Difficulty", cls="block text-sm font-medium text-gray-700 mb-1"),
                    Select(
                        Option("Beginner", value="beginner"),
                        Option("Intermediate", value="intermediate"),
                        Option("Advanced", value="advanced"),
                        Option("Expert", value="expert"),
                        name="difficulty",
                        cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    ),
                    cls="flex-1"
                ),
                cls="grid grid-cols-2 gap-3 mb-4"
            ),
            
            Div(
                Label("Interviewer Persona", cls="block text-sm font-medium text-gray-700 mb-1"),
                Textarea(
                    name="persona_prompt",
                    placeholder="Describe the AI interviewer's role, personality, and style...",
                    cls="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20",
                    required=True
                ),
                cls="mb-4"
            ),
            
            Div(
                A("Cancel", href="/scenarios", cls="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 mr-3"),
                Button("Create Scenario", type="submit", cls="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"),
                cls="flex gap-3"
            ),
            
            method="post",
            action="/scenarios/create",
            cls="bg-white rounded-xl shadow-sm p-6"
        ),
        
        cls="p-4 max-w-4xl mx-auto pb-20 lg:pb-4"
    )
    
    return app_layout(sess, content, active_tab="scenarios", page_title="Create Scenario")

# Auto-start conversation when page loads
@rt("/conversation/new")
def new_conversation():
    """Start a new conversation with default scenario"""
    return conversation(1)  # Use first scenario

if __name__ == "__main__":
    serve()