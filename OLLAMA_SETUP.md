# Ollama Setup Guide for SarmayaGhar Chatbot

This guide will help you set up Ollama with Llama 3.1 8B to power the SarmayaGhar chatbot.

## Prerequisites

- Windows, macOS, or Linux
- At least 8GB RAM (16GB recommended)
- ~5GB free disk space for the model

## Installation Steps

### 1. Install Ollama

**Windows:**
- Download from: https://ollama.ai/download/windows
- Run the installer
- Ollama will start automatically

**macOS:**
- Download from: https://ollama.ai/download/mac
- Run the installer
- Or use Homebrew: `brew install ollama`

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Download Llama 3.1 8B Model

Open your terminal/command prompt and run:

```bash
ollama pull llama3.1:8b
```

This will download approximately 4.7GB. The download may take a few minutes depending on your internet speed.

### 3. Verify Installation

Test that Ollama is working:

```bash
ollama run llama3.1:8b
```

Type a test message and press Enter. If you see a response, Ollama is working correctly!

### 4. Start Ollama Server

Ollama runs as a local server on `http://localhost:11434`. It should start automatically after installation.

**Check if it's running:**
```bash
# Windows PowerShell
Invoke-WebRequest -Uri http://localhost:11434/api/tags

# macOS/Linux
curl http://localhost:11434/api/tags
```

If you see a JSON response with model information, Ollama is running correctly.

### 5. Configure Environment Variables (Optional)

You can customize the Ollama configuration in your `.env` file:

```env
# Ollama Configuration (Optional - defaults shown)
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1:8b
```

**Default values:**
- `OLLAMA_BASE_URL`: `http://localhost:11434/v1`
- `OLLAMA_MODEL`: `llama3.1:8b`

### 6. Start Your Application

```bash
npm run dev
```

The chatbot should now use Llama 3.1 8B instead of OpenAI!

## Troubleshooting

### Ollama Not Starting

**Windows:**
- Check if Ollama service is running in Task Manager
- Restart Ollama: Press Win+R, type `services.msc`, find "Ollama" and restart it

**macOS/Linux:**
```bash
ollama serve
```

### Model Not Found

If you get an error about the model not being found:

```bash
# List available models
ollama list

# Pull the model again
ollama pull llama3.1:8b
```

### Connection Refused

If you see "connection refused" errors:

1. Make sure Ollama is running
2. Check the port: `http://localhost:11434`
3. Try restarting Ollama

### Slow Responses

- **CPU only**: Responses may be slower (5-15 seconds)
- **GPU acceleration**: Much faster (1-3 seconds)
  - NVIDIA GPU: Install CUDA drivers
  - Apple Silicon: Works automatically
  - AMD GPU: Install ROCm drivers

### Out of Memory

If you get memory errors:

1. Try a smaller model: `ollama pull llama3.1:8b-instruct-q4_0` (quantized, ~2.5GB)
2. Close other applications
3. Add more RAM

## Alternative Models

If you want to try different models:

```bash
# Mistral 7B (Smaller, faster)
ollama pull mistral:7b

# Llama 3.1 70B (Larger, better quality - requires 40GB+ RAM)
ollama pull llama3.1:70b

# Qwen 2.5 7B (Good multilingual support)
ollama pull qwen2.5:7b
```

Then update your `.env`:
```env
OLLAMA_MODEL=mistral:7b
```

## Performance Tips

1. **Use GPU if available**: Much faster inference
2. **Quantized models**: Use `q4_0` or `q8_0` versions for smaller memory footprint
3. **Batch requests**: Ollama handles multiple requests efficiently
4. **Local network**: If deploying on a server, access via `http://server-ip:11434`

## Security Note

Ollama runs locally on your machine. No API keys or external services are required. All data stays on your machine.

## Support

- Ollama Documentation: https://ollama.ai/docs
- Llama 3.1 Model Card: https://llama.meta.com/llama3.1/
- Issues: Check server logs for detailed error messages

---

**Enjoy your free, local, privacy-focused AI chatbot! 🚀**






