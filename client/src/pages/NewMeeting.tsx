import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, Loader2, Upload } from "lucide-react";

export default function NewMeeting() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createMutation = trpc.meetings.create.useMutation({
    onSuccess: (data) => {
      toast.success("Meeting created successfully!");
      setLocation(`/meeting/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create meeting: ${error.message}`);
    },
  });

  const createFromImageMutation = trpc.meetings.createFromImage.useMutation({
    onSuccess: (data) => {
      toast.success("Meeting created from image!");
      setLocation(`/meeting/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to process image: ${error.message}`);
    },
  });

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createMutation.mutate({ title, content });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (16MB limit)
    const maxSize = 16 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image too large. Maximum size is 16MB");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Supported formats: JPEG, PNG, WebP, GIF");
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageFile) {
      toast.error("Please provide a title and select an image");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      createFromImageMutation.mutate({
        title,
        imageData: base64Data,
        mimeType: imageFile.type,
        fileSize: imageFile.size,
      });
    };
    reader.readAsDataURL(imageFile);
  };

  const isLoading = createMutation.isPending || createFromImageMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Create New Meeting</h1>
            <p className="text-muted-foreground">
              Add meeting notes by typing or uploading a photo of your whiteboard
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Meeting Input</CardTitle>
              <CardDescription>
                Choose how you want to add your meeting notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Text Input
                  </TabsTrigger>
                  <TabsTrigger value="image" className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Image Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-6">
                  <form onSubmit={handleTextSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Q1 Planning Meeting"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Meeting Notes</Label>
                      <Textarea
                        id="content"
                        placeholder="Paste your meeting notes here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isLoading}
                        rows={12}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports any language. We'll automatically detect it.
                      </p>
                    </div>

                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Create Meeting
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="image" className="mt-6">
                  <form onSubmit={handleImageSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="image-title">Meeting Title</Label>
                      <Input
                        id="image-title"
                        placeholder="e.g., Whiteboard Brainstorm"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="image-upload">Upload Image</Label>
                      <div className="mt-2">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-64 object-contain border rounded-lg bg-muted"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setImageFile(null);
                                setImagePreview(null);
                              }}
                            >
                              Change Image
                            </Button>
                          </div>
                        ) : (
                          <label
                            htmlFor="image-upload"
                            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">
                                JPEG, PNG, WebP, GIF (max 16MB)
                              </p>
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                              onChange={handleImageChange}
                              disabled={isLoading}
                            />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Upload a photo of your whiteboard, handwritten notes, or printed documents
                      </p>
                    </div>

                    <Button type="submit" disabled={isLoading || !imageFile} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting Text...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Process Image
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
