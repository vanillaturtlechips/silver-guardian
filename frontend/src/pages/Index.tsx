import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMonitoringContext } from "@/context/MonitoringContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ShieldCheck, Youtube, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import VideoUpload from "@/components/VideoUpload";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const { startAnalysis, isAnalyzing, progress } = useMonitoringContext();
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!url) return;
    
    try {
      // [해결] 이제 startAnalysis가 jobId를 리턴하므로 TS 에러가 발생하지 않습니다.
      const result = await startAnalysis(url);
      
      if (result && result.jobId) {
        // 영상 시청 페이지(/watch)로 이동하며 필요한 정보 전달
        navigate(`/watch?url=${encodeURIComponent(url)}&jobId=${result.jobId}`);
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleUploadComplete = (s3Key: string, uploadId: string) => {
    toast({
      title: "업로드 완료!",
      description: "곧 분석이 시작됩니다.",
    });
    console.log("Uploaded to S3:", s3Key, uploadId);
    // TODO: S3 업로드 완료 후 분석 시작 로직 추가 (Epic 1.3에서 구현)
  };

  return (
    <div className="container mx-auto px-4 py-20 max-w-3xl min-h-[80vh] flex flex-col justify-center items-center space-y-8 animate-in fade-in duration-700">
      
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full ring-4 ring-primary/5">
            <ShieldCheck className="w-16 h-16 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
          Silver Guardian
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          AI 유튜브 영상의 <b>숨겨진 의도</b>와 <b>위험 요소</b>를 <br className="hidden md:block" />
          분석해드립니다.
        </p>
      </div>

      <Card className="w-full shadow-xl border-muted/40 overflow-hidden">
        <CardContent className="p-6 md:p-8 bg-card">
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Youtube className="w-4 h-4" />
                URL 입력
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                파일 업로드
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-3.5 text-muted-foreground">
                    <Youtube className="h-5 w-5" />
                  </div>
                  <Input 
                    placeholder="유튜브 영상 링크를 붙여넣으세요" 
                    className="pl-10 h-12 text-lg shadow-sm"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    disabled={isAnalyzing}
                  />
                </div>
                <Button 
                  size="lg" 
                  className="h-12 px-8 text-lg font-bold shadow-md transition-all hover:shadow-lg"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !url}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 분석 중...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" /> 분석 시작
                    </>
                  )}
                </Button>
              </div>

              {isAnalyzing && (
                <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between text-sm text-primary font-semibold">
                      <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin"/> AI 엔진 가동 중...</span>
                      <span>{progress}%</span>
                   </div>
                   <Progress value={progress} className="h-2 bg-muted" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload">
              <VideoUpload onUploadComplete={handleUploadComplete} userId="guest" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-center pt-10 opacity-80">
         <div className="space-y-2 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="font-bold text-lg flex items-center justify-center gap-2">⚡ 초고속 분석</div>
            <p className="text-sm text-muted-foreground">URL만 넣으면 즉시 <br/>안전도 리포트 생성</p>
         </div>
         <div className="space-y-2 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="font-bold text-lg flex items-center justify-center gap-2">🤖 Gemini AI</div>
            <p className="text-sm text-muted-foreground">최신 AI 모델이 영상의 <br/>맥락과 숨겨진 의도 파악</p>
         </div>
         <div className="space-y-2 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="font-bold text-lg flex items-center justify-center gap-2">💬 여론 탐지</div>
            <p className="text-sm text-muted-foreground">베스트 댓글 분석을 통해 <br/>실제 시청자 반응 확인</p>
         </div>
      </div>
    </div>
  );
}