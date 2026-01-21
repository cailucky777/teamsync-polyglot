import { generateText } from "ai";
import { google } from "@ai-sdk/google";

/**
 * Meeting summary structure
 */
export interface MeetingSummary {
  summary: string;
  actionItems: string[];
  keyPoints: string[];
  participants?: string[];
  decisions?: string[];
}

/**
 * Extract structured summary from meeting notes
 * Returns action items, key points, and overall summary
 */
export async function summarizeMeetingNotes(content: string): Promise<MeetingSummary> {
  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    system: `You are an expert meeting notes analyzer.
Extract structured information from meeting notes and return a JSON object with:
- summary: A concise 2-3 sentence overview of the meeting
- actionItems: Array of specific tasks/actions with owners if mentioned (e.g., "John to review proposal by Friday")
- keyPoints: Array of important discussion points and outcomes
- participants: Array of participant names if mentioned
- decisions: Array of key decisions made

Be specific and actionable. If a section has no content, use an empty array.
Return ONLY valid JSON, no markdown formatting.`,
    prompt: `Analyze these meeting notes and extract structured information:

${content}`,
  });

  try {
    // Parse the JSON response
    const parsed = JSON.parse(text);
    
    return {
      summary: parsed.summary || "No summary available",
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      participants: Array.isArray(parsed.participants) ? parsed.participants : undefined,
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : undefined,
    };
  } catch (error) {
    console.error("Failed to parse summary JSON:", error);
    
    // Fallback: return the raw text as summary
    return {
      summary: text,
      actionItems: [],
      keyPoints: [],
    };
  }
}

/**
 * Generate a formatted export of the meeting summary
 */
export function formatSummaryForExport(
  originalContent: string,
  translatedContent: string,
  summary: MeetingSummary,
  sourceLanguage: string,
  targetLanguage: string
): string {
  const sections: string[] = [];

  sections.push("# Meeting Summary");
  sections.push("");
  sections.push(`**Languages:** ${sourceLanguage.toUpperCase()} → ${targetLanguage.toUpperCase()}`);
  sections.push(`**Generated:** ${new Date().toLocaleString()}`);
  sections.push("");

  sections.push("## Overview");
  sections.push(summary.summary);
  sections.push("");

  if (summary.participants && summary.participants.length > 0) {
    sections.push("## Participants");
    summary.participants.forEach(p => sections.push(`- ${p}`));
    sections.push("");
  }

  if (summary.actionItems.length > 0) {
    sections.push("## Action Items");
    summary.actionItems.forEach((item, idx) => sections.push(`${idx + 1}. ${item}`));
    sections.push("");
  }

  if (summary.keyPoints.length > 0) {
    sections.push("## Key Points");
    summary.keyPoints.forEach(point => sections.push(`- ${point}`));
    sections.push("");
  }

  if (summary.decisions && summary.decisions.length > 0) {
    sections.push("## Decisions Made");
    summary.decisions.forEach(decision => sections.push(`- ${decision}`));
    sections.push("");
  }

  sections.push("---");
  sections.push("");
  sections.push("## Original Content");
  sections.push("```");
  sections.push(originalContent);
  sections.push("```");
  sections.push("");

  sections.push("## Translated Content");
  sections.push("```");
  sections.push(translatedContent);
  sections.push("```");

  return sections.join("\n");
}
