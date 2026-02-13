import { useState, useEffect } from "react";
import { Play, Link as LinkIcon, Loader2 } from "lucide-react";
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

  // 외부에서 videoId가 바뀌면 입력창도 동기화 (예: 분석 완료 후)
  useEffect(() => {
    if (videoId) {
       // 입력창에 이미 해당 ID의 주소가 있다면 굳이 건드리지 않음 (커서 튐 방지)
       if (!url.includes(videoId)) {
          setUrl(`https://youtu.be/${videoId}`);
       }
    }
  }, [videoId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYouTubeId(url);
    if (!id) {
      setError("올바른 YouTube 주소를 입력해주세요.");
      return;
    }
    setError("");
    // 추출된 ID로 분석 시작 요청
    onSubmitUrl(id);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* URL 입력 폼 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube 주소를 붙여넣고 Enter를 누르세요"
            className="pl-9 bg-white"
            disabled={isScanning}
          />
        </div>
        <Button type="submit" disabled={isScanning} className="gap-2 min-w-[100px]">
          {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isScanning ? "분석 중" : "분석 시작"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive font-medium px-1">{error}</p>}

      {/* 비디오 플레이어 영역 */}
      <Card className="flex-1 overflow-hidden bg-black/5 border-slate-200 shadow-inner">
        <CardContent className="flex h-full items-center justify-center p-0 min-h-[300px] sm:min-h-[400px]">
          {videoId ? (
            <iframe
              key={videoId} // ★ 핵심 수정: ID가 바뀌면 iframe을 강제로 새로고침
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in zoom-in duration-500">
              <Play className="h-16 w-16 opacity-20" />
              <p className="text-lg font-medium">영상을 분석하려면 주소를 입력하세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}