import { describe, expect, it } from "vitest";
import { detectMeetingLanguage, translateMeetingNotes } from "./translation";

describe("Translation Service", () => {
  it("should detect language using Gemini API", async () => {
    const testText = "Hello, this is a test message.";
    
    const detectedLanguage = await detectMeetingLanguage(testText);
    
    expect(detectedLanguage).toBeTruthy();
    expect(typeof detectedLanguage).toBe("string");
    expect(detectedLanguage.length).toBeGreaterThan(0);
    // English should be detected as "en"
    expect(detectedLanguage.toLowerCase()).toBe("en");
  }, 30000); // 30 second timeout for API call

  it("should translate text using Gemini API", async () => {
    const testText = "Hello, world!";
    const targetLanguage = "Spanish";
    
    const translatedText = await translateMeetingNotes(testText, targetLanguage);
    
    expect(translatedText).toBeTruthy();
    expect(typeof translatedText).toBe("string");
    expect(translatedText.length).toBeGreaterThan(0);
    // Should contain Spanish translation
    expect(translatedText.toLowerCase()).toContain("hola");
  }, 30000); // 30 second timeout for API call
});
