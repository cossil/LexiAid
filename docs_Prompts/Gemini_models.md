# Gemini API Models Reference

> **Last Updated:** January 7, 2026  
> **API Version:** v1beta

## How to Retrieve the Full Model List

### API Endpoint

```
GET https://generativelanguage.googleapis.com/v1beta/models
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `pageSize` | integer | Max models per page (default: 50, max: 1000) |
| `pageToken` | string | Token for pagination from previous response |
| `key` | string | Your Gemini API key |

### cURL Command (PowerShell)

```powershell
# Using environment variable (PowerShell syntax)
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$env:GEMINI_API_KEY&pageSize=100"

# Or with the key directly
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY&pageSize=100"

# Save to file
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$env:GEMINI_API_KEY&pageSize=100" -o gemini_models.json
```

### cURL Command (Bash/Linux/macOS)

```bash
# Using environment variable
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY&pageSize=100"

# Save to file
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY&pageSize=100" -o gemini_models.json
```

### Python Example

```python
from google import genai

client = genai.Client()

# List models that support generateContent
print("List of models that support generateContent:\n")
for m in client.models.list():
    for action in m.supported_actions:
        if action == "generateContent":
            print(m.name)

# List models that support embedContent
print("List of models that support embedContent:\n")
for m in client.models.list():
    for action in m.supported_actions:
        if action == "embedContent":
            print(m.name)
```

### Response Structure

```json
{
  "models": [
    {
      "name": "models/gemini-2.5-flash",
      "version": "001",
      "displayName": "Gemini 2.5 Flash",
      "description": "...",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 65536,
      "supportedGenerationMethods": ["generateContent", "countTokens", ...],
      "temperature": 1,
      "topP": 0.95,
      "topK": 64,
      "maxTemperature": 2,
      "thinking": true
    }
  ],
  "nextPageToken": "..." // Only if more pages exist
}
```

---

## Available Models (as of January 2026)

### Gemini 3 Series (Preview)

| Model Name | Display Name | Input Tokens | Output Tokens | Thinking | Methods |
|------------|--------------|--------------|---------------|----------|---------|
| `models/gemini-3-pro-preview` | Gemini 3 Pro Preview | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-3-flash-preview` | Gemini 3 Flash Preview | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-3-pro-image-preview` | Nano Banana Pro | 131,072 | 32,768 | ✅ | generateContent, countTokens, batchGenerateContent |

### Gemini 2.5 Series (Stable)

| Model Name | Display Name | Input Tokens | Output Tokens | Thinking | Methods |
|------------|--------------|--------------|---------------|----------|---------|
| `models/gemini-2.5-pro` | Gemini 2.5 Pro | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.5-flash` | Gemini 2.5 Flash | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.5-flash-lite` | Gemini 2.5 Flash-Lite | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |

### Gemini 2.5 Series (Preview/Specialized)

| Model Name | Display Name | Input Tokens | Output Tokens | Thinking | Methods |
|------------|--------------|--------------|---------------|----------|---------|
| `models/gemini-2.5-flash-preview-09-2025` | Gemini 2.5 Flash Preview Sep 2025 | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.5-flash-lite-preview-09-2025` | Gemini 2.5 Flash-Lite Preview Sep 2025 | 1,048,576 | 65,536 | ✅ | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.5-flash-image-preview` | Nano Banana | 32,768 | 32,768 | ❌ | generateContent, countTokens, batchGenerateContent |
| `models/gemini-2.5-flash-image` | Nano Banana | 32,768 | 32,768 | ❌ | generateContent, countTokens, batchGenerateContent |
| `models/gemini-2.5-flash-preview-tts` | Gemini 2.5 Flash Preview TTS | 8,192 | 16,384 | ❌ | countTokens, generateContent |
| `models/gemini-2.5-pro-preview-tts` | Gemini 2.5 Pro Preview TTS | 8,192 | 16,384 | ❌ | countTokens, generateContent, batchGenerateContent |
| `models/gemini-2.5-computer-use-preview-10-2025` | Gemini 2.5 Computer Use Preview | 131,072 | 65,536 | ✅ | generateContent, countTokens |

### Gemini 2.5 Native Audio

| Model Name | Display Name | Input Tokens | Output Tokens | Methods |
|------------|--------------|--------------|---------------|---------|
| `models/gemini-2.5-flash-native-audio-latest` | Gemini 2.5 Flash Native Audio Latest | 131,072 | 8,192 | countTokens, bidiGenerateContent |
| `models/gemini-2.5-flash-native-audio-preview-09-2025` | Gemini 2.5 Flash Native Audio Preview 09-2025 | 131,072 | 8,192 | countTokens, bidiGenerateContent |
| `models/gemini-2.5-flash-native-audio-preview-12-2025` | Gemini 2.5 Flash Native Audio Preview 12-2025 | 131,072 | 8,192 | countTokens, bidiGenerateContent |

### Gemini 2.0 Series

| Model Name | Display Name | Input Tokens | Output Tokens | Methods |
|------------|--------------|--------------|---------------|---------|
| `models/gemini-2.0-flash` | Gemini 2.0 Flash | 1,048,576 | 8,192 | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.0-flash-001` | Gemini 2.0 Flash 001 | 1,048,576 | 8,192 | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.0-flash-exp` | Gemini 2.0 Flash Experimental | 1,048,576 | 8,192 | generateContent, countTokens, bidiGenerateContent |
| `models/gemini-2.0-flash-lite` | Gemini 2.0 Flash-Lite | 1,048,576 | 8,192 | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.0-flash-lite-001` | Gemini 2.0 Flash-Lite 001 | 1,048,576 | 8,192 | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.0-flash-lite-preview-02-05` | Gemini 2.0 Flash-Lite Preview 02-05 | 1,048,576 | 8,192 | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.0-flash-lite-preview` | Gemini 2.0 Flash-Lite Preview | 1,048,576 | 8,192 | generateContent, countTokens, createCachedContent, batchGenerateContent |
| `models/gemini-2.0-flash-exp-image-generation` | Gemini 2.0 Flash (Image Generation) Experimental | 1,048,576 | 8,192 | generateContent, countTokens, bidiGenerateContent |

### Alias Models (Latest Versions)

| Model Name | Display Name | Input Tokens | Output Tokens | Thinking |
|------------|--------------|--------------|---------------|----------|
| `models/gemini-flash-latest` | Gemini Flash Latest | 1,048,576 | 65,536 | ✅ |
| `models/gemini-flash-lite-latest` | Gemini Flash-Lite Latest | 1,048,576 | 65,536 | ✅ |
| `models/gemini-pro-latest` | Gemini Pro Latest | 1,048,576 | 65,536 | ✅ |

### Experimental/Legacy

| Model Name | Display Name | Input Tokens | Output Tokens | Thinking |
|------------|--------------|--------------|---------------|----------|
| `models/gemini-exp-1206` | Gemini Experimental 1206 | 1,048,576 | 65,536 | ✅ |

### Specialized Models

| Model Name | Display Name | Input Tokens | Output Tokens | Description |
|------------|--------------|--------------|---------------|-------------|
| `models/deep-research-pro-preview-12-2025` | Deep Research Pro Preview | 131,072 | 65,536 | Deep research capabilities |
| `models/gemini-robotics-er-1.5-preview` | Gemini Robotics-ER 1.5 Preview | 1,048,576 | 65,536 | Robotics model |
| `models/aqa` | Attributed Question Answering | 7,168 | 1,024 | Grounded Q&A with source attribution |

### Gemma Open Models

| Model Name | Display Name | Input Tokens | Output Tokens | Methods |
|------------|--------------|--------------|---------------|---------|
| `models/gemma-3-1b-it` | Gemma 3 1B | 32,768 | 8,192 | generateContent, countTokens |
| `models/gemma-3-4b-it` | Gemma 3 4B | 32,768 | 8,192 | generateContent, countTokens |
| `models/gemma-3-12b-it` | Gemma 3 12B | 32,768 | 8,192 | generateContent, countTokens |
| `models/gemma-3-27b-it` | Gemma 3 27B | 131,072 | 8,192 | generateContent, countTokens |
| `models/gemma-3n-e4b-it` | Gemma 3n E4B | 8,192 | 2,048 | generateContent, countTokens |
| `models/gemma-3n-e2b-it` | Gemma 3n E2B | 8,192 | 2,048 | generateContent, countTokens |

---

## Embedding Models

| Model Name | Display Name | Input Tokens | Methods |
|------------|--------------|--------------|---------|
| `models/gemini-embedding-001` | Gemini Embedding 001 | 2,048 | embedContent, countTextTokens, countTokens, asyncBatchEmbedContent |
| `models/gemini-embedding-exp` | Gemini Embedding Experimental | 8,192 | embedContent, countTextTokens, countTokens |
| `models/gemini-embedding-exp-03-07` | Gemini Embedding Experimental 03-07 | 8,192 | embedContent, countTextTokens, countTokens |
| `models/text-embedding-004` | Text Embedding 004 | 2,048 | embedContent |
| `models/embedding-001` | Embedding 001 | 2,048 | embedContent |
| `models/embedding-gecko-001` | Embedding Gecko | 1,024 | embedText, countTextTokens |

---

## Image Generation Models (Imagen)

| Model Name | Display Name | Description |
|------------|--------------|-------------|
| `models/imagen-4.0-generate-001` | Imagen 4 | Vertex served Imagen 4.0 model |
| `models/imagen-4.0-fast-generate-001` | Imagen 4 Fast | Vertex served Imagen 4.0 Fast model |
| `models/imagen-4.0-ultra-generate-001` | Imagen 4 Ultra | Vertex served Imagen 4.0 ultra model |
| `models/imagen-4.0-generate-preview-06-06` | Imagen 4 (Preview) | Vertex served Imagen 4.0 model |
| `models/imagen-4.0-ultra-generate-preview-06-06` | Imagen 4 Ultra (Preview) | Vertex served Imagen 4.0 ultra model |

---

## Video Generation Models (Veo)

| Model Name | Display Name | Description |
|------------|--------------|-------------|
| `models/veo-2.0-generate-001` | Veo 2 | Requires billing enabled on GCP |
| `models/veo-3.0-generate-001` | Veo 3 | Video generation |
| `models/veo-3.0-fast-generate-001` | Veo 3 fast | Fast video generation |
| `models/veo-3.1-generate-preview` | Veo 3.1 | Preview video generation |
| `models/veo-3.1-fast-generate-preview` | Veo 3.1 fast | Fast preview video generation |

---

## Supported Generation Methods

| Method | Description |
|--------|-------------|
| `generateContent` | Standard text/multimodal generation |
| `countTokens` | Count tokens in input |
| `createCachedContent` | Create cached content for reuse |
| `batchGenerateContent` | Batch processing of requests |
| `bidiGenerateContent` | Bidirectional streaming (real-time) |
| `embedContent` | Generate embeddings |
| `embedText` | Legacy text embedding |
| `countTextTokens` | Legacy token counting |
| `generateAnswer` | Attributed question answering |
| `predict` | Image generation (Imagen) |
| `predictLongRunning` | Video generation (Veo) |

---

## Model Selection Guide

### For Text Generation
- **Best Quality:** `gemini-2.5-pro` or `gemini-3-pro-preview`
- **Best Speed/Cost Balance:** `gemini-2.5-flash`
- **Fastest/Cheapest:** `gemini-2.5-flash-lite` or `gemini-2.0-flash-lite`

### For Long Context (1M+ tokens)
- `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.0-flash`

### For Embeddings
- **Recommended:** `gemini-embedding-001` (supports batch operations)
- **Experimental (larger context):** `gemini-embedding-exp` (8K tokens)

### For Image Generation
- **Best Quality:** `imagen-4.0-ultra-generate-001`
- **Fastest:** `imagen-4.0-fast-generate-001`

### For Video Generation
- **Latest:** `veo-3.1-generate-preview`
- **Stable:** `veo-3.0-generate-001`

---

## Notes

- **Thinking Models:** Models with `thinking: true` support extended reasoning capabilities
- **Token Limits:** Input/output token limits vary significantly between models
- **Caching:** Not all models support `createCachedContent`
- **Batch Processing:** Use `batchGenerateContent` for high-volume processing
- **Real-time:** Use `bidiGenerateContent` for streaming/real-time applications

---

## Raw JSON Response

The full JSON response is saved at: `c:\Ai\aitutor_37\gemini_models.json`
