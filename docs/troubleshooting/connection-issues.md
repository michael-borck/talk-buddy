# Connection Issues

Having trouble connecting to speech or AI services? This guide will help you diagnose and fix connection problems in Talk Buddy.

## Quick Diagnosis

### Check Status Footer
Look at the bottom of Talk Buddy for service status indicators:

- **Green dots (●)**: Service is connected and working
- **Red dots (●)**: Connection failed or service error
- **Gray dots (○)**: Service status unknown or not configured
- **Yellow dots (●)**: Service is being tested or has warnings

### Common Status Combinations

**All Green**: Everything working perfectly ✅
**All Red**: Check internet connection and service URLs ❌
**Mixed Colors**: Some services working, others need attention ⚠️
**All Gray**: Services not configured or first-time setup needed ⚙️

## Internet Connection Issues

### Basic Connectivity

#### Test Your Internet Connection
1. **Open a web browser**
2. **Visit a reliable site** (google.com, github.com)
3. **Check connection speed** using speedtest.net
4. **Verify stable connection** (no frequent dropouts)

#### Network Requirements
- **Minimum speed**: 1 Mbps upload/download for basic functionality
- **Recommended speed**: 5 Mbps for smooth real-time conversation
- **Latency**: Under 500ms for responsive interaction
- **Stability**: Consistent connection without frequent interruptions

### Firewall and Security

#### Windows Firewall
1. **Open Windows Security** (search "Windows Security")
2. **Go to Firewall & network protection**
3. **Click "Allow an app through firewall"**
4. **Find Talk Buddy** in the list
5. **Check both "Private" and "Public" boxes**
6. **If Talk Buddy isn't listed**: Click "Change settings" → "Allow another app" → Browse for Talk Buddy

#### macOS Firewall
1. **Open System Preferences** → Security & Privacy
2. **Click "Firewall" tab**
3. **Click "Firewall Options"**
4. **Ensure Talk Buddy is set to "Allow incoming connections"**
5. **If not listed**: Click "+" and add Talk Buddy

#### Antivirus Software
Some antivirus programs block Talk Buddy:
- **Temporarily disable** antivirus to test
- **Add Talk Buddy to exceptions** if disabling fixes the issue
- **Check real-time protection settings**
- **Look for "web protection" or "network monitoring" features**

### Corporate/School Networks

#### Common Enterprise Restrictions
- **Proxy servers**: May block direct connections
- **Port blocking**: Specific ports might be restricted
- **Domain filtering**: AI service domains might be blocked
- **Bandwidth limitations**: May cause slow or failed connections

#### Solutions for Restricted Networks
1. **Contact IT department**: Request access to necessary services
2. **Use mobile hotspot**: Bypass network restrictions temporarily
3. **VPN connection**: If allowed by organization policy
4. **Local services**: Set up local AI/speech services (see Service Setup guides)

## Service-Specific Issues

### Speech-to-Text (STT) Problems

#### Symptoms
- Microphone button doesn't respond
- "Speech not recognized" errors
- Long delays in transcription
- Red STT indicator in status footer

#### Solutions

**Check Microphone Permissions**
- **Windows**: Settings → Privacy → Microphone → Allow Talk Buddy
- **macOS**: System Preferences → Security & Privacy → Microphone → Check Talk Buddy
- **Linux**: Verify ALSA/PulseAudio permissions

**Test Microphone Hardware**
1. **Use system voice recorder** to verify microphone works
2. **Check microphone volume** in system settings
3. **Try different microphone** if available
4. **Ensure microphone isn't muted** in system settings

**Service Configuration**
1. **Go to Talk Buddy Settings**
2. **Check STT Service URL** (default: configured service endpoint)
3. **Click "Test STT"** to verify connection
4. **Try different STT model** if options are available

### Text-to-Speech (TTS) Problems

#### Symptoms
- No AI voice heard
- TTS test fails in settings
- Audio cuts out during speech
- Red TTS indicator in status footer

#### Solutions

**Check Audio Output**
1. **Verify speakers/headphones work** with other applications
2. **Check system volume** isn't muted or too low
3. **Try different audio device** if multiple are available
4. **Test system text-to-speech** functionality

**Service Configuration**
1. **Go to Talk Buddy Settings**
2. **Check TTS Service URL** and configuration
3. **Click "Test TTS"** to verify connection
4. **Try different voice options** (male/female)
5. **Adjust speech speed** if available

### AI Chat Service Problems

#### Symptoms
- AI doesn't respond to speech
- Long delays in AI responses
- Error messages during conversation
- Red Chat indicator in status footer

#### Solutions

**Service URL and Configuration**
1. **Go to Talk Buddy Settings**
2. **Verify AI Service URL** (default: Ollama endpoint)
3. **Check API keys** if using paid services
4. **Test connection** using settings test button

**Model Availability**
- **Verify AI model is installed** (for local services like Ollama)
- **Check model name spelling** in settings
- **Try different model** if multiple are available
- **Ensure model supports conversation** (not just completion)

## Local Service Setup Issues

### Ollama Connection Problems

#### Common Ollama Issues
- **Service not running**: Ollama not started
- **Wrong port**: Default port 11434 might be changed
- **Model not installed**: Required model not downloaded
- **Insufficient resources**: Not enough RAM/CPU for model

#### Ollama Troubleshooting Steps
1. **Check if Ollama is running**:
   ```bash
   # Check if service is running
   curl http://localhost:11434/api/tags
   ```

2. **Verify model installation**:
   ```bash
   # List installed models
   ollama list
   
   # Install model if missing
   ollama pull llama2
   ```

3. **Check Ollama logs**:
   ```bash
   # View logs for error messages
   ollama logs
   ```

4. **Restart Ollama service**:
   ```bash
   # Stop and start Ollama
   ollama stop
   ollama start
   ```

### Speaches Service Issues

#### Common Speaches Problems
- **Service not installed**: Speaches not set up locally
- **Wrong configuration**: Incorrect URL or port
- **Model download issues**: Speech models not available
- **Resource conflicts**: Port already in use

#### Speaches Troubleshooting
1. **Check service status**:
   ```bash
   # Test if Speaches is responding
   curl http://localhost:8000/health
   ```

2. **Verify installation**: Follow [Speaches setup guide](../services/stt-setup.md)

3. **Check available models**: Ensure required speech models are downloaded

4. **Port conflicts**: Try different port if 8000 is in use

## Advanced Troubleshooting

### Network Diagnostics

#### Test Specific Endpoints
Use terminal/command prompt to test connections:

```bash
# Test Ollama (local AI)
curl http://localhost:11434/api/tags

# Test Speaches (local speech)
curl http://localhost:8000/health

# Test online services (if using)
curl https://api.service-url.com/health
```

#### Check Port Availability
```bash
# Windows
netstat -an | findstr :11434

# macOS/Linux
netstat -an | grep :11434
lsof -i :11434
```

### System Resource Issues

#### Memory and CPU
- **Check system resources**: Task Manager (Windows) or Activity Monitor (macOS)
- **Close unnecessary applications**: Free up RAM for AI models
- **Monitor during use**: Watch for resource spikes during conversations

#### Disk Space
- **Ensure adequate storage**: AI models can be several GB each
- **Clear temporary files**: Free up disk space if low
- **Check Talk Buddy data folder**: Ensure it's not corrupted

### Log File Analysis

#### Talk Buddy Logs
1. **Find log location**:
   - **Windows**: `%APPDATA%/TalkBuddy/logs/`
   - **macOS**: `~/Library/Application Support/TalkBuddy/logs/`
   - **Linux**: `~/.config/TalkBuddy/logs/`

2. **Check recent logs** for error messages
3. **Look for connection errors**, timeout messages, or service failures

#### Service Logs
- **Ollama logs**: Check Ollama service logs for AI-related errors
- **System logs**: Check OS logs for hardware or permission issues
- **Network logs**: Look for firewall or proxy blocking

## Service URL Reference

### Default Service URLs

#### Local Services (Recommended)
- **Ollama (AI)**: `http://localhost:11434`
- **Speaches (STT/TTS)**: `http://localhost:8000`

#### Online Services (Fallback)
- **Check current settings** in Talk Buddy Settings page
- **Verify URLs are current** (services may change endpoints)

### Changing Service URLs

1. **Go to Settings** in Talk Buddy
2. **Update service URLs** in the appropriate fields
3. **Click "Test"** for each service to verify connectivity
4. **Save settings** when all tests pass

## Getting Additional Help

### Information to Collect

When seeking help, gather:
- **Operating system** and version
- **Talk Buddy version** (check About page)
- **Service status** (red/green/gray indicators)
- **Error messages** from logs or UI
- **Network environment** (home, office, school)
- **Services being used** (local vs online)

### Support Resources

- **[Common Errors Guide](common-errors.md)**: Solutions to frequent problems
- **[Service Setup Guides](../services/)**: Detailed configuration instructions
- **[GitHub Issues](https://github.com/michael-borck/talk-buddy/issues)**: Community support and bug reports

### Temporary Workarounds

#### While Troubleshooting
- **Use text-only mode**: Practice scenarios without voice
- **Switch to online services**: If local services are problematic
- **Use mobile hotspot**: Bypass network restrictions
- **Practice offline scenarios**: Use scenarios that don't require AI

---

## Quick Fix Checklist

### First Steps (5 minutes)
- [ ] Check internet connection in browser
- [ ] Look at Talk Buddy status footer indicators
- [ ] Restart Talk Buddy application
- [ ] Test each service using Settings page

### If Still Having Issues (15 minutes)
- [ ] Check firewall and antivirus settings
- [ ] Verify microphone and speaker permissions
- [ ] Test hardware with other applications
- [ ] Review Talk Buddy log files for errors

### Advanced Steps (30 minutes)
- [ ] Test service URLs manually using curl/browser
- [ ] Check system resources and port availability
- [ ] Try alternative service configurations
- [ ] Contact IT support (if on corporate network)

---

**Most connection issues are resolved by checking basic network connectivity and service permissions. Work through the checklist systematically for best results! 🔧**

**Related Guides**: 
- **[Service Setup](../services/stt-setup.md)** - Configure speech and AI services
- **[Common Errors](common-errors.md)** - Solutions to frequent problems
- **[Performance Tips](performance-tips.md)** - Optimize Talk Buddy performance