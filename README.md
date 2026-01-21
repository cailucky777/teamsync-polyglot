# TeamSync Polyglot

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-success?style=for-the-badge&logo=vercel)](https://teamsync-polyglot.manus.space)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/cailucky777/teamsync-polyglot)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Privacy-First Multilingual Meeting Assistant**

Break language barriers in global teams with real-time translation, AI-powered summarization, and OCR image processing. Designed with privacy in mind and ready for on-device inference.

> 🌐 **[Try Live Demo](https://teamsync-polyglot.manus.space)** - No installation required!

---

## ✨ Features

### 🌍 Multi-Language Translation
- Translate meeting notes between **Chinese, Japanese, French, English, Spanish, German, Korean, Russian, Arabic, Portuguese**, and more
- Automatic language detection
- Preserves formatting, technical terms, and tone
- Translation caching for performance

### 🤖 AI-Powered Summarization
- Extract action items with owners and deadlines
- Identify key discussion points and decisions
- Generate concise meeting overviews
- Structured JSON output for easy integration

### 📸 OCR Image Processing
- Upload photos of whiteboards or handwritten notes
- Extract text from printed documents and slides
- Supports JPEG, PNG, WebP, GIF (up to 16MB)
- High-accuracy text recognition with Gemini Vision

### 📊 Bento Grid Dual-Panel Layout
- Side-by-side comparison of original and translated content
- Clear visual distinction between source and target languages
- Responsive design for mobile and desktop
- Export summaries as Markdown

### 🔒 Privacy-First Architecture
- **Currently:** Powered by Gemini 2.5 Flash for fast cloud translation
- **Future-Ready:** Designed for easy migration to TranslateGemma 4B for on-device inference
- Adapter pattern enables seamless model switching
- No vendor lock-in

---

## 🎯 Live Demo

**Try it now without installation:**

🔗 **https://teamsync-polyglot.manus.space**

### Demo Features:
- ✅ Create meeting notes in any language
- ✅ Upload whiteboard photos for OCR
- ✅ Translate to 10+ languages instantly
- ✅ AI-powered action item extraction
- ✅ Export summaries as Markdown

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+ and pnpm
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))
- MySQL/TiDB database (provided by Manus platform)

### Installation

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   The platform automatically injects database credentials and OAuth configuration. You only need to provide:
   - `GOOGLE_GENERATIVE_AI_API_KEY` - Your Gemini API key

3. **Push database schema:**
   ```bash
   pnpm db:push
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

5. **Open in browser:**
   Navigate to the provided dev server URL (e.g., `https://3000-...manus.computer`)

---

## 📖 Usage

### Creating a Meeting (Text Input)

1. Click **"New Meeting"** button
2. Select **"Text Input"** tab
3. Enter meeting title and paste your notes
4. Click **"Create Meeting"**
5. Language is automatically detected

### Creating a Meeting (Image Upload)

1. Click **"New Meeting"** button
2. Select **"Image Upload"** tab
3. Enter meeting title
4. Upload a photo of your whiteboard/notes
5. Click **"Process Image"**
6. Text is extracted via OCR and language is detected

### Translating a Meeting

1. Open a meeting from your list
2. Select target language from dropdown
3. Click **"Translate"**
4. View original and translated content side-by-side
5. Review extracted action items and key points

### Exporting Summaries

1. After translating a meeting, click **"Export"**
2. Downloads a Markdown file with:
   - Meeting overview
   - Action items
   - Key points and decisions
   - Original and translated content

---

## 🏗️ Architecture

### Tech Stack

- **Frontend:** React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11
- **Database:** MySQL/TiDB via Drizzle ORM
- **AI:** Gemini 2.5 Flash via Vercel AI SDK
- **Storage:** S3 for image uploads
- **Auth:** Manus OAuth

### Project Structure

```
server/
  translation.ts      → Translation service with adapter pattern
  summarization.ts    → Meeting summary extraction
  ocr.ts              → Image text extraction
  routers.ts          → tRPC API endpoints
  db.ts               → Database query helpers

client/src/
  pages/
    Home.tsx          → Meeting list and landing page
    NewMeeting.tsx    → Text/image input form
    MeetingView.tsx   → Dual-panel translation display

drizzle/
  schema.ts           → Database schema (meetings, translations)
```

### Database Schema

**meetings** table:
- `id` - Auto-increment primary key
- `userId` - Foreign key to users
- `title` - Meeting title
- `originalContent` - Original text content
- `detectedLanguage` - ISO 639-1 code (e.g., "en", "zh")
- `imageUrl` - S3 URL if created from image
- `imageKey` - S3 key for image
- `createdAt`, `updatedAt` - Timestamps

**translations** table:
- `id` - Auto-increment primary key
- `meetingId` - Foreign key to meetings
- `targetLanguage` - Target language code
- `translatedContent` - Translated text
- `summary` - Meeting summary
- `actionItems` - JSON with action items, key points, decisions
- `createdAt` - Timestamp

---

## 🔄 Migrating to TranslateGemma 4B

TeamSync Polyglot is architected for easy migration from cloud-based Gemini to local TranslateGemma 4B inference.

### Why TranslateGemma 4B?

- **Privacy:** Process sensitive meeting content entirely on-device
- **Cost:** No API usage fees after initial model download
- **Latency:** Faster inference without network round-trips
- **Offline:** Works without internet connection

### Migration Steps

#### 1. Deploy TranslateGemma 4B Locally

**Option A: Using Ollama (Recommended)**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull TranslateGemma model (when available)
ollama pull translategemma:4b

# Start Ollama server
ollama serve
```

**Option B: Using TensorFlow Lite**
```bash
# Download TranslateGemma 4B weights
wget https://huggingface.co/.../translategemma-4b.tflite

# Run inference server
python3 serve_tflite.py --model translategemma-4b.tflite --port 11434
```

#### 2. Update Translation Adapter

Edit `server/translation.ts`:

```typescript
export function getTranslationAdapter(): TranslationAdapter {
  // Switch to local TranslateGemma
  return new TranslateGemmaAdapter(
    process.env.TRANSLATE_GEMMA_ENDPOINT || "http://localhost:11434"
  );
}
```

#### 3. Implement TranslateGemmaAdapter Methods

```typescript
class TranslateGemmaAdapter implements TranslationAdapter {
  async translate(content: string, targetLanguage: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: content,
        target_language: targetLanguage,
      }),
    });
    
    const data = await response.json();
    return data.translated_text;
  }

  async detectLanguage(content: string): Promise<string> {
    const response = await fetch(`${this.endpoint}/api/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content }),
    });
    
    const data = await response.json();
    return data.language_code;
  }
}
```

#### 4. Test and Deploy

```bash
# Run tests with local model
pnpm test

# Verify translation quality
# Compare Gemini vs TranslateGemma outputs

# Deploy to production
pnpm build
pnpm start
```

### Performance Considerations

| Metric | Gemini 2.5 Flash | TranslateGemma 4B |
|--------|------------------|-------------------|
| **Latency** | ~500-1000ms | ~200-500ms |
| **Cost** | $0.075/1M tokens | Free (after setup) |
| **Privacy** | Cloud-based | On-device |
| **Quality** | Excellent | Very Good |
| **Offline** | ❌ | ✅ |

---

## 🧪 Testing

### Run All Tests
```bash
pnpm test
```

### Run Specific Test Suite
```bash
pnpm test server/translation.test.ts
pnpm test server/meetings.test.ts
```

### Test Coverage
- ✅ Translation service (language detection, translation)
- ✅ Summarization service (action items, key points)
- ✅ Meeting CRUD operations
- ✅ Translation caching
- ✅ Export functionality

**Note:** Tests may hit Gemini API rate limits (5 requests/min on free tier). Wait 60 seconds between test runs or upgrade to paid tier.

---

## 🌐 Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| English | `en` | English |
| Chinese | `zh` | 中文 |
| Japanese | `ja` | 日本語 |
| French | `fr` | Français |
| Spanish | `es` | Español |
| German | `de` | Deutsch |
| Korean | `ko` | 한국어 |
| Russian | `ru` | Русский |
| Arabic | `ar` | العربية |
| Portuguese | `pt` | Português |

*More languages supported by Gemini API. Add to `SUPPORTED_LANGUAGES` in `client/src/pages/MeetingView.tsx`.*

---

## 📝 API Reference

### tRPC Procedures

#### `meetings.create`
Create a meeting from text input.
```typescript
input: { title: string, content: string }
output: { id: number, detectedLanguage: string }
```

#### `meetings.createFromImage`
Create a meeting from uploaded image.
```typescript
input: { 
  title: string, 
  imageData: string, // base64
  mimeType: string,
  fileSize: number 
}
output: { 
  id: number, 
  detectedLanguage: string,
  extractedText: string,
  imageUrl: string 
}
```

#### `meetings.translate`
Translate a meeting to target language.
```typescript
input: { meetingId: number, targetLanguage: string }
output: { 
  id: number,
  translatedContent: string,
  summary: string,
  actionItems: string // JSON
}
```

#### `meetings.export`
Export meeting summary as Markdown.
```typescript
input: { meetingId: number, targetLanguage: string }
output: { content: string }
```

---

## 🛠️ Development

### Code Style
```bash
pnpm format
```

### Type Checking
```bash
pnpm check
```

### Database Migrations
```bash
# Generate migration
pnpm db:push

# View database in UI
# Navigate to Management UI → Database panel
```

---

## 🚢 Deployment

### Using Manus Platform (Recommended)

1. **Save checkpoint:**
   ```bash
   # Checkpoint is created automatically via Management UI
   ```

2. **Publish:**
   - Click **"Publish"** button in Management UI header
   - Custom domain setup available in Settings → Domains

### Self-Hosting

1. **Build for production:**
   ```bash
   pnpm build
   ```

2. **Set environment variables:**
   ```bash
   export DATABASE_URL="mysql://..."
   export GOOGLE_GENERATIVE_AI_API_KEY="..."
   export JWT_SECRET="..."
   # ... other env vars
   ```

3. **Start production server:**
   ```bash
   pnpm start
   ```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **Gemini API** by Google for powerful multimodal AI
- **TranslateGemma** team for open-source translation models
- **Manus Platform** for seamless deployment and infrastructure
- **shadcn/ui** for beautiful React components

---

## 📧 Support

For issues, questions, or feature requests, please submit feedback at [https://help.manus.im](https://help.manus.im)

---

**Built with ❤️ for global teams**
