# Speech-to-Text Setup

Configure speech recognition services to enable voice input in ChatterBox. This guide covers both online and local STT (Speech-to-Text) service options.

## Understanding STT Services

### What is Speech-to-Text?
STT services convert your spoken words into text that ChatterBox can process:
- **Voice input**: Capture what you say during practice conversations
- **Real-time processing**: Convert speech to text quickly for smooth interaction
- **Accuracy**: Understand your words correctly for meaningful AI responses
- **Multiple languages**: Support for various languages and accents (service-dependent)

### Service Options

#### Online Services (Default)
**Pre-configured services**: Ready to use immediately
- **Pros**: No setup required, high accuracy, multiple language support
- **Cons**: Requires internet, potential privacy concerns, usage limits
- **Best for**: Quick start, testing, occasional practice

#### Local Services (Recommended for Privacy)
**Self-hosted services**: Run on your own computer
- **Pros**: Complete privacy, offline capability, no usage limits
- **Cons**: Requires setup, uses system resources, may have lower accuracy
- **Best for**: Regular practice, privacy-conscious users, offline environments

## Quick Start (Online Services)

### Default Configuration
ChatterBox comes pre-configured with working STT services:

#### Check Current Status
1. **Look at status footer**: STT indicator should be green (●)
2. **If green**: You're ready to practice with voice input
3. **If red/gray**: Follow troubleshooting steps below

#### Test STT Service
1. **Go to Settings**: Click "Settings" in sidebar
2. **Find STT section**: Look for Speech-to-Text configuration
3. **Click "Test STT"**: Verify service is working
4. **Speak into microphone**: Say a test phrase
5. **Check results**: Verify your speech was recognized correctly

### Troubleshooting Online Services

#### Connection Issues
- **Check internet**: Verify stable connection
- **Firewall settings**: Ensure ChatterBox can access external services
- **Service status**: Online services may occasionally be unavailable

#### Microphone Problems
- **Permissions**: Grant microphone access to ChatterBox
- **Hardware test**: Verify microphone works in other applications
- **System settings**: Check microphone volume and input device

## Local STT Setup (Speaches)

### Why Use Local Services?
**Privacy benefits**:
- No data sent to external servers
- Complete offline functionality
- No usage limits or quotas

**Performance benefits**:
- Faster response times (no network latency)
- Consistent availability
- Customizable models for your use case

### Installing Speaches

#### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2-5GB for speech models
- **CPU**: Modern processor (last 5 years recommended)

#### Installation Steps

**Option 1: Docker Installation (Recommended)**
```bash
# Pull the Speaches Docker image
docker pull ghcr.io/tts-ai/speaches:latest

# Run Speaches container
docker run -d \
  --name speaches \
  -p 8000:8000 \
  ghcr.io/tts-ai/speaches:latest
```

**Option 2: Python Installation**
```bash
# Install Python 3.8+ if not already installed
python --version

# Install Speaches via pip
pip install speaches

# Start Speaches server
speaches serve --host 0.0.0.0 --port 8000
```

**Option 3: Binary Installation**
1. **Download**: Get binary from [Speaches releases](https://github.com/tts-ai/speaches/releases)
2. **Extract**: Unzip to preferred location
3. **Run**: Execute the binary to start server
4. **Configure**: Set to run on port 8000

### Configuring ChatterBox for Local STT

#### Update Service URL
1. **Open ChatterBox Settings**
2. **Find STT Service URL field**
3. **Change to local address**: `http://localhost:8000`
4. **Save settings**

#### Test Local Connection
1. **Click "Test STT"** in settings
2. **Verify connection**: Should show successful connection
3. **Test speech recognition**: Speak a test phrase
4. **Check status footer**: STT indicator should be green

### Speaches Configuration Options

#### Model Selection
Speaches supports multiple STT models:

**Fast Models (Lower accuracy, faster processing)**
- Good for: Real-time conversation, older hardware
- Model examples: `Systran/faster-whisper-small`, `openai/whisper-tiny`

**Accurate Models (Higher accuracy, slower processing)**
- Good for: High-quality transcription, powerful hardware
- Model examples: `Systran/faster-whisper-large-v2`, `openai/whisper-large`

#### Language Configuration
Configure for your language:
```bash
# Example: Configure for Spanish
speaches serve --language es --port 8000

# Example: Configure for French
speaches serve --language fr --port 8000
```

#### Advanced Configuration
Create configuration file `speaches.yaml`:
```yaml
server:
  host: "0.0.0.0"
  port: 8000
  
stt:
  model: "Systran/faster-whisper-medium"
  language: "en"
  device: "auto"  # auto, cpu, cuda
  
tts:
  enabled: true
  model: "speaches-ai/piper-en_US-amy-low"
```

## Advanced STT Configuration

### Multiple Service Setup

#### Backup Services
Configure multiple STT services for redundancy:
1. **Primary service**: Local Speaches for regular use
2. **Backup service**: Online service for when local is unavailable
3. **Testing**: Verify both services work independently

#### Service Switching
In ChatterBox settings:
- **Change service URL**: Switch between local and online
- **Test new service**: Verify functionality before practice
- **Save configurations**: Keep both URLs documented for easy switching

### Performance Optimization

#### Hardware Optimization
**For better local STT performance**:
- **Use SSD storage**: Faster model loading
- **Increase RAM**: Better model caching
- **Use GPU acceleration**: If supported by your STT service
- **Close other applications**: Free resources for speech processing

#### Model Selection
**Choose appropriate models**:
- **Fast models**: Real-time conversation priority
- **Accurate models**: High-quality transcription priority
- **Language-specific**: Better accuracy for non-English languages
- **Domain-specific**: Specialized vocabulary (medical, technical)

### Security and Privacy

#### Local Service Security
**Secure your local installation**:
- **Firewall configuration**: Only allow local connections
- **Network isolation**: Keep STT service on local network only
- **Regular updates**: Maintain current software versions
- **Access control**: Restrict who can access the service

#### Data Privacy
**Understand data handling**:
- **Local processing**: No data leaves your computer
- **No logging**: Configure services to not store audio/transcriptions
- **Temporary processing**: Audio processed in memory only
- **User control**: You control all data and processing

## Troubleshooting STT Issues

### Common Problems

#### Microphone Not Working
**Symptoms**: No speech detected, silent input
**Solutions**:
1. **Check system permissions**: Grant microphone access to ChatterBox
2. **Test hardware**: Verify microphone works in other applications
3. **Check input device**: Ensure correct microphone selected in system settings
4. **Adjust sensitivity**: Increase microphone volume if too quiet

#### Poor Recognition Accuracy
**Symptoms**: Speech transcribed incorrectly, frequent mistakes
**Solutions**:
1. **Improve audio quality**: Use better microphone, reduce background noise
2. **Speak clearly**: Slower, more deliberate speech
3. **Check language settings**: Ensure STT service configured for your language
4. **Try different model**: Some models work better for specific accents/voices

#### Service Connection Errors
**Symptoms**: Red STT indicator, connection timeouts
**Solutions**:
1. **Verify service running**: Check if Speaches or online service is available
2. **Test network connectivity**: Ensure internet access for online services
3. **Check firewall**: Confirm ChatterBox can access STT service
4. **Restart services**: Stop and start STT service, restart ChatterBox

#### Slow Response Times
**Symptoms**: Long delays between speech and recognition
**Solutions**:
1. **Use faster models**: Switch to smaller, quicker STT models
2. **Optimize hardware**: Close other applications, upgrade hardware
3. **Check network**: Ensure stable, fast internet for online services
4. **Local processing**: Switch to local STT service for better performance

### Advanced Troubleshooting

#### Log Analysis
**Check service logs for errors**:
```bash
# View Speaches logs
docker logs speaches

# Check system microphone logs (macOS)
log show --predicate 'subsystem == "com.apple.coreaudio"' --last 5m

# Windows microphone troubleshooting
# Use Windows Audio troubleshooter in Settings
```

#### Network Diagnostics
**Test service connectivity**:
```bash
# Test local Speaches service
curl http://localhost:8000/health

# Test microphone endpoint
curl -X POST http://localhost:8000/stt \
  -H "Content-Type: audio/wav" \
  --data-binary @test-audio.wav
```

#### Performance Monitoring
**Monitor resource usage**:
- **CPU usage**: STT processing should use <50% CPU
- **Memory usage**: Models require 1-4GB RAM typically
- **Network usage**: Online services use bandwidth during processing
- **Disk I/O**: Local models may cause disk activity during loading

## Service Comparison

### Online vs Local STT

| Aspect | Online Services | Local Services |
|--------|----------------|----------------|
| **Setup** | Ready immediately | Requires installation |
| **Privacy** | Data sent externally | Complete privacy |
| **Accuracy** | Often very high | Varies by model |
| **Speed** | Network dependent | Hardware dependent |
| **Cost** | May have usage limits | Free after setup |
| **Offline** | Requires internet | Works offline |
| **Languages** | Many supported | Depends on models |

### Recommended Configurations

#### For Students
- **Start with**: Default online services
- **Upgrade to**: Local services if practicing frequently
- **Best for**: Learning and experimenting

#### For Teachers
- **Recommended**: Local services for privacy and reliability
- **Classroom use**: Local services avoid internet dependency
- **Best for**: Consistent, private classroom experience

#### For Professionals
- **Recommended**: Local services for confidential practice
- **Corporate use**: Local services meet security requirements
- **Best for**: Professional development with privacy

---

## Quick Setup Checklist

### Online STT (5 minutes)
- [ ] Open ChatterBox
- [ ] Check STT status indicator (should be green)
- [ ] Go to Settings and test STT service
- [ ] Grant microphone permissions if prompted
- [ ] Test with sample speech

### Local STT (30 minutes)
- [ ] Install Speaches (Docker, Python, or binary)
- [ ] Start Speaches service on port 8000
- [ ] Configure ChatterBox to use localhost:8000
- [ ] Test connection in Settings
- [ ] Verify speech recognition works
- [ ] Configure for automatic startup (optional)

### Troubleshooting (15 minutes)
- [ ] Check microphone permissions and hardware
- [ ] Verify service connectivity (green status indicator)
- [ ] Test with simple, clear speech
- [ ] Check network/firewall settings if needed
- [ ] Review logs for error messages

---

**With proper STT setup, you'll have accurate voice recognition for natural conversation practice. Choose the option that best fits your privacy needs and technical comfort level! 🎤**

**Related Guides**: 
- **[TTS Setup](tts-setup.md)** - Configure text-to-speech output
- **[AI Model Integration](ai-model-integration.md)** - Set up conversation AI
- **[Connection Issues](../troubleshooting/connection-issues.md)** - Fix connectivity problems