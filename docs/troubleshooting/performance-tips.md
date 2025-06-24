# Performance Tips

Optimize Talk Buddy for smooth, responsive conversation practice. This guide covers system optimization, service configuration, and usage patterns for the best possible performance.

## Understanding Performance Factors

### Key Performance Areas

#### System Responsiveness
- **UI response**: Quick navigation and interaction
- **Conversation flow**: Smooth speech-to-AI-to-voice pipeline
- **Scenario loading**: Fast practice session startup
- **Data operations**: Efficient import/export and saving

#### Service Performance
- **AI response time**: How quickly AI generates responses
- **STT processing**: Speed of speech recognition
- **TTS synthesis**: Voice generation latency
- **Network operations**: Online service connectivity

#### Resource Usage
- **Memory consumption**: RAM usage by Talk Buddy and services
- **CPU utilization**: Processing load during conversations
- **Storage I/O**: Database and file operations
- **Network bandwidth**: Data usage for online services

## System Requirements and Optimization

### Minimum vs Recommended Specifications

#### Minimum Requirements (Basic functionality)
- **CPU**: Dual-core processor (2015 or later)
- **RAM**: 4GB available system memory
- **Storage**: 5GB free disk space (SSD preferred)
- **Network**: Stable internet for online services
- **Audio**: Working microphone and speakers/headphones

#### Recommended Specifications (Optimal performance)
- **CPU**: Quad-core processor (2018 or later)
- **RAM**: 8GB+ available system memory
- **Storage**: 10GB+ free SSD space
- **Network**: High-speed internet (25+ Mbps)
- **Audio**: Quality USB microphone, good speakers/headphones

#### High-Performance Setup (Advanced users)
- **CPU**: 8+ core processor with high single-thread performance
- **RAM**: 16GB+ available system memory
- **Storage**: NVMe SSD with 20GB+ free space
- **GPU**: Dedicated GPU for AI acceleration (NVIDIA preferred)
- **Network**: Gigabit internet or local-only services

### Operating System Optimization

#### Windows Optimization
**System Settings**:
```powershell
# Disable unnecessary startup programs
# Windows Settings → Apps → Startup

# Optimize power settings
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c  # High performance

# Increase virtual memory if needed
# System Properties → Advanced → Performance Settings → Virtual Memory
```

**Audio Optimization**:
- **Exclusive mode**: Enable for audio devices in Device Properties
- **Sample rate**: Set to 44.1kHz or 48kHz for optimal quality/performance
- **Buffer size**: Adjust audio driver buffer size (lower = less latency)

#### macOS Optimization
**System Preferences**:
```bash
# Reduce visual effects
# System Preferences → Accessibility → Display → Reduce motion

# Optimize audio settings
# Audio MIDI Setup → Configure speakers for optimal sample rate

# Check system resources
top -o cpu  # Monitor CPU usage
```

**Background Apps**:
- **Activity Monitor**: Identify and quit resource-heavy applications
- **Login Items**: Disable unnecessary startup applications
- **Background App Refresh**: Limit background activity

#### Linux Optimization
**System Configuration**:
```bash
# Install performance monitoring tools
sudo apt install htop iotop nethogs

# Optimize audio settings (ALSA/PulseAudio)
sudo apt install pulseaudio-utils alsa-utils

# Check system resources
htop  # Interactive process viewer
```

**Audio System**:
```bash
# Optimize PulseAudio for low latency
echo "default-sample-rate = 44100" >> ~/.pulse/daemon.conf
echo "default-fragments = 8" >> ~/.pulse/daemon.conf
echo "default-fragment-size-msec = 5" >> ~/.pulse/daemon.conf

# Restart PulseAudio
pulseaudio -k && pulseaudio --start
```

## Talk Buddy Application Optimization

### Application Settings

#### General Performance Settings
**Memory Management**:
- **Close unused scenarios**: Keep only active practice content loaded
- **Regular restart**: Restart Talk Buddy after extended use (2+ hours)
- **Clear cache**: Use application cache clearing if available
- **Archive old content**: Move unused scenarios to archive

**Database Optimization**:
- **Regular maintenance**: Export/import scenarios periodically to refresh database
- **Limit scenario count**: Keep active scenario library manageable (<100 scenarios)
- **Clean exports**: Remove unnecessary export files from system

#### UI and Display Settings
**Visual Performance**:
- **Reduce animations**: Disable or minimize UI animations if available
- **Lower resolution**: Use appropriate display scaling for your system
- **Close other windows**: Minimize other applications during practice
- **Single monitor**: Use primary monitor for Talk Buddy if using multiple displays

### Service Configuration Optimization

#### Local AI Optimization (Ollama)
**Model Selection**:
```bash
# Use appropriately sized models
ollama pull llama2:7b        # Faster, less resource-intensive
ollama pull mistral:7b       # Good balance of quality and speed
# Avoid: llama2:70b           # Very resource-intensive

# Monitor resource usage
ollama ps                    # Check loaded models
```

**Performance Configuration**:
```bash
# Optimize context window
export OLLAMA_NUM_CTX=2048   # Smaller context = faster responses

# GPU acceleration (if available)
export OLLAMA_GPU=1

# Memory management
export OLLAMA_NUM_KEEP=5     # Keep fewer models in memory
```

#### STT Service Optimization (Speaches)
**Model Selection for Speed**:
```bash
# Fast STT models
speaches serve --stt-model "Systran/faster-whisper-tiny"    # Fastest
speaches serve --stt-model "Systran/faster-whisper-small"   # Good balance
speaches serve --stt-model "Systran/faster-whisper-base"    # Better accuracy

# Avoid for real-time: "Systran/faster-whisper-large-v3"    # Slow but accurate
```

**Processing Configuration**:
```yaml
# speaches.yaml - optimized for speed
stt:
  model: "Systran/faster-whisper-small"
  device: "auto"  # Use GPU if available
  compute_type: "int8"  # Faster inference
  
tts:
  model: "speaches-ai/piper-en_US-amy-low"  # Fast voice model
  enable_streaming: true  # Stream audio as generated
```

#### TTS Service Optimization
**Voice Model Selection**:
```bash
# Fast TTS models for real-time
speaches serve --tts-model "speaches-ai/piper-en_US-amy-low"     # Fast
speaches serve --tts-model "speaches-ai/piper-en_US-lessac-low"  # Good quality

# Avoid for real-time: High-quality models that are slower
```

## Usage Pattern Optimization

### Conversation Practice Patterns

#### Efficient Practice Sessions
**Session Planning**:
- **Set time limits**: 15-30 minute focused sessions work best
- **Prepare scenarios**: Queue up 3-5 scenarios before starting
- **Single skill focus**: Practice one communication skill per session
- **Regular breaks**: Take 5-10 minute breaks between scenarios

**Scenario Selection**:
- **Appropriate difficulty**: Choose scenarios matching current skill level
- **Familiar contexts**: Start with contexts you know well
- **Progressive challenge**: Gradually increase complexity
- **Quality over quantity**: Better to do fewer scenarios well

#### Multi-User Optimization
**Classroom/Group Settings**:
- **Stagger sessions**: Don't have all users start simultaneously
- **Local services preferred**: Reduce network load with local AI/STT/TTS
- **Shared resources**: Use one powerful computer for AI, others for practice
- **Session scheduling**: Distribute practice times throughout day

### Resource Management

#### Memory Management
**During Practice**:
- **Close background apps**: Shut down unnecessary programs
- **One scenario at a time**: Don't load multiple scenarios simultaneously
- **Regular saves**: Save progress frequently to prevent data loss
- **Monitor usage**: Keep Task Manager/Activity Monitor open to watch resources

**Between Sessions**:
- **Restart services**: Restart AI/STT/TTS services periodically
- **Clear temporary files**: Clean system temporary directories
- **Update software**: Keep Talk Buddy and services updated
- **System maintenance**: Run disk cleanup and system optimization tools

#### Network Optimization
**Online Services**:
- **Stable connection**: Use wired internet when possible
- **Bandwidth management**: Pause other network-intensive applications
- **Service selection**: Choose geographically closer servers when available
- **Fallback planning**: Configure local services as backup

**Mixed Environment**:
- **Hybrid setup**: Use local AI with online STT/TTS or vice versa
- **Service switching**: Switch to local services during peak network times
- **Connection monitoring**: Check connection quality before practice sessions

## Advanced Performance Tuning

### Hardware Acceleration

#### GPU Acceleration
**NVIDIA GPU Setup**:
```bash
# Check CUDA availability
nvidia-smi

# Configure Ollama for GPU
export OLLAMA_GPU=1
ollama serve

# Verify GPU usage
nvidia-smi  # Should show GPU memory usage during AI inference
```

**AMD GPU Setup**:
```bash
# ROCm support (Linux)
export HSA_OVERRIDE_GFX_VERSION=10.3.0
export OLLAMA_GPU=1

# Verify GPU detection
rocm-smi
```

#### CPU Optimization
**Multi-core Usage**:
```bash
# Linux: Set CPU governor to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Monitor CPU usage per core
htop  # or top on macOS/Linux
```

### Storage Optimization

#### SSD Configuration
**Windows SSD Optimization**:
- **TRIM enabled**: Ensure SSD TRIM is enabled
- **Disable indexing**: Turn off Windows Search indexing for Talk Buddy directories
- **Page file**: Move page file to different drive if possible

**macOS SSD Optimization**:
- **TRIM support**: Enable TRIM for third-party SSDs if needed
- **Spotlight indexing**: Exclude Talk Buddy directories from Spotlight
- **File system**: Use APFS for optimal performance

**Linux SSD Optimization**:
```bash
# Check SSD optimization
sudo hdparm -I /dev/sda | grep TRIM  # Verify TRIM support

# Optimize mount options
# Add 'noatime' to /etc/fstab for Talk Buddy partition
```

### Network Performance

#### Connection Optimization
**Quality of Service (QoS)**:
- **Router configuration**: Prioritize Talk Buddy traffic
- **Bandwidth allocation**: Reserve minimum bandwidth for practice
- **Network monitoring**: Use tools to monitor network performance

**DNS Optimization**:
```bash
# Use fast DNS servers
# Google DNS: 8.8.8.8, 8.8.4.4
# Cloudflare DNS: 1.1.1.1, 1.0.0.1

# Test DNS performance
nslookup api.openai.com 8.8.8.8
```

## Performance Monitoring

### System Monitoring Tools

#### Windows Monitoring
```powershell
# Task Manager for real-time monitoring
taskmgr

# Performance Monitor for detailed analysis
perfmon

# Resource Monitor for detailed system analysis
resmon
```

#### macOS Monitoring
```bash
# Activity Monitor (GUI)
open /Applications/Utilities/Activity\ Monitor.app

# Command line monitoring
top -o cpu  # CPU usage
top -o mem  # Memory usage
```

#### Linux Monitoring
```bash
# Real-time system monitoring
htop        # Interactive process viewer
iotop       # Disk I/O monitoring
nethogs     # Network usage by process

# System statistics
iostat 1    # I/O statistics
vmstat 1    # Virtual memory statistics
```

### Performance Metrics

#### Target Performance Benchmarks
**Conversation Flow Timing**:
- **Speech recognition**: <2 seconds from speech end to text
- **AI response generation**: <5 seconds for typical responses
- **Voice synthesis**: <3 seconds for AI response audio
- **Total conversation turn**: <10 seconds end-to-end

**System Resource Usage**:
- **CPU usage**: <70% average during conversation
- **Memory usage**: <80% of available RAM
- **Disk usage**: <50% capacity for optimal performance
- **Network latency**: <100ms for online services

#### Performance Testing
**Conversation Stress Test**:
1. **Start conversation**: Begin practice scenario
2. **Continuous dialogue**: Speak immediately after each AI response
3. **Monitor metrics**: Watch CPU, memory, network usage
4. **Duration test**: Maintain conversation for 15+ minutes
5. **Quality assessment**: Note any degradation in response quality or speed

## Troubleshooting Performance Issues

### Common Performance Problems

#### Slow AI Responses
**Symptoms**: Long delays between user input and AI response
**Solutions**:
1. **Use smaller AI models**: Switch from 13B to 7B parameter models
2. **Reduce context window**: Lower OLLAMA_NUM_CTX setting
3. **Check system resources**: Ensure sufficient RAM and CPU available
4. **Restart AI service**: Stop and start Ollama to clear memory

#### Audio Latency
**Symptoms**: Delays between AI text generation and voice output
**Solutions**:
1. **Use faster TTS models**: Switch to "low" quality for speed
2. **Optimize audio buffer**: Reduce audio driver buffer size
3. **Check audio device**: Ensure no exclusive mode conflicts
4. **Local TTS preferred**: Use local instead of online TTS services

#### UI Responsiveness
**Symptoms**: Slow interface, delayed button clicks, freezing
**Solutions**:
1. **Close background applications**: Free system resources
2. **Reduce visual effects**: Disable animations and effects
3. **Restart Talk Buddy**: Clear application memory leaks
4. **Check disk space**: Ensure adequate free storage

#### Memory Issues
**Symptoms**: Out of memory errors, system slowdown
**Solutions**:
1. **Restart services regularly**: Clear accumulated memory usage
2. **Use appropriate models**: Choose models fitting available RAM
3. **Close other applications**: Free memory for Talk Buddy
4. **Add more RAM**: Hardware upgrade if consistently memory-constrained

---

## Quick Performance Checklist

### Before Each Practice Session
- [ ] **Close unnecessary applications** to free system resources
- [ ] **Check service status** - ensure all indicators are green
- [ ] **Test audio setup** - verify microphone and speakers work
- [ ] **Monitor system resources** - ensure adequate CPU/RAM available
- [ ] **Stable network connection** - check if using online services

### System Optimization
- [ ] **Use SSD storage** for Talk Buddy installation and data
- [ ] **Sufficient RAM** - 8GB+ recommended for local AI services
- [ ] **Updated drivers** - audio, graphics, and system drivers current
- [ ] **Local services preferred** - use local AI/STT/TTS when possible
- [ ] **Regular system maintenance** - keep OS and software updated

### Service Configuration
- [ ] **Appropriate AI model size** - balance quality and performance
- [ ] **Fast STT/TTS models** - prioritize speed for real-time conversation
- [ ] **GPU acceleration enabled** - use hardware acceleration when available
- [ ] **Optimized service settings** - tune for your system capabilities
- [ ] **Regular service restarts** - prevent memory accumulation

---

**Optimized Talk Buddy performance enables natural, flowing conversation practice. Take time to configure your system properly for the best learning experience! ⚡**

**Related Guides**: 
- **[Connection Issues](connection-issues.md)** - Fix connectivity problems
- **[Common Errors](common-errors.md)** - Resolve frequent issues
- **[AI Model Integration](../services/ai-model-integration.md)** - Optimize AI performance