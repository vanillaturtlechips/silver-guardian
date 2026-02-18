import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from './AuthContext';
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

// 1. 로그인 버튼
export function LoginButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { login } = useAuth();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>로그인</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>로그인</DialogTitle>
          <DialogDescription>
            3초 만에 구글로 시작하고 분석 결과를 저장하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-6">
           <GoogleLogin
              onSuccess={credentialResponse => {
                  if (credentialResponse.credential) {
                      login(credentialResponse.credential);
                      setIsOpen(false);
                  }
              }}
              onError={() => console.log('Login Failed')}
              theme="filled_black"
              shape="pill"
              text="continue_with"
           />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 2. 유저 메뉴 (아바타)
export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return <LoginButton />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent">
          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
            <AvatarImage src={user.picture} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>마이페이지</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}