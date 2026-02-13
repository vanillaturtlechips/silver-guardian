import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AnalysisResult from "./pages/AnalysisResult";
import NotFound from "./pages/NotFound";
import { MonitoringProvider } from "./context/MonitoringContext"; // ★ 추가

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* ★ MonitoringProvider로 감싸기 */}
      <MonitoringProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/result" element={<AnalysisResult />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </MonitoringProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;