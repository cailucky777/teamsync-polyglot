import { generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * OCR result structure
 */
export interface OCRResult {
  extractedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

/**
 * Extract text from image using Gemini's vision capabilities
 * Supports whiteboard photos, handwritten notes, and printed documents
 * 
 * @param imageUrl - Public URL to the image (must be accessible by Gemini API)
 * @returns Extracted text content
 */
export async function extractTextFromImage(imageUrl: string): Promise<OCRResult> {
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text from this image. This could be:
- Whiteboard notes from a meeting
- Handwritten meeting notes
- Printed documents or slides
- Screenshots of text

Instructions:
1. Transcribe ALL visible text accurately
2. Preserve structure (bullet points, numbering, paragraphs)
3. If text is unclear, make your best interpretation
4. Ignore decorative elements, focus on content
5. If the image contains no readable text, respond with "NO_TEXT_FOUND"

Return only the extracted text, no explanations.`,
            },
            {
              type: "image",
              image: imageUrl,
            },
          ],
        },
      ],
    });

    // Check if no text was found
    if (text.trim() === "NO_TEXT_FOUND" || text.trim().length === 0) {
      return {
        extractedText: "",
        confidence: 0,
      };
    }

    return {
      extractedText: text.trim(),
      confidence: 1.0, // Gemini doesn't provide confidence scores, assume high quality
    };
  } catch (error) {
    console.error("OCR extraction failed:", error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text and detect language in one call
 * Optimized for meeting notes workflow
 */
export async function extractAndDetectLanguage(imageUrl: string): Promise<OCRResult> {
  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all text from this image and detect its language.

Return a JSON object with:
{
  "text": "extracted text content",
  "language": "ISO 639-1 code (e.g., en, zh, ja, fr)"
}

If no text is found, return:
{
  "text": "",
  "language": "unknown"
}

Return ONLY valid JSON, no markdown formatting.`,
            },
            {
              type: "image",
              image: imageUrl,
            },
          ],
        },
      ],
    });

    try {
      const parsed = JSON.parse(text);
      return {
        extractedText: parsed.text || "",
        detectedLanguage: parsed.language || "unknown",
        confidence: parsed.text ? 1.0 : 0,
      };
    } catch (parseError) {
      // Fallback: treat entire response as extracted text
      return {
        extractedText: text.trim(),
        confidence: 0.8,
      };
    }
  } catch (error) {
    console.error("OCR with language detection failed:", error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Validate image before OCR processing
 * Checks file size and format
 */
export function validateImageForOCR(fileSize: number, mimeType: string): { valid: boolean; error?: string } {
  // Check file size (16MB limit as per template docs)
  const maxSize = 16 * 1024 * 1024; // 16MB
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `Image too large. Maximum size is 16MB, got ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check supported formats
  const supportedFormats = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  if (!supportedFormats.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format: ${mimeType}. Supported formats: JPEG, PNG, WebP, GIF`,
    };
  }

  return { valid: true };
}
