# AI Model Integration

Configure AI conversation models to power realistic dialogue scenarios in ChatterBox. This guide covers setting up both local and online AI services for natural conversation practice.

## Understanding AI Integration

### Role of AI in ChatterBox
AI models provide the conversational intelligence that makes practice scenarios engaging:
- **Character simulation**: AI plays roles like interviewers, customers, colleagues
- **Natural responses**: Contextual replies that feel realistic and human-like  
- **Adaptive behavior**: AI adjusts to your responses and conversation flow
- **Scenario consistency**: Maintains character and context throughout practice

### Configurable Prompt System

#### How Prompts Control AI Behavior
Each ChatterBox scenario includes a **system prompt** that defines exactly how the AI should behave:

**Purpose**: System prompts are instructions that tell the AI:
- What role to play (interviewer, customer, colleague, etc.)
- How to respond (professional, casual, challenging, supportive)
- What context to maintain (job interview, product return, presentation feedback)
- What goals to pursue (test communication skills, provide realistic interaction)

**Implementation**: The system prompt is sent to the AI model before every conversation, establishing the "character" and context.

#### Example System Prompts

**Job Interview Scenario**:
```
You are an experienced hiring manager conducting a job interview for a Marketing Manager position. Ask relevant questions about the candidate's experience, skills, and fit for the role. Be professional but friendly. Follow up on their answers with deeper questions. If they give good answers, acknowledge it. If they need to elaborate, guide them gently.
```

**Customer Service Scenario**:
```
You are a customer calling about a product return. You bought a laptop online but it arrived damaged. You're frustrated but not unreasonable. Explain your situation clearly, provide details when asked, and work with the representative to find a solution. Stay in character as someone who needs help.
```

**Presentation Practice**:
```
You are an audience member at a business presentation. Ask thoughtful questions about the topic being presented. Challenge ideas constructively, ask for clarification on complex points, and engage as an intelligent, interested listener would.
```

#### Benefits of Configurable Prompts

**Realistic Practice**:
- AI behaves consistently within the scenario context
- Responses feel authentic to the situation
- Interactions match real-world expectations

**Customizable Difficulty**:
- Supportive prompts for beginners ("be encouraging and patient")
- Challenging prompts for advanced users ("ask tough questions")
- Context-specific behaviors (formal vs. casual situations)

**Scenario Variety**:
- Same AI model can play vastly different roles
- Infinite scenario possibilities through prompt customization
- Easy creation of specialized practice situations

#### Creating Effective System Prompts

**Best Practices**:
1. **Be specific about the role**: "You are a [specific job title/role]"
2. **Set clear context**: Explain the situation and setting
3. **Define personality**: Professional, friendly, challenging, etc.
4. **Give interaction guidelines**: How to respond, what to focus on
5. **Set boundaries**: What the AI should and shouldn't do

**Prompt Structure Example**:
```
[ROLE] You are a [specific character/position]
[CONTEXT] In [situation/setting]
[PERSONALITY] Be [personality traits]
[GOALS] Focus on [conversation objectives]
[GUIDELINES] [Specific behaviors or restrictions]
```

### AI Service Types

#### Local AI Models (Recommended)
**Self-hosted on your computer**:
- **Complete privacy**: No data sent to external servers
- **Offline capability**: Practice without internet connection
- **No usage limits**: Unlimited conversations
- **Cost-effective**: No per-use charges
- **Example**: Ollama with Llama 2, Code Llama, Mistral

#### Online AI Services  
**Cloud-based AI providers**:
- **Easy setup**: Often pre-configured and ready to use
- **High performance**: Access to powerful, latest models
- **Multiple options**: Various providers and model types
- **Potential costs**: May have usage limits or charges
- **Example**: OpenAI GPT, Anthropic Claude, Cohere

## Quick Start (Default Configuration)

### Check Current AI Status
1. **Look at status footer**: "Chat" indicator shows AI service status
2. **Green (●)**: AI service is connected and ready
3. **Red (●)**: Connection issues need troubleshooting
4. **Gray (○)**: Service not configured or unknown status

### Test AI Connection
1. **Go to Settings**: Click "Settings" in ChatterBox sidebar
2. **Find AI/Chat section**: Look for AI model configuration
3. **Test connection**: Click "Test AI" or similar button
4. **Verify response**: AI should provide a test response
5. **Try a scenario**: Start a practice conversation to confirm functionality

## Local AI Setup (Ollama - Recommended)

### Why Choose Local AI?
**Privacy advantages**:
- Your practice conversations never leave your computer
- No external servers processing sensitive content
- Complete control over data handling

**Performance benefits**:
- Faster response times (no network latency)
- Consistent availability regardless of internet
- Unlimited usage without quotas

**Cost benefits**:
- No ongoing subscription or usage fees
- One-time setup with free, open-source models

### Installing Ollama

#### System Requirements
- **RAM**: 8GB minimum, 16GB recommended for larger models
- **Storage**: 5-50GB depending on models (4GB typical per model)
- **CPU**: Modern processor (last 5 years recommended)
- **Optional GPU**: NVIDIA GPU with CUDA for faster processing

#### Installation Process

**Windows Installation**
1. **Download Ollama**: Visit [ollama.ai](https://ollama.ai)
2. **Run installer**: Download and execute the Windows installer
3. **Follow setup wizard**: Accept defaults for typical installation
4. **Verify installation**: Open Command Prompt and run `ollama --version`

**macOS Installation**
1. **Download from website**: Get macOS installer from [ollama.ai](https://ollama.ai)
2. **Install application**: Drag to Applications folder
3. **Run Ollama**: Launch from Applications or Spotlight
4. **Verify installation**: Open Terminal and run `ollama --version`

**Linux Installation**
```bash
# Download and install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Verify installation
ollama --version

# Start Ollama service
ollama serve
```

### Setting Up AI Models

#### Recommended Models for ChatterBox

**Llama 2 (7B) - Best for beginners**
```bash
# Install Llama 2 7B model (good balance of quality and speed)
ollama pull llama2

# Alternative: Smaller, faster model
ollama pull llama2:7b-chat
```

**Mistral (7B) - Good general performance**
```bash
# Install Mistral 7B (excellent for conversation)
ollama pull mistral

# Alternative: Larger, more capable version
ollama pull mistral:latest
```

**Code Llama - For technical scenarios**
```bash
# Install Code Llama (good for technical conversations)
ollama pull codellama

# Smaller version for faster responses
ollama pull codellama:7b
```

#### Model Selection Guide

**For General Conversation Practice**:
- **Llama 2 7B**: Balanced performance, widely compatible
- **Mistral 7B**: Excellent reasoning, good for complex scenarios

**For Professional/Business Scenarios**:
- **Llama 2 13B**: Higher quality responses, requires more RAM
- **Mistral 7B**: Strong professional communication capabilities

**For Technical/Educational Content**:
- **Code Llama**: Specialized for technical discussions
- **Llama 2 13B**: Better handling of complex, specialized topics

**For Low-Resource Systems**:
- **Llama 2 7B**: Minimal RAM requirements
- **TinyLlama**: Very small model, basic conversations only

### Configuring ChatterBox for Ollama

#### Update AI Service Settings
1. **Open ChatterBox Settings**
2. **Find AI/LLM service configuration**
3. **Set service URL**: `http://localhost:11434`
4. **Set model name**: Enter the model you installed (e.g., "llama2", "mistral")
5. **Save settings**

#### Test Ollama Integration
1. **Click "Test AI"** in settings
2. **Verify connection**: Should show successful connection
3. **Check response quality**: AI should provide coherent test response
4. **Try conversation**: Start a practice scenario to test full integration

### Advanced Ollama Configuration

#### Custom Model Parameters
Create `Modelfile` for custom behavior:
```
FROM llama2

# Set temperature (creativity level: 0.1 = focused, 0.9 = creative)
PARAMETER temperature 0.7

# Set system message for ChatterBox scenarios
SYSTEM You are a helpful conversation partner who stays in character for practice scenarios. Provide natural, contextual responses that help the user practice their communication skills.
```

Apply custom configuration:
```bash
# Create custom model
ollama create chatterbox -f Modelfile

# Use in ChatterBox
# Set model name to "chatterbox" in settings
```

#### Performance Optimization
```bash
# Use GPU acceleration (if available)
OLLAMA_GPU=1 ollama serve

# Adjust context window
OLLAMA_NUM_CTX=4096 ollama serve

# Set memory allocation
OLLAMA_NUM_KEEP=5 ollama serve
```

## Online AI Services

### When to Use Online Services
- **Testing ChatterBox**: Quick setup for evaluation
- **High-performance needs**: Access to latest, most capable models
- **Limited local hardware**: Insufficient RAM/CPU for local models
- **Specialized capabilities**: Specific model features not available locally

### Supported Online Services

#### OpenAI Integration
**Setup process**:
1. **Get API key**: Create account at [openai.com](https://openai.com)
2. **Configure ChatterBox**: Enter API endpoint and key in settings
3. **Select model**: Choose GPT-3.5-turbo or GPT-4
4. **Test connection**: Verify API access works

**Recommended models**:
- **GPT-3.5-turbo**: Good balance of performance and cost
- **GPT-4**: Highest quality, higher cost per usage

#### Other Compatible Services
ChatterBox supports OpenAI-compatible APIs:
- **Anthropic Claude**: Via compatible proxies
- **Cohere**: Command models via API
- **Local inference servers**: Text Generation WebUI, FastChat

### API Configuration

#### Service URL Setup
```
# OpenAI
URL: https://api.openai.com/v1
Model: gpt-3.5-turbo

# Local inference server (example)
URL: http://localhost:5000/v1
Model: local-model-name
```

#### API Key Management
- **Secure storage**: ChatterBox stores API keys securely
- **Key rotation**: Change keys regularly for security
- **Usage monitoring**: Track API usage to manage costs
- **Key permissions**: Use least-privilege API keys

## Model Comparison and Selection

### Performance Characteristics

| Model | RAM Required | Speed | Quality | Best For |
|-------|-------------|-------|---------|----------|
| **Llama 2 7B** | 8GB | Fast | Good | General conversation |
| **Llama 2 13B** | 16GB | Medium | Excellent | Professional scenarios |
| **Mistral 7B** | 8GB | Fast | Excellent | Business communication |
| **Code Llama** | 8GB | Fast | Good | Technical discussions |
| **GPT-3.5-turbo** | N/A (online) | Fast | Excellent | All scenarios |
| **GPT-4** | N/A (online) | Slower | Outstanding | Complex scenarios |

### Choosing the Right Model

#### For Educational Use
**Classroom/Student practice**:
- **Local models**: Better privacy, no ongoing costs
- **Recommended**: Llama 2 7B or Mistral 7B
- **Considerations**: School network compatibility, hardware availability

#### For Professional Development
**Corporate training and development**:
- **Local models strongly recommended**: Data privacy and security
- **Recommended**: Llama 2 13B or Mistral 7B
- **Considerations**: Company security policies, confidential content

#### For Personal Use
**Individual skill development**:
- **Start with**: Online services for testing
- **Upgrade to**: Local models for regular practice
- **Recommended**: Mistral 7B for balanced performance

## Troubleshooting AI Integration

### Common Issues

#### AI Service Not Responding
**Symptoms**: Red chat indicator, no AI responses in conversations
**Solutions**:
1. **Check service status**: Verify Ollama is running (`ollama list`)
2. **Test connectivity**: Use `curl http://localhost:11434/api/tags`
3. **Restart service**: Stop and start Ollama
4. **Check model availability**: Ensure selected model is installed

#### Poor Response Quality
**Symptoms**: Irrelevant responses, AI breaking character, repetitive answers
**Solutions**:
1. **Try different model**: Some models work better for specific scenarios
2. **Adjust temperature**: Lower for more focused, higher for more creative responses
3. **Improve prompts**: Better scenario system prompts improve AI behavior
4. **Check context**: Ensure AI has sufficient context window

#### Slow Response Times
**Symptoms**: Long delays between your input and AI response
**Solutions**:
1. **Use smaller models**: 7B models respond faster than 13B+
2. **Hardware optimization**: More RAM, SSD storage, GPU if available
3. **Reduce context**: Shorter conversations process faster
4. **Local vs online**: Local usually faster for responses

#### High Resource Usage
**Symptoms**: Computer slows down, high CPU/RAM usage during conversations
**Solutions**:
1. **Close other applications**: Free resources for AI processing
2. **Use smaller models**: Reduce memory requirements
3. **Adjust Ollama settings**: Lower concurrent model loading
4. **Hardware upgrade**: More RAM especially beneficial

### Advanced Troubleshooting

#### Ollama Diagnostics
```bash
# Check Ollama status
ollama ps

# View available models
ollama list

# Test model directly
ollama run llama2 "Hello, how are you?"

# Check system resources
ollama info
```

#### Network and Connectivity
```bash
# Test local Ollama API
curl http://localhost:11434/api/tags

# Test model generation
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Hello"
}'
```

#### Performance Monitoring
- **Task Manager/Activity Monitor**: Monitor CPU and RAM usage
- **Ollama logs**: Check for error messages or performance warnings  
- **ChatterBox logs**: Look for AI service connection issues
- **Network monitoring**: Check for API rate limiting (online services)

## Best Practices

### Model Management
- **Regular updates**: Keep Ollama and models updated
- **Model cleanup**: Remove unused models to save space
- **Testing**: Verify models work with ChatterBox after updates
- **Documentation**: Keep track of which models work best for your use cases

### Performance Optimization
- **Hardware matching**: Choose models appropriate for your system
- **Resource allocation**: Dedicate sufficient RAM and CPU to AI processing
- **Background processes**: Minimize other applications during practice
- **Storage**: Use SSD for faster model loading

### Security and Privacy
- **Local preference**: Use local models for sensitive practice content
- **API key security**: Protect and rotate online service API keys
- **Network isolation**: Consider isolating AI services on local network
- **Data handling**: Understand how each service processes and stores data

---

## Quick Setup Checklist

### Local AI (Ollama) - 30 minutes
- [ ] Download and install Ollama from [ollama.ai](https://ollama.ai)
- [ ] Install a conversation model: `ollama pull llama2`
- [ ] Verify model installation: `ollama list`
- [ ] Configure ChatterBox to use localhost:11434
- [ ] Set model name in ChatterBox settings
- [ ] Test AI connection and try a practice scenario

### Online AI (OpenAI) - 10 minutes
- [ ] Create account at [openai.com](https://openai.com)
- [ ] Generate API key
- [ ] Configure ChatterBox with OpenAI API endpoint
- [ ] Enter API key in ChatterBox settings
- [ ] Select model (gpt-3.5-turbo recommended)
- [ ] Test connection and try a practice scenario

### Troubleshooting - 15 minutes
- [ ] Check AI service status indicator (should be green)
- [ ] Verify model is properly installed/configured
- [ ] Test with simple scenarios first
- [ ] Monitor system resources during use
- [ ] Check logs for error messages if issues persist

---

**With proper AI integration, ChatterBox becomes a powerful conversation practice tool. Choose local models for privacy and unlimited practice, or online services for quick setup and latest capabilities! 🤖**

**Related Guides**: 
- **[STT Setup](stt-setup.md)** - Configure speech recognition
- **[TTS Setup](tts-setup.md)** - Set up voice synthesis  
- **[Connection Issues](../troubleshooting/connection-issues.md)** - Fix connectivity problems