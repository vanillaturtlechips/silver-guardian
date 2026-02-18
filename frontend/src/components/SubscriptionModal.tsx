import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionModal({ open, onOpenChange }: SubscriptionModalProps) {
  const { upgradeToPro } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setLoading(true);
    
    // 가짜 결제 프로세스 (1.5초 지연)
    setTimeout(() => {
      setLoading(false);
      upgradeToPro(); // [핵심] 구독 상태를 Pro로 변경
      onOpenChange(false);
      
      toast({
        title: "💎 Pro 멤버십 가입 완료!",
        description: "이제 모든 심층 분석 리포트를 제한 없이 확인하세요.",
        duration: 3000,
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-amber-600">
            <Zap className="h-6 w-6 fill-amber-600" />
            Pro 플랜으로 업그레이드
          </DialogTitle>
          <DialogDescription>
            AI가 숨겨진 의도와 여론을 완벽하게 분석해드립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 text-center">
            <span className="text-3xl font-bold text-amber-900">₩4,900</span>
            <span className="text-sm text-amber-700 ml-1">/ 월</span>
          </div>
          
          <ul className="space-y-3 text-sm">
            {[
              "Gemini 심층 분석 리포트 무제한 열람",
              "댓글 여론 정밀 분석 (Best 5)",
              "숨겨진 상업적 의도 및 위험 요소 탐지",
              "지난 분석 기록 무제한 저장"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /> 
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button 
            className="w-full h-11 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md" 
            onClick={handleSubscribe} 
            disabled={loading}
          >
            {loading ? "결제 처리 중..." : "3초만에 구독하고 전체 보기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}