// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractYouTubeId } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Play, History, CreditCard, ExternalLink, ShieldCheck, 
  Zap, Check, Settings, Bell, Sparkles, Youtube, RefreshCw
} from "lucide-react";

export default function MyPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const subscriptionMock = { plan: "Free", usage: 3, limit: 5, nextBilling: "2026-03-18", card: "Visa **** 1234" };

  const fetchHistory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await api.getUserAnalysisHistory(user.id);
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("히스토리 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24 font-sans antialiased">
      <div className="max-w-6xl mx-auto px-8 py-12 space-y-12">
        
        <header className="flex justify-between items-end animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Dashboard</h2>
            <p className="text-slate-400 font-medium">{user?.name || "사용자"}님의 분석 데이터입니다.</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" onClick={fetchHistory} className="rounded-xl border-slate-200 font-bold hover:bg-white">
               <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}/> 새로고침
             </Button>
             <Button variant="outline" className="rounded-xl border-slate-200 font-bold hover:bg-white">
               <Settings className="w-4 h-4 mr-2"/> 설정
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 요금제 상태 카드 */}
            <Card className="rounded-[3rem] border-none shadow-2xl shadow-indigo-100/50 bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 px-10 py-8 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Subscription</CardTitle>
                    <CardDescription className="font-medium text-slate-400 italic">현재 {subscriptionMock.plan} 요금제를 사용 중입니다.</CardDescription>
                  </div>
                  <Badge className="bg-indigo-600 px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200">Pro Upgrade</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-600 font-sans">분석 사용량</span>
                    <span className="text-indigo-600 font-mono font-black">{subscriptionMock.usage} / {subscriptionMock.limit}</span>
                  </div>
                  <Progress value={(subscriptionMock.usage / subscriptionMock.limit) * 100} className="h-3 bg-slate-100 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Next Billing</span>
                    <p className="font-bold text-slate-700 font-mono">{subscriptionMock.nextBilling}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Payment Method</span>
                    <p className="font-bold text-slate-700 flex items-center gap-2 font-sans">
                      <CreditCard className="w-4 h-4 text-slate-400" /> {subscriptionMock.card}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 히스토리 목록 */}
            <section className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3 italic uppercase px-2">
                <History className="w-6 h-6 text-indigo-600" /> Analysis History
              </h3>
              
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-64 rounded-[2.5rem]" />
                  <Skeleton className="h-64 rounded-[2.5rem]" />
                </div>
              ) : history.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {history.map((item, index) => {
                    // videoUrl이 순수 ID거나 전체 URL이거나 모두 처리
                    const videoId = extractYouTubeId(item.videoUrl);
                    const thumbUrl = videoId
                      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                      : `https://placehold.co/480x270?text=No+Preview`;

                    // jobId가 없거나 빈 문자열인 경우 index로 fallback → key 충돌 방지
                    const uniqueKey = item.jobId && item.jobId !== ""
                      ? item.jobId
                      : `history-item-${index}`;

                    return (
                      <Card 
                        key={`${item.jobId}-${index}`}
                        className="group rounded-[2.5rem] border-none shadow-md hover:shadow-2xl transition-all cursor-pointer bg-white overflow-hidden"
                        onClick={() => navigate(`/result/${item.jobId}?url=${encodeURIComponent(item.videoUrl || "")}`)}
                      >
                        <div className="relative aspect-video bg-slate-100 overflow-hidden">
                          <img
                            src={thumbUrl}
                            alt={item.title || "썸네일"}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                              // 유튜브 썸네일 로드 실패 시 placehold.co로 대체
                              e.currentTarget.src = "https://placehold.co/480x270?text=No+Preview";
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                            <Play className="text-white fill-current w-8 h-8 transform group-hover:scale-110 transition-transform" />
                          </div>
                          <Badge className="absolute top-4 right-4 bg-white/90 backdrop-blur-md text-slate-900 font-black border-none px-3 py-1 shadow-sm z-20">
                            {item.safetyScore ?? 0}점
                          </Badge>
                        </div>
                        <CardContent className="p-6">
                          <h4 className="font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {item.title || "제목 없음"}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 italic tracking-widest">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString('ko-KR') : "날짜 없음"}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="p-20 bg-white rounded-[4rem] border border-dashed border-slate-200 text-center flex flex-col items-center">
                  <ShieldCheck className="w-12 h-12 text-slate-200 mb-6" />
                  <p className="text-slate-500 font-bold text-lg">아직 분석 기록이 없습니다.</p>
                  <Button
                    onClick={() => navigate('/')}
                    className="mt-8 rounded-full bg-slate-900 px-10 h-14 font-black text-white shadow-xl active:scale-95 transition-all"
                  >
                    첫 분석 시작하기
                  </Button>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-1000">
            <Card className="rounded-[3rem] border-none shadow-2xl bg-indigo-600 text-white overflow-hidden relative group">
              <Zap className="absolute top-[-10%] right-[-10%] w-32 h-32 text-white/10 rotate-12 transition-transform group-hover:scale-110" />
              <CardContent className="p-10 flex flex-col items-center text-center relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md">
                  <Sparkles className="w-8 h-8 text-white group-hover:animate-pulse" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-2 italic">Silver Guardian PRO</h3>
                <p className="text-indigo-100 text-sm font-medium mb-10 leading-relaxed">
                  딥페이크 정밀 분석 알고리즘과<br/>댓글 여론 조작 리포트를 해제하세요.
                </p>
                <div className="w-full space-y-4 mb-10 text-left">
                  {["정밀 딥페이크 탐지", "댓글 여론 조작 분석", "광고/선동 의도 파악", "PDF 정밀 리포트"].map((f) => (
                    <div key={f} className="flex items-center gap-3 text-xs font-bold text-indigo-50">
                      <div className="bg-emerald-400/20 p-1 rounded-md">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <Button className="w-full h-16 rounded-[1.5rem] bg-white text-indigo-600 hover:bg-slate-50 font-black shadow-2xl text-lg transition-all active:scale-95">
                  구독 업그레이드
                </Button>
              </CardContent>
            </Card>
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full h-14 rounded-2xl border border-slate-200 font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
            >
              로그아웃
            </Button>
          </aside>

        </div>
      </div>
    </div>
  );
}