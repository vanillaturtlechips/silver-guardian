// @ts-nocheck
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { analysisClient } from "@/lib/grpc-client";
import { api, extractYouTubeId } from "@/lib/api";
import { Button } from "@/components/ui/button";
// 모든 필요한 아이콘을 빠짐없이 임포트합니다.
import { 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  ArrowLeft, 
  RotateCcw 
} from "lucide-react";

export default function AnalysisWatch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoUrl = searchParams.get("url") || "";
  const jobId = searchParams.get("jobId");

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("데이터 수집 및 분석 준비 중...");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    try {
      const stream = analysisClient.streamProgress(jobId);
      const subscription = stream.subscribe({
        next: (msg) => {
          setProgress(msg.progress || 0);
          setStatus(msg.message || "AI 엔진이 영상을 정밀 분석하고 있습니다...");
          if (msg.isCompleted || msg.progress === 100) {
            setIsDone(true);
            setStatus("모든 분석이 성공적으로 완료되었습니다.");
          }
        },
        error: (err) => {
          console.error("Stream error:", err);
          setStatus("연결 일시 정지 - 자동 재연결 시도 중...");
        }
      });
      return () => subscription.unsubscribe();
    } catch (e) {
      console.error("Failed to subscribe to stream:", e);
    }
  }, [jobId]);

  const videoId = extractYouTubeId(videoUrl);

  return (
    <div className="flex flex-col min-h-full bg-[#F9FAFB]">
      {/* --- 가로 바 형태의 세련된 프리미엄 상태 바 --- */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-8 py-4 flex flex-col gap-3 shadow-[0_2px_15px_rgba(0,0,0,0.02)] relative z-50">
        
        <div className="flex items-center justify-between">
          {/* 좌측: 상태 뱃지 */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500 ${
              isDone 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}>
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span className="text-[10px] font-black tracking-widest uppercase">
                {isDone ? 'Finished' : 'Live Analysis'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <Activity className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-indigo-500 animate-pulse'}`} />
              <p className="truncate max-w-md font-sans">{status}</p>
            </div>
          </div>

          {/* 우측: 결과 버튼 */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate(`/result/${jobId}?url=${encodeURIComponent(videoUrl)}`)} 
              disabled={!isDone}
              className={`h-10 pl-5 pr-6 rounded-xl font-bold transition-all duration-300 relative group ${
                isDone 
                  ? 'bg-indigo-600 hover:bg-black text-white shadow-lg shadow-indigo-100 hover:-translate-y-0.5' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <div className="relative z-10 flex items-center">
                {isDone ? <Sparkles className="w-4 h-4 mr-2 text-indigo-200" /> : <FileText className="w-4 h-4 mr-2" />}
                <span>분석 결과 보고서 보기</span>
              </div>
            </Button>
          </div>
        </div>

        {/* 하단 가로 프로그레스 바 영역 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
            {/* 배경에 깔리는 미세한 무늬 (SaaS 느낌) */}
            <div className="absolute inset-0 opacity-10 bg-[length:20px_20px] bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.1)_50%,rgba(0,0,0,0.1)_75%,transparent_75%,transparent)]"></div>
            
            {/* 실제 채워지는 바 */}
            <div 
              className={`h-full transition-all duration-1000 ease-out relative ${
                isDone ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]'
              }`}
              style={{ width: `${progress}%` }}
            >
              {/* 바 끝부분의 빛 효과 */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 blur-[2px]"></div>
            </div>
          </div>
          <span className={`text-xs font-black font-mono w-10 text-right ${isDone ? 'text-emerald-600' : 'text-indigo-600'}`}>
            {progress}%
          </span>
        </div>
      </div>
      {/* --- 가로 바 형태의 세련된 프리미엄 상태 바 끝 --- */}

      <main className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center relative">
        {/* 배경 장식 (SaaS 느낌의 은은한 블러) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[5%] left-[10%] w-[30%] h-[30%] rounded-full bg-indigo-50/40 blur-[100px]"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-slate-100/50 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-5xl aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-[0_35px_70px_-15px_rgba(0,0,0,0.3)] border-[10px] border-white ring-1 ring-slate-200/50 relative z-10">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
        
        <div className="mt-10 flex flex-col items-center gap-2 relative z-10">
          <p className="text-slate-400 text-sm font-semibold italic flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            AI가 영상의 프레임과 메타데이터를 정밀 대조하고 있습니다.
          </p>
          {!isDone && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}