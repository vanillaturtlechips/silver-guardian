import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, PlayCircle, Zap, ExternalLink } from "lucide-react";

interface HistoryItem {
  videoId: string;
  videoTitle: string;
  thumbnailUrl: string;
  analyzedAt: string;
}

export default function MyPage() {
  const { user, isPro } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await api.getUserHistory(user.id);
        const items = res.items.map((item: any) => ({
            videoId: item.videoId,
            videoTitle: item.videoTitle,
            thumbnailUrl: item.thumbnailUrl,
            analyzedAt: item.analyzedAt
        }));
        setHistory(items);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, navigate]);

  // 히스토리 항목 클릭 시 다시 분석 결과로 이동
  const handleVideoClick = async (videoId: string) => {
    try {
      toast({ description: "분석 결과를 불러오는 중..." });
      // jobId가 없으므로 다시 요청을 보내서(캐싱 활용) jobId를 얻어냄
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await api.submitVideoForAnalysis({ 
        videoUrl, 
        sensitivity: "medium", 
        scanInterval: 30 
      }, user?.id || "");
      
      navigate(`/result/${response.jobId}`);
    } catch (e) {
      toast({ title: "이동 실패", description: "결과를 불러올 수 없습니다.", variant: "destructive" });
    }
  };

  if (!user) return null;

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. 프로필 헤더 */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50/50 rounded-2xl border shadow-sm">
        <Avatar className="h-24 w-24 border-4 border-white shadow-md">
          <AvatarImage src={user.picture} />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>
        <div className="text-center md:text-left space-y-2 flex-1">
          <h1 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
            {user.name}
            {isPro ? (
               <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 border-none text-white gap-1 px-3 py-1">
                 <Zap className="h-3 w-3 fill-current" /> PRO
               </Badge>
            ) : (
               <Badge variant="secondary">Free Plan</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        
        <div className="flex gap-4">
            <div className="text-center px-6 py-3 bg-white rounded-xl border shadow-sm">
                <div className="text-2xl font-bold text-primary">{history.length}</div>
                <div className="text-xs text-muted-foreground font-medium">분석한 영상</div>
            </div>
        </div>
      </div>

      {/* 2. 히스토리 리스트 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
            <PlayCircle className="h-5 w-5" /> 최근 분석 기록
        </h2>
        
        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
        ) : history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {history.map((item, idx) => (
                    <Card 
                        key={idx} 
                        className="overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                        onClick={() => handleVideoClick(item.videoId)}
                    >
                        <div className="aspect-video relative overflow-hidden bg-black/10">
                            {item.thumbnailUrl ? (
                                <img src={item.thumbnailUrl} alt={item.videoTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-slate-100">No Thumbnail</div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <ExternalLink className="text-white h-8 w-8 drop-shadow-md" />
                            </div>
                        </div>
                        <CardHeader className="p-4 space-y-1">
                            <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">{item.videoTitle || "제목 없음"}</CardTitle>
                            <CardDescription className="flex items-center text-xs gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {new Date(item.analyzedAt).toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-muted/20 rounded-xl border-dashed border-2">
                <p className="text-muted-foreground mb-4">아직 분석한 영상이 없습니다.</p>
                <Button onClick={() => navigate("/")}>첫 번째 영상 분석하기</Button>
            </div>
        )}
      </div>
    </div>
  );
}