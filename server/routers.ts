import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { translateMeetingNotes, detectMeetingLanguage } from "./translation";
import { summarizeMeetingNotes, formatSummaryForExport } from "./summarization";
import { extractAndDetectLanguage, validateImageForOCR } from "./ocr";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  meetings: router({
    // List all meetings for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMeetings(ctx.user.id);
    }),

    // Get a specific meeting by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMeetingById(input.id);
      }),

    // Create a new meeting from text input
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Detect language
        const detectedLanguage = await detectMeetingLanguage(input.content);

        // Create meeting record
        const meetingId = await db.createMeeting({
          userId: ctx.user.id,
          title: input.title,
          originalContent: input.content,
          detectedLanguage,
        });

        return { id: meetingId, detectedLanguage };
      }),

    // Create meeting from uploaded image
    createFromImage: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          imageData: z.string(), // base64 encoded image
          mimeType: z.string(),
          fileSize: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Validate image
        const validation = validateImageForOCR(input.fileSize, input.mimeType);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Convert base64 to buffer
        const base64Data = input.imageData.split(",")[1] || input.imageData;
        const buffer = Buffer.from(base64Data, "base64");

        // Upload to S3
        const fileExtension = input.mimeType.split("/")[1] || "jpg";
        const fileKey = `meetings/${ctx.user.id}/${nanoid()}.${fileExtension}`;
        const { url: imageUrl } = await storagePut(fileKey, buffer, input.mimeType);

        // Extract text from image
        const ocrResult = await extractAndDetectLanguage(imageUrl);

        if (!ocrResult.extractedText) {
          throw new Error("No text could be extracted from the image");
        }

        // Create meeting record
        const meetingId = await db.createMeeting({
          userId: ctx.user.id,
          title: input.title,
          originalContent: ocrResult.extractedText,
          detectedLanguage: ocrResult.detectedLanguage,
          imageUrl,
          imageKey: fileKey,
        });

        return {
          id: meetingId,
          detectedLanguage: ocrResult.detectedLanguage,
          extractedText: ocrResult.extractedText,
          imageUrl,
        };
      }),

    // Translate a meeting to target language
    translate: protectedProcedure
      .input(
        z.object({
          meetingId: z.number(),
          targetLanguage: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // Check if translation already exists
        const existingTranslation = await db.getTranslation(input.meetingId, input.targetLanguage);
        if (existingTranslation) {
          return existingTranslation;
        }

        // Get meeting
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting) {
          throw new Error("Meeting not found");
        }

        // Translate content
        const translatedContent = await translateMeetingNotes(
          meeting.originalContent,
          input.targetLanguage,
          meeting.detectedLanguage || undefined
        );

        // Generate summary
        const summary = await summarizeMeetingNotes(translatedContent);

        // Save translation
        const translationId = await db.createTranslation({
          meetingId: input.meetingId,
          targetLanguage: input.targetLanguage,
          translatedContent,
          summary: summary.summary,
          actionItems: JSON.stringify(summary),
        });

        return {
          id: translationId,
          meetingId: input.meetingId,
          targetLanguage: input.targetLanguage,
          translatedContent,
          summary: summary.summary,
          actionItems: JSON.stringify(summary),
        };
      }),

    // Get translation for a meeting
    getTranslation: protectedProcedure
      .input(
        z.object({
          meetingId: z.number(),
          targetLanguage: z.string(),
        })
      )
      .query(async ({ input }) => {
        return db.getTranslation(input.meetingId, input.targetLanguage);
      }),

    // Export meeting summary
    export: protectedProcedure
      .input(z.object({ meetingId: z.number(), targetLanguage: z.string() }))
      .query(async ({ input }) => {
        const meeting = await db.getMeetingById(input.meetingId);
        if (!meeting) {
          throw new Error("Meeting not found");
        }

        const translation = await db.getTranslation(input.meetingId, input.targetLanguage);
        if (!translation) {
          throw new Error("Translation not found");
        }

        const summary = JSON.parse(translation.actionItems || "{}");

        const exportContent = formatSummaryForExport(
          meeting.originalContent,
          translation.translatedContent,
          summary,
          meeting.detectedLanguage || "unknown",
          input.targetLanguage
        );

        return { content: exportContent };
      }),

    // Delete a meeting
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMeeting(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
