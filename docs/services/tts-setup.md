# Text-to-Speech Setup

Configure voice synthesis services to enable AI voice responses in Talk Buddy. This guide covers both online and local TTS (Text-to-Speech) service options for natural-sounding conversation practice.

## Understanding TTS Services

### What is Text-to-Speech?
TTS services convert AI text responses into spoken voice output:
- **AI voice responses**: Hear what the AI character says during practice
- **Natural conversations**: Voice output makes dialogue feel more realistic
- **Multiple voices**: Different characters can have distinct voices
- **Language support**: Various languages and accents (service-dependent)

### Service Options

#### Online Services (Default)
**Pre-configured services**: Ready to use immediately
- **Pros**: No setup required, high-quality voices, multiple languages
- **Cons**: Requires internet, potential privacy concerns, usage limits
- **Best for**: Quick start, testing, occasional practice

#### Local Services (Recommended for Privacy)
**Self-hosted services**: Run on your own computer
- **Pros**: Complete privacy, offline capability, no usage limits
- **Cons**: Requires setup, uses system resources, may have fewer voice options
- **Best for**: Regular practice, privacy-conscious users, offline environments

## Quick Start (Online Services)

### Default Configuration
Talk Buddy comes pre-configured with working TTS services:

#### Check Current Status
1. **Look at status footer**: TTS indicator should be green (●)
2. **If green**: You're ready for voice-enabled practice
3. **If red/gray**: Follow troubleshooting steps below

#### Test TTS Service
1. **Go to Settings**: Click "Settings" in sidebar
2. **Find TTS section**: Look for Text-to-Speech configuration
3. **Click "Test TTS"**: Verify service is working
4. **Listen for voice**: Should hear test speech output
5. **Check audio quality**: Verify voice is clear and understandable

### Troubleshooting Online Services

#### Connection Issues
- **Check internet**: Verify stable connection
- **Firewall settings**: Ensure Talk Buddy can access external services
- **Service status**: Online services may occasionally be unavailable

#### Audio Problems
- **System volume**: Check computer audio settings and volume
- **Audio device**: Verify correct speakers/headphones selected
- **Driver issues**: Update audio drivers if needed

## Local TTS Setup (Speaches)

### Why Use Local Services?
**Privacy benefits**:
- No data sent to external servers
- Complete offline functionality
- No usage limits or quotas

**Performance benefits**:
- Faster response times (no network latency)
- Consistent availability
- Customizable voices for your use case

### Installing Speaches

#### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2-10GB for voice models
- **CPU**: Modern processor (last 5 years recommended)

#### Installation Steps

**Option 1: Docker Installation (Recommended)**
```bash
# Pull the Speaches Docker image
docker pull ghcr.io/tts-ai/speaches:latest

# Run Speaches container with TTS enabled
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

# Start Speaches server with TTS
speaches serve --host 0.0.0.0 --port 8000 --enable-tts
```

**Option 3: Binary Installation**
1. **Download**: Get binary from [Speaches releases](https://github.com/tts-ai/speaches/releases)
2. **Extract**: Unzip to preferred location
3. **Run**: Execute the binary to start server
4. **Configure**: Set to run on port 8000 with TTS enabled

### Configuring Talk Buddy for Local TTS

#### Update Service URL
1. **Open Talk Buddy Settings**
2. **Find TTS Service URL field**
3. **Change to local address**: `http://localhost:8000`
4. **Save settings**

#### Test Local Connection
1. **Click "Test TTS"** in settings
2. **Verify connection**: Should show successful connection
3. **Test voice synthesis**: Should hear test speech
4. **Check status footer**: TTS indicator should be green

### Speaches Voice Configuration

#### Voice Model Selection
Speaches supports multiple TTS models:

**Fast Models (Lower quality, faster synthesis)**
- Good for: Real-time conversation, older hardware
- Model examples: `speaches-ai/piper-en_US-amy-low`, `microsoft/speecht5_tts`

**High-Quality Models (Better voices, slower synthesis)**
- Good for: High-quality practice, powerful hardware
- Model examples: `speaches-ai/piper-en_US-lessac-high`, `suno/bark`

#### Voice Characteristics
Configure different voices for scenarios:
```bash
# Example: Configure female voice
speaches serve --tts-voice "en_US-amy-medium" --port 8000

# Example: Configure male voice
speaches serve --tts-voice "en_US-ryan-high" --port 8000
```

#### Language Configuration
Set up for your language:
```bash
# Example: Configure for Spanish TTS
speaches serve --tts-language es --tts-voice "es_ES-marta-medium" --port 8000

# Example: Configure for French TTS
speaches serve --tts-language fr --tts-voice "fr_FR-siwis-medium" --port 8000
```

#### Advanced TTS Configuration
Create configuration file `speaches.yaml`:
```yaml
server:
  host: "0.0.0.0"
  port: 8000
  
stt:
  enabled: true
  model: "Systran/faster-whisper-medium"
  
tts:
  enabled: true
  model: "speaches-ai/piper-en_US-lessac-medium"
  voice_speed: 1.0
  voice_pitch: 0.0
  output_format: "wav"
```

## Advanced TTS Configuration

### Multiple Voice Setup

#### Character-Specific Voices
Configure different voices for different AI characters:
1. **Interview scenarios**: Professional, clear voice
2. **Customer service**: Friendly, approachable voice
3. **Technical scenarios**: Authoritative, confident voice
4. **Casual conversation**: Relaxed, conversational voice

#### Voice Switching
In Talk Buddy settings:
- **Primary voice**: Default voice for most scenarios
- **Alternative voices**: Different voices for specific contexts
- **Test voices**: Verify each voice works well for intended use
- **Document preferences**: Keep track of which voices work best

### Performance Optimization

#### Hardware Optimization
**For better local TTS performance**:
- **Use SSD storage**: Faster model loading
- **Increase RAM**: Better model caching
- **Use GPU acceleration**: If supported by your TTS service
- **Close other applications**: Free resources for voice synthesis

#### Voice Quality vs Speed
**Choose appropriate balance**:
- **Fast models**: Real-time conversation priority
- **Quality models**: Natural-sounding voice priority
- **Balanced models**: Good compromise for most uses
- **Specialized models**: Optimized for specific languages or use cases

### Security and Privacy

#### Local Service Security
**Secure your local installation**:
- **Firewall configuration**: Only allow local connections
- **Network isolation**: Keep TTS service on local network only
- **Regular updates**: Maintain current software versions
- **Access control**: Restrict who can access the service

#### Data Privacy
**Understand data handling**:
- **Local processing**: No data leaves your computer
- **No logging**: Configure services to not store text/audio
- **Temporary processing**: Text processed in memory only
- **User control**: You control all data and processing

## Troubleshooting TTS Issues

### Common Problems

#### No Audio Output
**Symptoms**: Silent AI responses, no voice heard
**Solutions**:
1. **Check system volume**: Verify computer audio not muted
2. **Test audio device**: Confirm speakers/headphones work with other apps
3. **Check TTS service**: Verify service is running and connected
4. **Test different voice**: Try alternative voice models

#### Poor Voice Quality
**Symptoms**: Robotic voice, audio artifacts, unclear speech
**Solutions**:
1. **Try different voice model**: Some models sound more natural
2. **Check audio settings**: Verify sample rate and format settings
3. **Update audio drivers**: Ensure latest audio drivers installed
4. **Reduce system load**: Close other applications using audio

#### Service Connection Errors
**Symptoms**: Red TTS indicator, connection timeouts
**Solutions**:
1. **Verify service running**: Check if Speaches or online service is available
2. **Test network connectivity**: Ensure internet access for online services
3. **Check firewall**: Confirm Talk Buddy can access TTS service
4. **Restart services**: Stop and start TTS service, restart Talk Buddy

#### Slow Voice Generation
**Symptoms**: Long delays between AI text and voice output
**Solutions**:
1. **Use faster models**: Switch to smaller, quicker TTS models
2. **Optimize hardware**: Close other applications, upgrade hardware
3. **Check network**: Ensure stable, fast internet for online services
4. **Local processing**: Switch to local TTS service for better performance

### Advanced Troubleshooting

#### Log Analysis
**Check service logs for errors**:
```bash
# View Speaches logs
docker logs speaches

# Check system audio logs (macOS)
log show --predicate 'subsystem == "com.apple.coreaudio"' --last 5m

# Windows audio troubleshooting
# Use Windows Audio troubleshooter in Settings
```

#### Network Diagnostics
**Test service connectivity**:
```bash
# Test local Speaches service
curl http://localhost:8000/health

# Test TTS endpoint
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "voice": "en_US-amy-medium"}'
```

#### Performance Monitoring
**Monitor resource usage**:
- **CPU usage**: TTS processing should use <30% CPU
- **Memory usage**: Voice models require 1-3GB RAM typically
- **Network usage**: Online services use bandwidth during synthesis
- **Audio latency**: Monitor delay between text and voice output

## Service Comparison

### Online vs Local TTS

| Aspect | Online Services | Local Services |
|--------|----------------|----------------|
| **Setup** | Ready immediately | Requires installation |
| **Privacy** | Data sent externally | Complete privacy |
| **Voice Quality** | Often excellent | Varies by model |
| **Speed** | Network dependent | Hardware dependent |
| **Cost** | May have usage limits | Free after setup |
| **Offline** | Requires internet | Works offline |
| **Voices** | Many options | Depends on models |

### Recommended Configurations

#### For Students
- **Start with**: Default online services
- **Upgrade to**: Local services if practicing frequently
- **Best for**: Learning and experimenting with voice-enabled practice

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

### Online TTS (5 minutes)
- [ ] Open Talk Buddy
- [ ] Check TTS status indicator (should be green)
- [ ] Go to Settings and test TTS service
- [ ] Verify audio output device is working
- [ ] Test with sample text

### Local TTS (45 minutes)
- [ ] Install Speaches (Docker, Python, or binary)
- [ ] Start Speaches service on port 8000 with TTS enabled
- [ ] Configure Talk Buddy to use localhost:8000
- [ ] Test connection in Settings
- [ ] Verify voice synthesis works
- [ ] Configure for automatic startup (optional)

### Troubleshooting (15 minutes)
- [ ] Check audio output device and system volume
- [ ] Verify service connectivity (green status indicator)
- [ ] Test with simple text synthesis
- [ ] Check network/firewall settings if needed
- [ ] Review logs for error messages

---

**With proper TTS setup, your Talk Buddy conversations become immersive and natural. Choose the option that best fits your privacy needs and desired voice quality! 🔊**

**Related Guides**: 
- **[STT Setup](stt-setup.md)** - Configure speech recognition input
- **[AI Model Integration](ai-model-integration.md)** - Set up conversation AI
- **[Connection Issues](../troubleshooting/connection-issues.md)** - Fix connectivity problems