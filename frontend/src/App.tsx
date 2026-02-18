import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google'; 
import { AuthProvider } from "./features/auth/AuthContext";
import { UserMenu } from "./features/auth/LoginComponents";
import Index from "./pages/Index";
import AnalysisResult from "./pages/AnalysisResult";
import MyPage from "./pages/MyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const GOOGLE_CLIENT_ID = "544714373795-2b23qrpm44e02c3hmmo19ovrdk81dvhi.apps.googleusercontent.com"; // [필수] 발급받은 ID 입력

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground relative">
            <BrowserRouter>
              {/* 헤더: UserMenu를 BrowserRouter 안으로 이동 */}
              <header className="absolute top-4 right-4 z-50">
                 <UserMenu />
              </header>

              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/result/:jobId" element={<AnalysisResult />} />
                <Route path="/profile" element={<MyPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;