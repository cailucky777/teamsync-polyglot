import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Meeting Procedures", () => {
  it("should create a meeting from text input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.meetings.create({
      title: "Test Meeting",
      content: "This is a test meeting in English.",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeTypeOf("number");
    expect(result.detectedLanguage).toBe("en");
  }, 30000);

  it("should list meetings for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a meeting first
    await caller.meetings.create({
      title: "Test Meeting for List",
      content: "Sample content for testing list functionality.",
    });

    const meetings = await caller.meetings.list();

    expect(Array.isArray(meetings)).toBe(true);
    expect(meetings.length).toBeGreaterThan(0);
  }, 30000);

  it("should get a specific meeting by ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a meeting
    const created = await caller.meetings.create({
      title: "Test Get Meeting",
      content: "Content for get test.",
    });

    const meeting = await caller.meetings.get({ id: created.id });

    expect(meeting).toBeDefined();
    expect(meeting?.id).toBe(created.id);
    expect(meeting?.title).toBe("Test Get Meeting");
  }, 30000);

  it("should translate a meeting to another language", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a meeting
    const created = await caller.meetings.create({
      title: "Translation Test",
      content: "Hello, this is a test message for translation.",
    });

    // Translate to Spanish
    const translation = await caller.meetings.translate({
      meetingId: created.id,
      targetLanguage: "Spanish",
    });

    expect(translation).toBeDefined();
    expect(translation.translatedContent).toBeTruthy();
    expect(translation.summary).toBeTruthy();
    expect(translation.targetLanguage).toBe("Spanish");
  }, 60000); // Longer timeout for translation + summarization

  it("should retrieve cached translation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a meeting
    const created = await caller.meetings.create({
      title: "Cache Test",
      content: "Testing translation caching.",
    });

    // First translation
    await caller.meetings.translate({
      meetingId: created.id,
      targetLanguage: "French",
    });

    // Retrieve cached translation
    const cached = await caller.meetings.getTranslation({
      meetingId: created.id,
      targetLanguage: "French",
    });

    expect(cached).toBeDefined();
    expect(cached?.translatedContent).toBeTruthy();
  }, 60000);

  it("should export meeting summary", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create and translate a meeting
    const created = await caller.meetings.create({
      title: "Export Test",
      content: "Meeting content for export testing.",
    });

    await caller.meetings.translate({
      meetingId: created.id,
      targetLanguage: "English",
    });

    // Export summary
    const exported = await caller.meetings.export({
      meetingId: created.id,
      targetLanguage: "English",
    });

    expect(exported).toBeDefined();
    expect(exported.content).toBeTruthy();
    expect(exported.content).toContain("Meeting Summary");
    expect(exported.content).toContain("Original Content");
    expect(exported.content).toContain("Translated Content");
  }, 60000);

  it("should delete a meeting", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a meeting
    const created = await caller.meetings.create({
      title: "Delete Test",
      content: "This meeting will be deleted.",
    });

    // Delete the meeting
    const result = await caller.meetings.delete({ id: created.id });

    expect(result.success).toBe(true);

    // Verify it's deleted
    const deleted = await caller.meetings.get({ id: created.id });
    expect(deleted).toBeUndefined();
  }, 30000);
});
