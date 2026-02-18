import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isPro: boolean; // [NEW] 구독 상태
  login: (googleIdToken: string) => Promise<void>;
  logout: () => void;
  upgradeToPro: () => void; // [NEW] 구독 업그레이드 함수
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedIsPro = localStorage.getItem('isPro') === 'true'; // 로컬스토리지에서 구독 상태 복구

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) throw new Error('Token expired');
        
        setUser({
            id: decoded.user_id?.toString() || decoded.sub, 
            email: decoded.email,
            name: decoded.name || 'User',
            picture: decoded.picture || ''
        });
        setIsPro(storedIsPro); 

      } catch (e) {
        console.error("Invalid token", e);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (googleIdToken: string) => {
    try {
      const response = await api.loginWithGoogle(googleIdToken);
      const { accessToken, user: serverUser } = response; 

      if (!accessToken || !serverUser) throw new Error("Invalid response");

      localStorage.setItem('accessToken', accessToken);
      
      setUser({
        id: serverUser.id.toString(),
        email: serverUser.email,
        name: serverUser.name,
        picture: serverUser.pictureUrl
      });
      
      // 실제로는 여기서 서버의 구독 정보를 확인해야 함
      // const profile = await api.getUserProfile(serverUser.id.toString());
      // if (profile.subscription?.planType === 'pro') { setIsPro(true); localStorage.setItem('isPro', 'true'); }
      
      toast({ title: "로그인 성공", description: `환영합니다, ${serverUser.name}님!` });
    } catch (error) {
      console.error("Login failed", error);
      toast({ title: "로그인 실패", description: "오류가 발생했습니다.", variant: "destructive" });
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('isPro'); 
    setUser(null);
    setIsPro(false);
    toast({ title: "로그아웃 되었습니다." });
  };

  // [NEW] Mockup 결제 성공 처리
  const upgradeToPro = () => {
    setIsPro(true);
    localStorage.setItem('isPro', 'true'); 
    // TODO: 실제 백엔드 API 호출 (Subscribe) 추가 필요
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, isPro, login, logout, upgradeToPro, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};