import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Globe, Plus, FileText, Sparkles, Languages, Shield, Zap } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data: meetings, isLoading: meetingsLoading } = trpc.meetings.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Hero Section */}
        <div className="container py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Privacy-First Translation
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              TeamSync Polyglot
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Break language barriers in global teams. Translate meeting notes, extract action items, 
              and collaborate across languages with privacy in mind.
            </p>
            <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
              <Globe className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <Languages className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Multi-Language Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Translate meeting notes between Chinese, Japanese, French, English, and more. 
                  Automatic language detection included.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Sparkles className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI-Powered Summaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Extract action items, key points, and decisions automatically. 
                  Get structured summaries in seconds.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>OCR Image Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Upload photos of whiteboards or handwritten notes. 
                  We'll extract and translate the text for you.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Architecture Highlight */}
          <Card className="mt-12 max-w-3xl mx-auto border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle>Privacy-First Architecture</CardTitle>
              </div>
              <CardDescription>
                Designed for future on-device inference with TranslateGemma 4B
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Currently powered by Gemini 1.5 Flash for fast cloud translation. 
                Our architecture is ready to migrate to local TranslateGemma 4B deployment, 
                enabling fully private, on-device translation for sensitive meeting content.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Your Meetings</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || "User"}!
            </p>
          </div>
          <Button onClick={() => setLocation("/new")} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Meeting
          </Button>
        </div>

        {/* Meetings List */}
        {meetingsLoading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading meetings...</div>
          </div>
        ) : meetings && meetings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setLocation(`/meeting/${meeting.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{meeting.title}</CardTitle>
                    {meeting.detectedLanguage && (
                      <Badge variant="secondary" className="ml-2">
                        {meeting.detectedLanguage.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {new Date(meeting.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {meeting.imageUrl && (
                    <div className="mb-3">
                      <img
                        src={meeting.imageUrl}
                        alt="Meeting preview"
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {meeting.originalContent}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Meetings Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first meeting to get started with translation and summarization
              </p>
              <Button onClick={() => setLocation("/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Meeting
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
