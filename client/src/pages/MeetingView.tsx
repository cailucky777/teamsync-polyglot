import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Download, Globe, Loader2, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "fr", name: "French (Français)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "pt", name: "Portuguese (Português)" },
];

export default function MeetingView() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const meetingId = params?.id ? parseInt(params.id) : 0;

  const [targetLanguage, setTargetLanguage] = useState("en");

  const { data: meeting, isLoading: meetingLoading } = trpc.meetings.get.useQuery(
    { id: meetingId },
    { enabled: meetingId > 0 }
  );

  const { data: translation, isLoading: translationLoading } = trpc.meetings.getTranslation.useQuery(
    { meetingId, targetLanguage },
    { enabled: meetingId > 0 && !!targetLanguage }
  );

  const translateMutation = trpc.meetings.translate.useMutation({
    onSuccess: () => {
      toast.success("Translation completed!");
    },
    onError: (error) => {
      toast.error(`Translation failed: ${error.message}`);
    },
  });

  const { data: exportData, refetch: refetchExport } = trpc.meetings.export.useQuery(
    { meetingId, targetLanguage },
    { enabled: false }
  );

  const handleTranslate = () => {
    if (!targetLanguage) {
      toast.error("Please select a target language");
      return;
    }
    translateMutation.mutate({ meetingId, targetLanguage });
  };

  const handleExport = async () => {
    const result = await refetchExport();
    if (result.data?.content) {
      const blob = new Blob([result.data.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting?.title || "meeting"}-summary.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Summary exported!");
    }
  };

  if (meetingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Meeting Not Found</CardTitle>
            <CardDescription>The requested meeting could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedSummary = translation?.actionItems ? JSON.parse(translation.actionItems) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Meetings
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{meeting.title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Globe className="mr-1 h-3 w-3" />
                  {meeting.detectedLanguage?.toUpperCase() || "Unknown"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(meeting.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Translation Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Translation & Analysis
            </CardTitle>
            <CardDescription>
              Translate meeting notes and extract action items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target language" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleTranslate}
                disabled={translateMutation.isPending || !targetLanguage}
              >
                {translateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Translate
                  </>
                )}
              </Button>
              {translation && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bento Grid Dual-Panel Layout */}
        {translation ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Content Panel */}
            <Card className="lg:sticky lg:top-8 h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Original Content</CardTitle>
                <CardDescription>
                  Language: {meeting.detectedLanguage?.toUpperCase() || "Unknown"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {meeting.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={meeting.imageUrl}
                      alt="Meeting whiteboard"
                      className="w-full rounded-lg border"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Original image (text extracted via OCR)
                    </p>
                  </div>
                )}
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm bg-muted p-4 rounded-lg">
                    {meeting.originalContent}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Translated Content Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Translated Content</CardTitle>
                  <CardDescription>
                    Language: {targetLanguage.toUpperCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                      {translation.translatedContent}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Card */}
              {parsedSummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Meeting Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Overview</h3>
                      <p className="text-sm text-muted-foreground">{parsedSummary.summary}</p>
                    </div>

                    {parsedSummary.actionItems && parsedSummary.actionItems.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-2">Action Items</h3>
                          <ul className="space-y-2">
                            {parsedSummary.actionItems.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                                  {idx + 1}
                                </span>
                                <span className="text-sm">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {parsedSummary.keyPoints && parsedSummary.keyPoints.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-2">Key Points</h3>
                          <ul className="space-y-1">
                            {parsedSummary.keyPoints.map((point: string, idx: number) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {parsedSummary.decisions && parsedSummary.decisions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-2">Decisions Made</h3>
                          <ul className="space-y-1">
                            {parsedSummary.decisions.map((decision: string, idx: number) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <Badge variant="outline" className="flex-shrink-0">
                                  ✓
                                </Badge>
                                <span>{decision}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Translation Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select a target language and click Translate to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
