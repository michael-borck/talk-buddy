# Frequently Asked Questions

Get quick answers to common ChatterBox questions.

## Getting Started

### Q: What is ChatterBox?
**A:** ChatterBox is an AI-powered conversation practice application that helps you improve your speaking skills through realistic dialogue scenarios. It's perfect for interview preparation, language learning, professional communication development, and building confidence in various conversation contexts.

### Q: Do I need an internet connection to use ChatterBox?
**A:** ChatterBox can work both online and offline:
- **Online mode**: Full functionality with AI conversations and speech processing
- **Offline mode**: Limited functionality - you can view scenarios and transcripts, but conversation practice requires internet for AI services

### Q: What are the system requirements?
**A:** 
- **OS**: Windows 10+, macOS 10.14+, or Ubuntu 18.04+ (Linux)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 500MB free space minimum
- **Network**: Internet connection for AI services
- **Audio**: Working microphone and speakers/headphones

### Q: Is ChatterBox free to use?
**A:** Yes! ChatterBox is open source software released under the MIT license. It's completely free to download, use, and modify.

## Using ChatterBox

### Q: How do I start my first conversation?
**A:** 
1. Open ChatterBox and click "Scenarios" in the sidebar
2. Choose a beginner-friendly scenario like "Customer Service - Product Return"
3. Click the scenario to start a session
4. Follow the [Your First Scenario guide](../workflows/your-first-scenario.md) for detailed steps

### Q: Why isn't my microphone working?
**A:** Check these common issues:
- **Permissions**: Ensure ChatterBox has microphone access in system settings
- **Hardware**: Test your microphone in other applications
- **Connection**: Verify speech services are connected (check status footer)
- **Settings**: Go to Settings and test STT (Speech-to-Text) service

### Q: The AI doesn't respond to my speech. What's wrong?
**A:** This usually indicates a service connection issue:
1. Check the status footer - AI service should show green dot
2. Verify internet connection
3. Test AI service in Settings page
4. See [Connection Issues guide](../troubleshooting/connection-issues.md) for detailed troubleshooting

### Q: Can I practice without speaking out loud?
**A:** Currently, ChatterBox is designed for voice-based conversation practice. While you can view scenarios and read transcripts, the core learning experience involves speaking with the AI. Future versions may include text-only modes.

## Content and Scenarios

### Q: How do I get more scenarios?
**A:** Several ways to expand your content:
- **Import from teachers**: If you're a student, your instructor can provide practice packs
- **Create your own**: Use the scenario creation tools to design custom practice
- **Community sharing**: Import scenarios shared by other users
- **Default content**: ChatterBox includes built-in scenarios to start with

### Q: Can I edit the default scenarios?
**A:** You can't edit the built-in default scenarios directly, but you can:
- Create new scenarios based on defaults
- Copy and modify scenario elements
- Create your own versions with different difficulty levels
- Archive default scenarios you don't use

### Q: What's the difference between scenarios and practice packs?
**A:** 
- **Scenarios**: Individual conversation practice sessions (like "Job Interview")
- **Practice Packs**: Collections of related scenarios organized for progressive learning (like "Interview Skills Bundle")

### Q: How do I share my scenarios with others?
**A:** 
1. Go to the Scenarios or Practice Packs page
2. Find the content you want to share
3. Click "Export" to save as a JSON file
4. Share the file via email, file sharing, or learning management systems
5. Recipients can import using the "Import" feature

## Technical Issues

### Q: ChatterBox won't install on my computer. What should I do?
**A:** Try these solutions:
- **Windows**: Run installer as Administrator, disable antivirus temporarily
- **macOS**: Check Security & Privacy settings, allow app from unidentified developer
- **Linux**: Ensure AppImage is executable (`chmod +x ChatterBox.AppImage`)
- See [Installation Guide](../getting-started/installation.md) for detailed instructions

### Q: The app is running slowly. How can I improve performance?
**A:** 
- **Close other applications** to free up RAM
- **Check internet connection** for online AI services
- **Use local services** instead of online ones if possible
- **Restart ChatterBox** to clear any memory issues
- See [Performance Tips](../troubleshooting/performance-tips.md) for more solutions

### Q: I'm getting connection errors. How do I fix them?
**A:** Follow this troubleshooting sequence:
1. Check internet connection in a web browser
2. Look at status footer indicators (red = problem, green = working)
3. Test services individually in Settings page
4. Check firewall and antivirus settings
5. Follow the complete [Connection Issues guide](../troubleshooting/connection-issues.md)

### Q: Can I use ChatterBox on a corporate/school network?
**A:** Yes, but you may need to:
- **Contact IT department** for firewall exceptions
- **Use local services** instead of online ones
- **Configure proxy settings** if required
- **Use mobile hotspot** as a temporary workaround

## Educational Use

### Q: I'm a teacher. How can I use ChatterBox in my classroom?
**A:** ChatterBox is excellent for education:
- **Create curriculum-specific scenarios** for your subject area
- **Build progressive practice packs** for skill development
- **Export and share content** with students easily
- **Guide practice sessions** and review transcripts for assessment
- See the [Teacher Guide](../user-guides/for-teachers.md) for comprehensive instructions

### Q: I'm a student. How do I import content from my teacher?
**A:** 
1. Save the JSON file your teacher provides
2. Open ChatterBox and go to Practice Packs (or Scenarios)
3. Click "Import" and select the file
4. The content will appear in your app
5. See [Student Guide](../user-guides/for-students.md) for detailed steps

### Q: Can I track my progress over time?
**A:** Yes! ChatterBox provides several ways to monitor improvement:
- **Session History**: Review all your practice conversations
- **Transcript Analysis**: Compare early vs. recent sessions
- **Practice Frequency**: Track how often you practice
- **Skill Development**: Notice improvements in fluency and confidence

### Q: How often should I practice?
**A:** For best results:
- **Daily practice**: 15-20 minutes is more effective than longer weekly sessions
- **Consistency**: Regular practice builds habits and confidence
- **Variety**: Try different scenarios and difficulty levels
- **Progressive challenge**: Start easy, gradually increase difficulty

## Privacy and Data

### Q: What data does ChatterBox collect?
**A:** ChatterBox prioritizes privacy:
- **Local storage**: All your scenarios, sessions, and settings are stored locally
- **No tracking**: No analytics or usage data sent to external servers
- **Service interaction only**: Data is only sent to AI/speech services during active conversations
- **User control**: You choose which services to use (local vs. online)

### Q: Where is my data stored?
**A:** Your ChatterBox data is stored locally on your computer:
- **Windows**: `%APPDATA%/ChatterBox/`
- **macOS**: `~/Library/Application Support/ChatterBox/`
- **Linux**: `~/.config/ChatterBox/`

### Q: Can I backup my data?
**A:** Yes! You can backup your content by:
- **Exporting scenarios**: Save individual scenarios as JSON files
- **Exporting practice packs**: Save complete practice packs
- **File system backup**: Copy the entire ChatterBox data folder
- **Import on new device**: Use exported files to restore content

## Advanced Usage

### Q: Can I use different AI models?
**A:** Yes! ChatterBox supports various AI services:
- **Local models**: Ollama with different language models
- **Online services**: Various AI providers (check Settings)
- **Custom endpoints**: Configure your own AI service URLs
- See [AI Model Integration guide](../services/ai-model-integration.md)

### Q: How do I set up local services for privacy?
**A:** For maximum privacy, use local services:
1. **Install Ollama** for AI conversations
2. **Set up Speaches** for speech processing
3. **Configure ChatterBox** to use localhost URLs
4. **Test connections** to ensure everything works
5. Follow [Service Setup guides](../services/) for detailed instructions

### Q: Can I contribute to ChatterBox development?
**A:** Absolutely! ChatterBox is open source:
- **Report bugs**: Use GitHub Issues for problems
- **Suggest features**: Share ideas for improvements
- **Contribute code**: Submit pull requests for enhancements
- **Create content**: Share well-designed scenarios with the community
- See [Contributing Guide](../technical/contributing.md) for details

## Getting Help

### Q: I can't find the answer to my question. Where can I get help?
**A:** Try these resources in order:
1. **Search this documentation** using your browser's find function
2. **Check troubleshooting guides** for technical issues
3. **Visit GitHub Issues** to see if others have asked the same question
4. **Create a new issue** on GitHub with detailed information about your problem

### Q: How do I report a bug?
**A:** To report bugs effectively:
1. **Check existing issues** on GitHub first
2. **Gather information**: OS version, ChatterBox version, error messages
3. **Describe steps to reproduce** the problem
4. **Include screenshots** if helpful
5. **Submit via GitHub Issues** with all relevant details

### Q: Is there a community forum or chat?
**A:** Currently, the main community hub is:
- **GitHub Discussions**: For general questions and sharing
- **GitHub Issues**: For bugs and feature requests
- **Documentation**: This comprehensive guide

---

## Quick Troubleshooting

### Most Common Issues and Quick Fixes

**Problem**: Microphone not working
**Quick Fix**: Check system microphone permissions for ChatterBox

**Problem**: AI not responding
**Quick Fix**: Check internet connection and AI service status (footer)

**Problem**: No sound from AI
**Quick Fix**: Check system volume and speaker settings

**Problem**: Import not working
**Quick Fix**: Ensure file is a .json export from ChatterBox

**Problem**: App won't start
**Quick Fix**: Restart computer, run as administrator (Windows)

---

**Still need help? Check out our comprehensive [Troubleshooting Section](../troubleshooting/) or visit the [GitHub Repository](https://github.com/michael-borck/chatter-box) for community support! 🤝**