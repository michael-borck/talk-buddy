# First Setup

Welcome to Talk Buddy! This guide will help you configure the app for the best experience.

## Initial Launch

When you first open Talk Buddy, you'll see:

1. **Home Dashboard** with welcome message
2. **Sidebar navigation** on the left
3. **Status footer** at the bottom (showing service connection status)

## Essential Configuration

### Step 1: Review Default Settings

1. Click **Settings** in the sidebar
2. Review the default configuration:
   - **Speech Services**: Pre-configured for online services
   - **AI Model**: Set to work with Ollama
   - **Voice**: Default male voice selected

### Step 2: Configure External Services

Talk Buddy works best with these external services:

#### Option A: Use Default Online Services (Easiest)
The app comes pre-configured with working online services:
- **Speech-to-Text**: Speaches service
- **Text-to-Speech**: Speaches service  
- **AI Chat**: Ollama service

**Pros**: No setup required, works immediately
**Cons**: Requires internet connection, may have usage limits

#### Option B: Set Up Local Services (Advanced)
For better privacy and offline use:

1. **Install Ollama** (for AI conversations):
   - Visit [ollama.ai](https://ollama.ai)
   - Download and install for your system
   - Run: `ollama pull llama2` (or your preferred model)

2. **Install Speaches** (for speech services):
   - Visit [Speaches documentation](https://github.com/tts-ai/speaches)
   - Follow installation instructions
   - Start the service on `http://localhost:8000`

3. **Update Talk Buddy Settings**:
   - Go to Settings in Talk Buddy
   - Change service URLs to your local installations
   - Test connections using the "Test" buttons

### Step 3: Test Your Setup

1. **Check Status Footer**: Look at the bottom of the app
   - Green dots (●) indicate working services
   - Red dots (●) indicate connection issues
   - Gray dots (○) indicate unknown status

2. **Test Speech Services** (if available):
   - Go to Settings
   - Click "Test STT" to test speech recognition
   - Click "Test TTS" to test voice synthesis

3. **Test AI Service**:
   - Go to Scenarios in the sidebar
   - Click on any default scenario
   - Try starting a conversation

## Explore Default Content

Talk Buddy comes with sample scenarios to get you started:

### Default Scenarios Include:
- **Job Interview - Marketing Manager**: Practice professional interviews
- **Customer Service**: Handle customer interactions
- **Business Presentations**: Practice explaining technical concepts
- **Networking Events**: Work on professional networking skills

### Try Your First Scenario:
1. Click **Scenarios** in the sidebar
2. Choose "Job Interview - Marketing Manager" 
3. Click the **Start** button
4. Follow the [Your First Scenario](../workflows/your-first-scenario.md) guide

## Understand the Interface

### Sidebar Navigation
- **Home**: Dashboard with recent activity and quick actions
- **Scenarios**: Browse and manage individual practice scenarios
- **Practice Packs**: Organized collections of related scenarios
- **Session History**: Review your past practice sessions
- **Archive**: Manage deleted/archived content
- **Settings**: Configure services and preferences
- **About**: App information and help

### Status Footer
The footer shows connection status for:
- **STT**: Speech-to-Text service status
- **TTS**: Text-to-Speech service status  
- **Chat**: AI conversation service status

### Quick Actions
- Click the **Talk Buddy** title to access the About page
- Click the **version number** to see app information
- Use the **collapse button** (☰) to minimize the sidebar

## Customize Your Experience

### Voice Preferences
1. Go to **Settings**
2. Under **Voice Settings**:
   - Choose Male or Female voice
   - Adjust speech speed if available
   - Test different voice models

### Service Configuration
1. In **Settings**, configure:
   - **Speech Service URLs**: Change if using local services
   - **AI Model Settings**: Select your preferred conversation model
   - **API Keys**: Add if using paid services

## Data and Privacy

### Local Data Storage
Talk Buddy stores all your data locally:
- **Scenarios**: Custom scenarios you create
- **Sessions**: Practice session transcripts and history
- **Settings**: Your preferences and configurations

### Data Location
Your data is stored in:
- **Windows**: `%APPDATA%/TalkBuddy/`
- **macOS**: `~/Library/Application Support/TalkBuddy/`
- **Linux**: `~/.config/TalkBuddy/`

### Privacy Notes
- No data is sent to external services except during active conversations
- Speech processing happens via the configured services
- You control which services to use (local vs. online)

## Troubleshooting Setup

### Services Not Connecting
If you see red dots in the status footer:

1. **Check Internet Connection**: For online services
2. **Verify Service URLs**: Go to Settings and check URLs are correct
3. **Test Individual Services**: Use the "Test" buttons in Settings
4. **Check Firewall**: Ensure Talk Buddy can access the internet

### No Audio Input/Output
1. **Check Microphone Permissions**: Your system may need to grant microphone access
2. **Test System Audio**: Ensure your microphone and speakers work in other apps
3. **Restart Talk Buddy**: Sometimes audio permissions require an app restart

### Performance Issues
1. **Close Other Apps**: Free up system resources
2. **Check System Requirements**: Ensure your computer meets minimum specs
3. **Use Local Services**: Local AI models may perform better than online services

## Next Steps

Now that Talk Buddy is configured:

1. **[Try Your First Scenario](../workflows/your-first-scenario.md)** - Take your first practice session
2. **[Learn the Interface](../interface-guide/home-dashboard.md)** - Explore all the features
3. **[Create Your Own Scenario](../workflows/creating-scenarios.md)** - Design custom practice content

### For Specific Use Cases:
- **Students**: See [Student Guide](../user-guides/for-students.md)
- **Teachers**: See [Teacher Guide](../user-guides/for-teachers.md)
- **Self-Learners**: See [Self-Learner Guide](../user-guides/for-self-learners.md)

---

**Ready to practice? Try [Your First Scenario](../workflows/your-first-scenario.md) next! →**