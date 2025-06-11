# Common Errors

Quick solutions to the most frequently encountered ChatterBox errors and issues.

## Installation and Startup Errors

### "ChatterBox failed to start" or "Application Error"

#### Windows
**Symptoms**: App won't launch, error dialog on startup
**Common Causes**: Insufficient permissions, corrupted installation, missing dependencies

**Solutions**:
1. **Run as Administrator**: Right-click ChatterBox and select "Run as administrator"
2. **Reinstall application**: Uninstall and download fresh installer
3. **Check Windows version**: Ensure Windows 10 or later
4. **Install Visual C++ Redistributables**: Download from Microsoft website
5. **Disable antivirus temporarily**: Test if security software is blocking

**Registry Issues (Advanced)**:
```cmd
# Clear ChatterBox registry entries (run as admin)
reg delete "HKCU\Software\ChatterBox" /f
reg delete "HKLM\Software\ChatterBox" /f
```

#### macOS
**Symptoms**: "ChatterBox can't be opened" or "Damaged application" error
**Common Causes**: Security restrictions, incomplete download, permission issues

**Solutions**:
1. **Security bypass**: Right-click app → Open → Open anyway
2. **System Preferences**: Security & Privacy → Allow ChatterBox
3. **Clear quarantine**: `xattr -cr /Applications/ChatterBox.app`
4. **Re-download**: Delete app and download fresh copy
5. **Check macOS version**: Ensure macOS 10.14 or later

**Terminal Commands**:
```bash
# Remove quarantine attribute
sudo xattr -rd com.apple.quarantine /Applications/ChatterBox.app

# Fix permissions
sudo chmod -R 755 /Applications/ChatterBox.app
```

#### Linux
**Symptoms**: AppImage won't execute, permission denied errors
**Common Causes**: File permissions, missing dependencies

**Solutions**:
1. **Make executable**: `chmod +x ChatterBox*.AppImage`
2. **Install dependencies**: 
   ```bash
   # Ubuntu/Debian
   sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0
   
   # Fedora/CentOS
   sudo dnf install gtk3 libnotify nss libXScrnSaver libXtst xdg-utils at-spi2-atk
   ```
3. **Try different location**: Move AppImage to home directory
4. **Check FUSE**: `sudo apt install fuse` (Ubuntu/Debian)

### "Database initialization failed"

**Symptoms**: ChatterBox starts but shows database errors, scenarios won't load
**Common Causes**: Corrupted database, permission issues, insufficient disk space

**Solutions**:
1. **Clear data directory**: 
   - **Windows**: `%APPDATA%/ChatterBox/`
   - **macOS**: `~/Library/Application Support/ChatterBox/`
   - **Linux**: `~/.config/ChatterBox/`
2. **Check disk space**: Ensure at least 500MB free
3. **Run with elevated permissions**: Administrator/sudo access
4. **Backup and reset**: Export scenarios before clearing data

**Manual Database Reset**:
```bash
# Navigate to ChatterBox data directory
cd ~/.config/ChatterBox  # Linux
cd ~/Library/Application\ Support/ChatterBox  # macOS

# Backup existing data
cp chatterbox.db chatterbox.db.backup

# Remove corrupted database
rm chatterbox.db

# Restart ChatterBox to recreate database
```

## Service Connection Errors

### "STT Service Unavailable" or "Speech Recognition Failed"

**Symptoms**: Red STT indicator, microphone not working, no speech recognition
**Quick Diagnosis**: Check microphone permissions and service connectivity

**Solutions by Priority**:

1. **Check Microphone Permissions**:
   - **Windows**: Settings → Privacy → Microphone → Allow ChatterBox
   - **macOS**: System Preferences → Security & Privacy → Microphone → ✓ ChatterBox
   - **Linux**: Check PulseAudio/ALSA permissions

2. **Test Hardware**:
   - Use system voice recorder to verify microphone works
   - Check microphone volume in system settings
   - Try different microphone if available

3. **Verify Service Configuration**:
   - Go to ChatterBox Settings
   - Check STT service URL is correct
   - Click "Test STT" to verify connection
   - Try switching between local and online services

4. **Network/Firewall Issues**:
   - Check internet connection for online services
   - Verify firewall allows ChatterBox network access
   - Try disabling VPN temporarily

### "AI Service Connection Failed" or "Chat Service Unavailable"

**Symptoms**: Red chat indicator, AI doesn't respond, conversation timeouts
**Quick Diagnosis**: Check AI service status and configuration

**Solutions**:

1. **Local AI (Ollama) Issues**:
   ```bash
   # Check if Ollama is running
   ollama list
   
   # Restart Ollama service
   ollama serve
   
   # Verify model is installed
   ollama pull llama2
   ```

2. **Online AI Service Issues**:
   - Check API key is valid and not expired
   - Verify service URL is correct
   - Test API access outside ChatterBox
   - Check account usage limits/billing

3. **Configuration Problems**:
   - Verify model name matches installed model
   - Check service URL format (http://localhost:11434 for Ollama)
   - Test connection using Settings page
   - Try different model if available

### "TTS Service Error" or "Voice Synthesis Failed"

**Symptoms**: No AI voice output, silent responses, red TTS indicator
**Quick Diagnosis**: Check audio output and service configuration

**Solutions**:
1. **Audio Output Issues**:
   - Check system volume and audio device
   - Test speakers/headphones with other applications
   - Verify correct audio output device selected

2. **Service Configuration**:
   - Test TTS service in Settings page
   - Try different voice options (male/female)
   - Check TTS service URL and connectivity

3. **Compatibility Issues**:
   - Update audio drivers
   - Try different audio format/quality settings
   - Check for conflicts with other audio software

## Import/Export Errors

### "Import Failed" or "Invalid File Format"

**Symptoms**: Can't import scenarios or practice packs, format error messages
**Common Causes**: Corrupted files, wrong file type, version incompatibility

**Solutions**:
1. **File Format Verification**:
   - Ensure file extension is `.json`
   - Verify file is ChatterBox export (not other app's JSON)
   - Check file size isn't 0 bytes (corruption indicator)

2. **Re-download File**:
   - Download again from original source
   - Try different browser or download method
   - Check file integrity after download

3. **Manual File Inspection**:
   ```bash
   # Check if file is valid JSON
   cat filename.json | python -m json.tool
   
   # Check file contents
   head -20 filename.json
   ```

4. **Version Compatibility**:
   - Ensure ChatterBox version supports file format
   - Check file's `formatVersion` field
   - Try importing individual scenarios if pack fails

### "Export Failed" or "Cannot Save File"

**Symptoms**: Export process fails, no file created, permission errors
**Common Causes**: Permission issues, insufficient disk space, path problems

**Solutions**:
1. **Permission Issues**:
   - Try saving to different location (Desktop, Documents)
   - Run ChatterBox with elevated permissions
   - Check folder write permissions

2. **Disk Space**:
   - Verify sufficient free space (at least 50MB)
   - Clear temporary files
   - Try different drive/location

3. **Path Issues**:
   - Avoid special characters in filename
   - Use shorter file paths
   - Try simpler filename

## Performance Issues

### "ChatterBox is Running Slowly" or "Application Freezing"

**Symptoms**: Slow response times, UI lag, temporary freezing
**Common Causes**: Insufficient resources, too many applications running

**Solutions**:
1. **Resource Management**:
   - Close other applications to free RAM
   - Check system resources (Task Manager/Activity Monitor)
   - Restart ChatterBox periodically during long sessions

2. **AI Model Optimization**:
   - Use smaller AI models (7B instead of 13B+)
   - Switch to online AI services if local is too resource-intensive
   - Close other AI applications

3. **System Optimization**:
   - Restart computer to clear memory
   - Check for system updates
   - Scan for malware/viruses

### "Conversation Delays" or "Slow AI Responses"

**Symptoms**: Long waits between speech input and AI response
**Common Causes**: Network latency, overloaded AI service, insufficient hardware

**Solutions**:
1. **Local AI Optimization**:
   - Use faster models (smaller parameter count)
   - Ensure sufficient RAM allocated
   - Close competing applications

2. **Network Optimization**:
   - Check internet speed for online services
   - Try different network connection
   - Use local services instead of online

3. **Service Configuration**:
   - Reduce context window size
   - Lower AI temperature/creativity settings
   - Try different AI service/provider

## Audio and Voice Issues

### "No Audio Output" or "Can't Hear AI Voice"

**Symptoms**: Silent AI responses, no TTS output, audio issues
**Quick Fix**: Check system volume and audio device selection

**Solutions**:
1. **System Audio Check**:
   - Verify system volume not muted
   - Test audio with other applications
   - Check correct audio output device selected

2. **ChatterBox Audio Settings**:
   - Test TTS in Settings page
   - Try different voice options
   - Check voice speed/volume settings

3. **Driver and Hardware**:
   - Update audio drivers
   - Try different speakers/headphones
   - Check for audio device conflicts

### "Poor Audio Quality" or "Distorted Voice"

**Symptoms**: Robotic voice, audio artifacts, unclear speech
**Common Causes**: Poor TTS model, network issues, audio driver problems

**Solutions**:
1. **Service Quality**:
   - Try different TTS model/voice
   - Switch between local and online TTS services
   - Check TTS service configuration

2. **Network Issues**:
   - Verify stable internet connection for online TTS
   - Use local TTS services for consistent quality
   - Check for network congestion

3. **System Audio**:
   - Update audio drivers
   - Check audio enhancement settings
   - Try different audio quality settings

## Scenario and Content Issues

### "Scenario Won't Start" or "Session Creation Failed"

**Symptoms**: Can't start practice sessions, scenario loading errors
**Common Causes**: Corrupted scenario data, service dependencies

**Solutions**:
1. **Scenario Verification**:
   - Try different scenario to isolate issue
   - Check scenario has all required fields
   - Test with default scenarios first

2. **Service Dependencies**:
   - Ensure AI service is connected
   - Verify STT/TTS services are working
   - Check all services show green status

3. **Data Integrity**:
   - Export and re-import problematic scenarios
   - Check scenario for special characters or formatting issues
   - Try creating new scenario with same content

### "AI Breaking Character" or "Inappropriate Responses"

**Symptoms**: AI not following scenario instructions, off-topic responses
**Common Causes**: Poor scenario prompts, AI model limitations

**Solutions**:
1. **Improve Scenario Prompts**:
   - Add more specific character instructions
   - Include behavioral guidelines
   - Provide clear context and objectives

2. **AI Model Selection**:
   - Try different AI models
   - Use larger models for better instruction following
   - Check model specialization (conversation vs. completion)

3. **Configuration Adjustment**:
   - Lower AI temperature for more focused responses
   - Adjust context window size
   - Restart conversation if AI goes off-track

---

## Error Code Reference

### Common Error Codes

**E001 - Database Connection Failed**: Database file corrupted or inaccessible
- **Solution**: Clear data directory and restart ChatterBox

**E002 - Service Timeout**: AI or speech service not responding
- **Solution**: Check service connectivity and restart services

**E003 - Import Format Error**: Invalid or corrupted import file
- **Solution**: Verify file format and re-download if necessary

**E004 - Permission Denied**: Insufficient permissions for operation
- **Solution**: Run as administrator or check file permissions

**E005 - Network Connection Failed**: Cannot reach external services
- **Solution**: Check internet connection and firewall settings

## Quick Diagnostic Commands

### System Information
```bash
# Check ChatterBox version
# Available in About page within app

# Check system resources
# Windows: Task Manager → Performance
# macOS: Activity Monitor
# Linux: htop or top

# Check network connectivity
ping google.com
```

### Service Testing
```bash
# Test Ollama (local AI)
curl http://localhost:11434/api/tags

# Test Speaches (local speech)
curl http://localhost:8000/health

# Check ports in use
netstat -an | grep :11434
```

### Log Locations
- **Windows**: `%APPDATA%/ChatterBox/logs/`
- **macOS**: `~/Library/Application Support/ChatterBox/logs/`
- **Linux**: `~/.config/ChatterBox/logs/`

---

## When to Seek Additional Help

### Escalation Criteria
- **Error persists after trying solutions**: Basic troubleshooting hasn't resolved issue
- **Hardware-specific issues**: Problems unique to your system configuration
- **Network environment complexities**: Corporate/school network restrictions
- **Advanced configuration needs**: Custom setups beyond standard documentation

### Information to Gather
When seeking help, collect:
- **ChatterBox version** (from About page)
- **Operating system** and version
- **Error messages** (exact text or screenshots)
- **Steps to reproduce** the problem
- **Recent changes** (new software, updates, configuration changes)
- **Log files** (if available and safe to share)

### Support Resources
1. **Documentation search**: Use browser find (Ctrl/Cmd+F) in these guides
2. **FAQ section**: Check [Frequently Asked Questions](../reference/faq.md)
3. **GitHub Issues**: Search existing issues at [GitHub repository](https://github.com/michael-borck/chatter-box/issues)
4. **Create new issue**: If problem not found, create detailed bug report

---

**Most ChatterBox errors have straightforward solutions. Work through the relevant section systematically, and don't hesitate to restart the application or services when in doubt! 🔧**

**Related Guides**: 
- **[Connection Issues](connection-issues.md)** - Detailed networking troubleshooting
- **[Performance Tips](performance-tips.md)** - Optimize ChatterBox performance
- **[FAQ](../reference/faq.md)** - Frequently asked questions and answers