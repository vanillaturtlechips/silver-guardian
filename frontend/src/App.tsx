import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google'; 
import { useState } from "react";
import { AuthProvider } from "./features/auth/AuthContext";
import { MonitoringProvider, useMonitoringContext } from "@/context/MonitoringContext";
import { UserMenu } from "./features/auth/LoginComponents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, ShieldCheck } from "lucide-react";

import Index from "./pages/Index";
import AnalysisWatch from "./pages/AnalysisWatch";
import AnalysisResult from "./pages/AnalysisResult";
import MyPage from "./pages/MyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = "544714373795-2b23qrpm44e02c3hmmo19ovrdk81dvhi.apps.googleusercontent.com"; 

const GlobalHeader = () => {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const { startAnalysis, isAnalyzing } = useMonitoringContext();

  const handleSearch = async () => {
    if (!url) return;
    const result = await startAnalysis(url);
    
    // 타입 가드 적용하여 TS 에러 해결
    if (result && typeof result === 'object' && 'jobId' in result) {
      navigate(`/watch?url=${encodeURIComponent(url)}&jobId=${result.jobId}`);
      setUrl(""); 
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tighter text-slate-800">Silver Guardian</span>
      </div>

      <div className="flex-1 max-w-xl mx-12 flex items-center gap-2">
        <div className="relative flex-1 group">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-500" />
          <Input 
            placeholder="유튜브 링크를 넣어 즉시 분석하세요..." 
            className="pl-9 h-10 border-slate-100 bg-slate-50/50 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button size="sm" onClick={handleSearch} disabled={isAnalyzing} className="rounded-xl px-5 h-10 font-bold bg-slate-900">
          {isAnalyzing ? "중..." : "분석"}
        </Button>
      </div>

      <UserMenu />
    </header>
  );
};

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <MonitoringProvider>
              <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col font-sans">
                <GlobalHeader />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/watch" element={<AnalysisWatch />} /> 
                    <Route path="/result/:jobId" element={<AnalysisResult />} />
                    <Route path="/profile" element={<MyPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
              <Toaster />
              <Sonner />
            </MonitoringProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;