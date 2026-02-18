import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { SubscriptionModal } from "./SubscriptionModal";
import { useAuth } from "@/features/auth/AuthContext";

interface LockedContentProps {
  children: ReactNode;
  isLocked: boolean; // true면 잠금
  title?: string;
}

export function LockedContent({ children, isLocked, title = "Pro 리포트" }: LockedContentProps) {
  const [showModal, setShowModal] = useState(false);
  const { isLoggedIn } = useAuth();

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      {/* 컨텐츠 (블러 처리) */}
      <div className="blur-md select-none pointer-events-none opacity-50 transition-all duration-500">
        {children}
      </div>

      {/* 오버레이 (잠금 아이콘 & 버튼) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
        <div className="bg-background/80 backdrop-blur-sm p-6 rounded-xl border shadow-lg max-w-sm w-full space-y-4">
          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              이 분석의 핵심 내용은 <br /> 구독자 전용입니다.
            </p>
          </div>
          <Button 
            className="w-full font-semibold" 
            onClick={() => setShowModal(true)}
          >
            {isLoggedIn ? "구독하고 결과 확인하기" : "로그인하고 확인하기"}
          </Button>
        </div>
      </div>

      <SubscriptionModal open={showModal} onOpenChange={setShowModal} />
    </div>
  );
}