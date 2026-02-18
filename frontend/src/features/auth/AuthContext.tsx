// @ts-nocheck
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
  isPro: boolean;
  login: (googleIdToken: string) => Promise<void>;
  logout: () => void;
  upgradeToPro: () => void;
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
    const storedIsPro = localStorage.getItem('isPro') === 'true';

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
      // [중요] 백엔드 DB 저장을 위해 토큰에서 유저 정보를 먼저 해독합니다.
      const decoded: any = jwtDecode(googleIdToken);
      
      // [핵심] api.ts의 정의에 맞춰 4개의 인자를 정확히 전달합니다.
      const response = await api.loginWithGoogle(
        googleIdToken,
        decoded.email || "",
        decoded.name || "User",
        decoded.picture || ""
      );

      const { accessToken, user: serverUser } = response; 

      if (!accessToken || !serverUser) throw new Error("Invalid response");

      localStorage.setItem('accessToken', accessToken);
      
      // 서버에서 내려준 정보를 상태에 저장
      setUser({
        id: serverUser.id?.toString() || serverUser.userId || decoded.sub,
        email: serverUser.email,
        name: serverUser.name,
        picture: serverUser.pictureUrl || decoded.picture
      });
      
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

  const upgradeToPro = () => {
    setIsPro(true);
    localStorage.setItem('isPro', 'true'); 
    toast({ title: "Pro 업그레이드 완료!", description: "이제 모든 기능을 무제한으로 이용하실 수 있습니다." });
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