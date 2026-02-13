import { useState } from "react";
import { Play, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractYouTubeId } from "@/lib/api";

interface VideoPlayerProps {
  videoId: string | null;
  isScanning: boolean;
  onSubmitUrl: (videoId: string) => void;
}

export function VideoPlayer({ videoId, isScanning, onSubmitUrl }: VideoPlayerProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYouTubeId(url);
    if (!id) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    setError("");
    onSubmitUrl(id);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* URL Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube URL to monitor…"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isScanning} className="gap-2">
          <Play className="h-4 w-4" />
          Monitor
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Video Embed */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="flex h-full items-center justify-center p-0">
          {videoId ? (
            <iframe
              className="h-full w-full min-h-[400px]"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-32 text-muted-foreground">
              <Play className="h-16 w-16 opacity-20" />
              <p className="text-lg font-medium">Enter a YouTube URL to begin monitoring</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
