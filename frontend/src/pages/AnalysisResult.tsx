// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  Youtube, 
  Lock,
  ChevronRight,
  Sparkles,
  Loader2,
  LogIn
} from "lucide-react";

interface AnalysisResultType {
  jobId: string;
  status: string;
  safetyScore: number;
  geminiResponse: string;
  metadata?: {
    title: string;
    channel: string;
    viewCount: number;
    publishedAt: string;
  };
}

interface ParsedGemini {
  summary: string;
  reasoning: string;
  concerns: string[];
}

export default function AnalysisResult() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // 로그인 여부 확인
  
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoginAlertOpen, setIsLoginAlertOpen] = useState(false); // 로그인 유도 모달 상태

  const isLocked = true; 

  useEffect(() => {
    if (!jobId) {
      setError("잘못된 접근입니다.");
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const data = await api.getAnalysisResult(jobId);
        setResult(data);
      } catch (err) {
        setError("데이터를 가져오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [jobId]);

  // PRO 버튼 클릭 핸들러
  const handleProClick = () => {
    if (!user) {
      setIsLoginAlertOpen(true); // 로그인 안 되어 있으면 모달 오픈
    } else {
      navigate('/profile'); // 로그인 되어 있으면 프로필(구독) 페이지로
    }
  };

  if (loading) return (
    <div className="container mx-auto p-12 max-w-5xl space-y-8 animate-pulse">
      <Skeleton className="h-10 w-1/4 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Skeleton className="h-96 col-span-1 rounded-[2.5rem]" />
        <Skeleton className="h-96 col-span-2 rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (error || !result) return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <AlertTriangle className="h-16 w-16 text-rose-500" />
      <h2 className="text-2xl font-black">{error}</h2>
      <Button onClick={() => navigate("/")} className="rounded-full px-8 bg-indigo-600">홈으로</Button>
    </div>
  );

  let aiData: ParsedGemini = { summary: "분석 중입니다.", reasoning: "", concerns: [] };
  try {
    if (result.geminiResponse) {
      const parsed = JSON.parse(result.geminiResponse);
      aiData = {
        summary: parsed.summary || result.geminiResponse,
        reasoning: parsed.reasoning || "",
        concerns: parsed.concerns || []
      };
    }
  } catch (e) {
    aiData.summary = result.geminiResponse; 
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-indigo-600";
    if (score >= 50) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      
      {/* 1. 상단 네비게이션 */}
      <div className="bg-white border-b border-slate-100 px-8 py-6 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl border-slate-200 font-bold text-slate-500 hover:bg-slate-50">
              <ArrowLeft className="mr-2 h-4 w-4" /> 이전 영상으로 돌아가기
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="rounded-xl font-bold text-indigo-600 hover:bg-indigo-50">
              <RotateCcw className="mr-2 h-4 w-4" /> 새로운 분석하기
            </Button>
          </div>
          <div className="flex flex-col items-end text-right">
            <h1 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Security Report</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{result.metadata?.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* 2. 사이드바 */}
        <div className="md:col-span-1 space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <Card className="rounded-[3rem] border-none shadow-2xl shadow-indigo-100/40 bg-white">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Safety Index</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8">
              <div className="relative flex items-center justify-center">
                <svg className="h-44 w-44 transform -rotate-90">
                  <circle cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-50" />
                  <circle cx="88" cy="88" r="76" stroke="currentColor" strokeWidth="16" fill="transparent" 
                    className={getScoreColor(result.safetyScore)}
                    strokeDasharray={477}
                    strokeDashoffset={477 - (477 * result.safetyScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`text-6xl font-black tracking-tighter ${getScoreColor(result.safetyScore)}`}>{result.safetyScore}</span>
                  <span className="text-xs font-bold text-slate-200">/ 100</span>
                </div>
              </div>
              <p className="mt-8 font-black text-slate-800 uppercase tracking-widest text-sm italic">
                {result.safetyScore >= 80 ? "Certified Safe" : "Risk Detected"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardContent className="p-8 space-y-5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400 flex items-center gap-2"><Youtube className="h-4 w-4"/> 채널</span>
                <span className="text-slate-900">{result.metadata?.channel || "Unknown"}</span>
              </div>
              <Separator className="opacity-50" />
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400">조회수</span>
                <span className="text-slate-900">{result.metadata?.viewCount?.toLocaleString()}회</span>
              </div>
              <Separator className="opacity-50" />
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-400">게시일</span>
                <span className="text-slate-900">{result.metadata?.publishedAt ? new Date(result.metadata.publishedAt).toLocaleDateString() : "-"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. 메인 콘텐츠 */}
        <div className="md:col-span-2 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          
          <Card className="rounded-[3rem] border-none shadow-xl shadow-indigo-100/20 bg-white p-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-600 font-black italic uppercase tracking-tighter">
                <ShieldCheck className="h-6 w-6" /> AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-xl font-bold leading-relaxed text-slate-800 italic border-l-4 border-indigo-100 pl-6 py-2">
                "{aiData.summary}"
              </p>
              <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed font-medium">
                {aiData.reasoning || "영상의 전반적인 맥락이 일관적이며 신뢰할 수 있는 정보원을 바탕으로 제작되었습니다."}
              </div>
            </CardContent>
          </Card>

          {/* 구독 유도(잠금) 섹션 */}
          <div className="relative group">
            <div className="blur-xl opacity-30 select-none pointer-events-none space-y-8">
              <Card className="rounded-[3rem] border-slate-100 p-10 bg-white">
                <CardHeader><CardTitle className="text-lg font-black text-slate-400 uppercase">Detailed Analysis</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-4 bg-slate-100 rounded-full w-full" />
                  <div className="h-4 bg-slate-100 rounded-full w-5/6" />
                </CardContent>
              </Card>
              <Card className="rounded-[3rem] border-slate-100 p-10 bg-white">
                <CardHeader><CardTitle className="text-lg font-black text-slate-400 uppercase">Sentiment Analysis</CardTitle></CardHeader>
                <CardContent className="h-20 bg-slate-100 rounded-2xl" />
              </Card>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/70 backdrop-blur-md p-14 rounded-[4rem] border border-white shadow-2xl flex flex-col items-center text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">심층 리포트 잠금</h3>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                  영상의 숨겨진 선동적 의도와 조직적인 댓글 조작 정황을 AI가 포착했습니다. 상세 데이터는 Pro 멤버십에서 확인하세요.
                </p>
                <Button 
                  onClick={handleProClick} 
                  className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-black font-black text-white shadow-2xl flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-5 h-5 text-indigo-400 group-hover:animate-pulse" />
                  PRO 멤버십으로 해제하기
                  <ChevronRight className="w-5 h-5 opacity-50 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 로그인 유도 모달 --- */}
      <Dialog open={isLoginAlertOpen} onOpenChange={setIsLoginAlertOpen}>
        <DialogContent className="max-w-md bg-white p-0 border-none rounded-[3rem] overflow-hidden shadow-3xl">
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
              <LogIn className="w-8 h-8 text-amber-500" />
            </div>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">로그인이 필요합니다</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                상세 분석 리포트 및 PRO 기능을 이용하시려면<br />먼저 로그인을 진행해 주세요.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex border-t border-slate-50">
            <Button variant="ghost" className="flex-1 h-16 rounded-none font-bold text-slate-400" onClick={() => setIsLoginAlertOpen(false)}>닫기</Button>
            <Button className="flex-1 h-16 rounded-none bg-indigo-600 hover:bg-black font-black text-white" onClick={() => {
              setIsLoginAlertOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' }); // 상단 로그인 바 위치로 스크롤
            }}>로그인하러 가기</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}