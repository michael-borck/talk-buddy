# Ollama Setup for TalkBuddy

This guide explains how to set up Ollama for use with TalkBuddy's AI conversation features.

## Quick Setup

Run the automated setup script:

```bash
cd server
./ollama-setup.sh
```

This script will:
1. Install Ollama (Linux only, macOS users need to install manually)
2. Start the Ollama service
3. Download the llama3.2 model
4. Test the installation

## Manual Setup

### 1. Install Ollama

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
Download from [https://ollama.com/download](https://ollama.com/download)

**Windows:**
Download from [https://ollama.com/download](https://ollama.com/download)

### 2. Start Ollama Service

**Linux:**
```bash
sudo systemctl start ollama
sudo systemctl enable ollama
```

**macOS/Windows:**
Ollama runs as an application - just start it normally.

### 3. Download Model

```bash
ollama pull llama3.2
```

### 4. Test Installation

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "Hello!",
  "stream": false
}'
```

## CORS Configuration

Ollama doesn't support CORS headers by default. For browser-based applications like TalkBuddy, you have two options:

### Option 1: Use the Proxy (Recommended)

TalkBuddy includes a Python proxy server that adds CORS headers:

```bash
cd server
python3 ollama-proxy.py
```

This runs on port 38993 and forwards requests to Ollama with proper CORS headers.

### Option 2: Run Ollama with CORS

Set environment variables before starting Ollama:

```bash
OLLAMA_ORIGINS="*" OLLAMA_HOST="0.0.0.0:11434" ollama serve
```

**Note:** This allows access from any origin, which may be a security concern in production.

## Production Deployment

For production use:

1. **Use HTTPS:** Set up Nginx or another reverse proxy with SSL certificates
2. **Authentication:** Add API key authentication if needed
3. **Resource Limits:** Configure memory and CPU limits for the Ollama service
4. **Model Selection:** Consider model size vs performance (llama3.2 is a good balance)

## Available Models

You can use any Ollama model with TalkBuddy. Popular options:

- `llama3.2` - Good balance of performance and quality (default)
- `llama3.1` - Larger, more capable model
- `mistral` - Fast and efficient
- `phi3` - Small model, good for resource-constrained environments

To use a different model:
1. Pull it: `ollama pull model-name`
2. Update the client's .env file: `VITE_OLLAMA_MODEL=model-name`

## Troubleshooting

### Ollama service not starting
```bash
# Check service status
sudo systemctl status ollama

# View logs
journalctl -u ollama -f
```

### Model download fails
- Check disk space: Models can be several GB
- Check internet connection
- Try a smaller model first

### CORS errors in browser
- Ensure ollama-proxy.py is running
- Check the proxy URL in client .env file
- Verify firewall settings

### Performance issues
- Check available RAM (4GB minimum recommended)
- Consider using a smaller model
- Adjust max_tokens in the client configuration

## Resource Requirements

- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 5-10GB per model
- **CPU:** Any modern CPU, GPU acceleration optional but helpful