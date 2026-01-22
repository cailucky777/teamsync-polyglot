/**
 * Reference Implementation: Ollama + TranslateGemma 4B Integration
 * 
 * This file provides a complete reference implementation for migrating
 * from cloud-based Gemini API to local TranslateGemma 4B using Ollama.
 * 
 * To use this implementation:
 * 1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
 * 2. Pull model: ollama pull translategemma:4b
 * 3. Install dependency: pnpm add ollama
 * 4. Set environment: TRANSLATION_MODE=local
 * 5. Replace server/translation.ts with this implementation
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import Ollama from 'ollama';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Translation mode: 'cloud' (Gemini API) or 'local' (Ollama + TranslateGemma)
 */
const TRANSLATION_MODE = process.env.TRANSLATION_MODE || 'cloud';

/**
 * Ollama server endpoint (default: localhost)
 */
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

/**
 * Enable automatic fallback to cloud API if local translation fails
 */
const ENABLE_CLOUD_FALLBACK = process.env.ENABLE_CLOUD_FALLBACK === 'true';

/**
 * TranslateGemma model variant (4b, 12b, or 27b)
 */
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'translategemma:4b';

/**
 * Maximum tokens for translation output
 */
const MAX_OUTPUT_TOKENS = 4096;

/**
 * Translation temperature (lower = more deterministic)
 */
const TRANSLATION_TEMPERATURE = 0.3;

// ============================================================================
// Ollama Client Initialization
// ============================================================================

let ollamaClient: Ollama | null = null;

/**
 * Initialize Ollama client with lazy loading
 */
function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: OLLAMA_HOST });
  }
  return ollamaClient;
}

/**
 * Check if Ollama service is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const client = getOllamaClient();
    const models = await client.list();
    const hasTranslateGemma = models.models.some(m => 
      m.name.includes('translategemma')
    );
    
    if (!hasTranslateGemma) {
      console.warn('[Ollama] TranslateGemma model not found. Run: ollama pull translategemma:4b');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[Ollama] Health check failed:', error);
    return false;
  }
}

// ============================================================================
// Language Code Mapping
// ============================================================================

/**
 * Map ISO 639-1 codes to full language names for better prompt clarity
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  he: 'Hebrew',
  el: 'Greek',
};

/**
 * Convert language code to full name
 */
function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

// ============================================================================
// Core Translation Functions
// ============================================================================

/**
 * Unified translation function supporting both cloud and local providers
 * 
 * @param content - Text content to translate
 * @param targetLanguage - Target language code (ISO 639-1)
 * @param sourceLanguage - Optional source language hint
 * @returns Translated text content
 * 
 * @example
 * ```typescript
 * const translated = await translateMeetingNotes(
 *   '今天讨论了产品路线图',
 *   'en',
 *   'zh'
 * );
 * // Returns: "Today we discussed the product roadmap"
 * ```
 */
export async function translateMeetingNotes(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  // Validate inputs
  if (!content || content.trim().length === 0) {
    throw new Error('Translation content cannot be empty');
  }

  if (!targetLanguage || targetLanguage.trim().length === 0) {
    throw new Error('Target language must be specified');
  }

  // Route to appropriate translation provider
  if (TRANSLATION_MODE === 'local') {
    try {
      console.log(`[Translation] Using local TranslateGemma for ${sourceLanguage || 'auto'} → ${targetLanguage}`);
      return await translateWithOllama(content, targetLanguage, sourceLanguage);
    } catch (error) {
      console.error('[Translation] Local translation failed:', error);
      
      if (ENABLE_CLOUD_FALLBACK) {
        console.log('[Translation] Falling back to cloud API');
        return await translateWithGemini(content, targetLanguage, sourceLanguage);
      }
      
      throw new Error(`Local translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log(`[Translation] Using cloud Gemini API for ${sourceLanguage || 'auto'} → ${targetLanguage}`);
    return await translateWithGemini(content, targetLanguage, sourceLanguage);
  }
}

/**
 * Local translation using TranslateGemma via Ollama
 * 
 * TranslateGemma uses a specific prompt format optimized for translation tasks.
 * The model is trained to handle bidirectional translation between 55 languages.
 */
async function translateWithOllama(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  const client = getOllamaClient();
  
  // Build language direction hint
  const targetLangName = getLanguageName(targetLanguage);
  const sourceLangName = sourceLanguage ? getLanguageName(sourceLanguage) : 'the source language';
  
  // TranslateGemma-optimized prompt format
  const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}.

Instructions:
- Maintain the original formatting (line breaks, bullet points, numbering)
- Preserve technical terms and proper nouns when appropriate
- Keep the tone and style consistent with the source text
- Do not add explanations or notes, only provide the translation

Text to translate:

${content}

Translation:`;

  try {
    const response = await client.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: TRANSLATION_TEMPERATURE,
        top_p: 0.9,
        top_k: 40,
        num_predict: MAX_OUTPUT_TOKENS,
        repeat_penalty: 1.1,
        stop: ['\n\nText to translate:', '\n\nInstructions:'],
      },
    });

    // Clean up response (remove any trailing artifacts)
    const translatedText = response.response.trim();
    
    if (!translatedText || translatedText.length === 0) {
      throw new Error('TranslateGemma returned empty translation');
    }

    console.log(`[Translation] Local translation completed (${translatedText.length} chars)`);
    return translatedText;
    
  } catch (error) {
    console.error('[Translation] Ollama API error:', error);
    throw new Error(`Ollama translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Cloud translation using Gemini API (existing implementation)
 * 
 * Fallback option when local model is unavailable or fails
 */
async function translateWithGemini(
  content: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  const targetLangName = getLanguageName(targetLanguage);
  const sourceLangName = sourceLanguage ? getLanguageName(sourceLanguage) : 'the detected language';

  try {
    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      system: `You are a professional translator. Translate the provided text from ${sourceLangName} to ${targetLangName}. Maintain the original formatting, tone, and structure. Do not add explanations.`,
      prompt: content,
      maxTokens: MAX_OUTPUT_TOKENS,
    });

    console.log(`[Translation] Cloud translation completed (${text.length} chars)`);
    return text;
    
  } catch (error) {
    console.error('[Translation] Gemini API error:', error);
    throw new Error(`Cloud translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Language Detection
// ============================================================================

/**
 * Detect the language of meeting content
 * 
 * @param content - Text content to analyze
 * @returns ISO 639-1 language code (e.g., 'en', 'zh', 'ja')
 * 
 * @example
 * ```typescript
 * const lang = await detectMeetingLanguage('こんにちは');
 * // Returns: 'ja'
 * ```
 */
export async function detectMeetingLanguage(content: string): Promise<string> {
  if (!content || content.trim().length === 0) {
    throw new Error('Cannot detect language of empty content');
  }

  // Use first 500 characters for language detection
  const sample = content.substring(0, 500);

  if (TRANSLATION_MODE === 'local') {
    try {
      return await detectLanguageWithOllama(sample);
    } catch (error) {
      console.error('[Language Detection] Local detection failed:', error);
      
      if (ENABLE_CLOUD_FALLBACK) {
        console.log('[Language Detection] Falling back to cloud API');
        return await detectLanguageWithGemini(sample);
      }
      
      throw error;
    }
  } else {
    return await detectLanguageWithGemini(sample);
  }
}

/**
 * Language detection using TranslateGemma
 */
async function detectLanguageWithOllama(sample: string): Promise<string> {
  const client = getOllamaClient();

  const prompt = `Identify the language of the following text and respond with ONLY the ISO 639-1 language code (e.g., "en" for English, "zh" for Chinese, "ja" for Japanese).

Do not provide any explanation, only the two-letter code.

Text:
${sample}

Language code:`;

  try {
    const response = await client.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1, // Very low temperature for deterministic output
        num_predict: 10,  // Only need 2-3 characters
      },
    });

    // Extract and validate language code
    const languageCode = response.response.trim().toLowerCase().substring(0, 2);
    
    // Validate it's a reasonable language code (2 letters)
    if (!/^[a-z]{2}$/.test(languageCode)) {
      throw new Error(`Invalid language code detected: ${languageCode}`);
    }

    console.log(`[Language Detection] Detected language: ${languageCode}`);
    return languageCode;
    
  } catch (error) {
    console.error('[Language Detection] Ollama error:', error);
    throw new Error(`Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Language detection using Gemini API
 */
async function detectLanguageWithGemini(sample: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: google('gemini-2.0-flash-exp'),
      system: 'Detect the language of the provided text and respond with ONLY the ISO 639-1 language code (e.g., "en", "zh", "ja"). No explanation.',
      prompt: sample,
      maxTokens: 10,
    });

    const languageCode = text.trim().toLowerCase().substring(0, 2);
    
    if (!/^[a-z]{2}$/.test(languageCode)) {
      throw new Error(`Invalid language code from Gemini: ${languageCode}`);
    }

    console.log(`[Language Detection] Detected language: ${languageCode}`);
    return languageCode;
    
  } catch (error) {
    console.error('[Language Detection] Gemini error:', error);
    throw new Error(`Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// Batch Translation Support
// ============================================================================

/**
 * Translate multiple texts in parallel with concurrency control
 * 
 * @param items - Array of translation requests
 * @param concurrency - Maximum parallel translations (default: 3)
 * @returns Array of translated texts in same order as input
 * 
 * @example
 * ```typescript
 * const results = await batchTranslate([
 *   { content: 'Hello', targetLanguage: 'es' },
 *   { content: 'World', targetLanguage: 'fr' },
 * ]);
 * ```
 */
export async function batchTranslate(
  items: Array<{ content: string; targetLanguage: string; sourceLanguage?: string }>,
  concurrency: number = 3
): Promise<string[]> {
  const results: string[] = [];
  const queue = [...items];

  // Process in batches to avoid overwhelming the system
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const batchResults = await Promise.all(
      batch.map(item => 
        translateMeetingNotes(item.content, item.targetLanguage, item.sourceLanguage)
      )
    );
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current translation mode configuration
 */
export function getTranslationConfig() {
  return {
    mode: TRANSLATION_MODE,
    ollamaHost: OLLAMA_HOST,
    ollamaModel: OLLAMA_MODEL,
    cloudFallbackEnabled: ENABLE_CLOUD_FALLBACK,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: TRANSLATION_TEMPERATURE,
  };
}

/**
 * Estimate translation time based on content length and mode
 * 
 * @param wordCount - Number of words to translate
 * @param hasGpu - Whether GPU acceleration is available
 * @returns Estimated time in seconds
 */
export function estimateTranslationTime(wordCount: number, hasGpu: boolean = false): number {
  if (TRANSLATION_MODE === 'cloud') {
    // Cloud API: ~2-5 seconds base + 0.01s per word
    return 2 + (wordCount * 0.01);
  } else {
    // Local inference time varies significantly by hardware
    if (hasGpu) {
      // GPU: ~0.5-1 second base + 0.002s per word
      return 0.5 + (wordCount * 0.002);
    } else {
      // CPU: ~3-5 seconds base + 0.02s per word
      return 3 + (wordCount * 0.02);
    }
  }
}

/**
 * Calculate translation cost (for cloud mode only)
 * 
 * @param wordCount - Number of words translated
 * @returns Estimated cost in USD
 */
export function estimateTranslationCost(wordCount: number): number {
  if (TRANSLATION_MODE === 'local') {
    return 0; // Local translation has no per-request cost
  }

  // Gemini pricing: ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens
  // Assume 1 word ≈ 1.3 tokens, and output is similar length to input
  const tokens = wordCount * 1.3;
  const inputCost = (tokens / 1_000_000) * 0.075;
  const outputCost = (tokens / 1_000_000) * 0.30;
  
  return inputCost + outputCost;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  translateMeetingNotes,
  detectMeetingLanguage,
  batchTranslate,
  checkOllamaHealth,
  getTranslationConfig,
  estimateTranslationTime,
  estimateTranslationCost,
};
