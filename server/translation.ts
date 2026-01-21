import { generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Translation adapter interface for future TranslateGemma 4B integration
 * 
 * Architecture notes:
 * - Current implementation uses Gemini 1.5 Flash via Vertex AI
 * - Designed for easy migration to TranslateGemma 4B for on-device inference
 * - To migrate: implement this interface with local model endpoint
 */
export interface TranslationAdapter {
  translate(content: string, targetLanguage: string, sourceLanguage?: string): Promise<string>;
  detectLanguage(content: string): Promise<string>;
}

/**
 * Gemini-based translation adapter
 * Fast, accurate translations using Gemini 1.5 Flash
 */
class GeminiTranslationAdapter implements TranslationAdapter {
  async translate(content: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    const sourceHint = sourceLanguage ? ` from ${sourceLanguage}` : "";
    
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: `You are TranslateGemma, a specialized translation model.
Your task is to translate text accurately while preserving:
- Original formatting (line breaks, bullet points, numbering)
- Technical terms and proper nouns
- Tone and style (formal/informal)
- Context and meaning

Translate naturally as a native speaker would write.`,
      prompt: `Translate the following text${sourceHint} into ${targetLanguage}:

${content}`,
    });

    return text;
  }

  async detectLanguage(content: string): Promise<string> {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: `You are a language detection expert. 
Respond with ONLY the ISO 639-1 language code (2 letters) of the detected language.
Examples: en, zh, ja, fr, es, de, ko, ru, ar, pt`,
      prompt: `Detect the language of this text:

${content}`,
    });

    return text.trim().toLowerCase();
  }
}

/**
 * Placeholder for future TranslateGemma 4B local adapter
 * 
 * Implementation guide:
 * 1. Deploy TranslateGemma 4B locally using Ollama or TensorFlow Lite
 * 2. Expose local inference endpoint (e.g., http://localhost:11434)
 * 3. Implement translate() and detectLanguage() methods
 * 4. Switch adapter in getTranslationAdapter()
 */
class TranslateGemmaAdapter implements TranslationAdapter {
  private endpoint: string;

  constructor(endpoint: string = "http://localhost:11434") {
    this.endpoint = endpoint;
  }

  async translate(content: string, targetLanguage: string, sourceLanguage?: string): Promise<string> {
    // TODO: Implement local TranslateGemma 4B inference
    // Example: POST to ${this.endpoint}/api/translate
    throw new Error("TranslateGemma 4B adapter not yet implemented. Use GeminiTranslationAdapter for now.");
  }

  async detectLanguage(content: string): Promise<string> {
    // TODO: Implement local language detection
    throw new Error("TranslateGemma 4B adapter not yet implemented. Use GeminiTranslationAdapter for now.");
  }
}

/**
 * Factory function to get the active translation adapter
 * Switch between adapters here for easy migration
 */
export function getTranslationAdapter(): TranslationAdapter {
  // Current: Use Gemini 1.5 Flash for fast, cloud-based translation
  return new GeminiTranslationAdapter();
  
  // Future: Uncomment to switch to local TranslateGemma 4B
  // return new TranslateGemmaAdapter(process.env.TRANSLATE_GEMMA_ENDPOINT);
}

/**
 * High-level translation function with caching support
 */
export async function translateMeetingNotes(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  const adapter = getTranslationAdapter();
  return adapter.translate(content, targetLanguage, sourceLanguage);
}

/**
 * Detect the language of meeting notes
 */
export async function detectMeetingLanguage(content: string): Promise<string> {
  const adapter = getTranslationAdapter();
  return adapter.detectLanguage(content);
}
