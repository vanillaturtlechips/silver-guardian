import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { LockedContent } from "@/components/LockedContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldCheck, AlertTriangle, FileText, Youtube, ThumbsUp, MessageCircle } from "lucide-react";

// gRPC 응답 데이터 타입 정의
interface AnalysisResultType {
  jobId: string;
  status: string;
  safetyScore: number;
  geminiResponse: string; // JSON String
  metadata?: {
    title: string;
    channel: string;
    viewCount: number;
    publishedAt: string;
    duration: number;
  };
  topComments?: {
    author: string;
    text: string;
    likes: number;
    rank: number;
  }[];
}

// Gemini 응답 파싱용 타입
interface ParsedGemini {
  summary: string;
  reasoning: string;
  concerns: string[];
  intent?: string; // 숨겨진 의도
}

export default function AnalysisResult() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // 로그인 여부 확인

  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ★ 핵심 비즈니스 로직: 로그인 안 했으면 상세 내용 잠금
  // (추후 user.subscription.planType === 'free' 조건 추가 가능)
  const isLocked = !user; 

  useEffect(() => {
    if (!jobId) {
      setError("잘못된 접근입니다.");
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const data = await api.getAnalysisResult(jobId);
        
        // 데이터 매핑 (gRPC 응답 구조에 맞춰 조정)
        setResult({
          jobId: data.jobId,
          status: data.status,
          safetyScore: data.safetyScore,
          geminiResponse: data.geminiResponse,
          metadata: data.metadata,
          topComments: data.topComments
        });

      } catch (err) {
        console.error("Fetch Error:", err);
        setError("분석 결과를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [jobId]);

  // 로딩 화면
  if (loading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-1" />
          <Skeleton className="h-64 col-span-2" />
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error || !result) {
    return (
      <div className="container mx-auto p-8 text-center flex flex-col items-center justify-center h-[50vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-bold">오류 발생</h2>
        <p className="text-muted-foreground">{error || "결과가 없습니다."}</p>
        <Button onClick={() => navigate("/")} variant="outline">홈으로 돌아가기</Button>
      </div>
    );
  }

  // Gemini JSON 파싱 (실패 시 기본값)
  let aiData: ParsedGemini = { summary: "분석 데이터 없음", reasoning: "", concerns: [] };
  try {
    if (result.geminiResponse) {
      aiData = JSON.parse(result.geminiResponse);
    }
  } catch (e) {
    console.error("JSON Parse Failed", e);
    // 텍스트가 JSON이 아닐 경우 통째로 summary로 처리
    aiData.summary = result.geminiResponse; 
  }

  // 안전 점수 색상 결정
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBorder = (score: number) => {
    if (score >= 80) return "border-l-green-500";
    if (score >= 50) return "border-l-yellow-500";
    return "border-l-red-500";
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* 1. 상단 네비게이션 */}
      <div className="flex flex-col gap-2">
        <Button variant="ghost" onClick={() => navigate("/")} className="w-fit pl-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> 새로운 분석하기
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI 분석 리포트</h1>
            <p className="text-muted-foreground mt-1">
              {result.metadata?.title || "Unknown Video"}
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {result.metadata?.channel || "Unknown Channel"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 2. 왼쪽 사이드바 (영상 정보 & 안전 점수) - 항상 공개 */}
        <div className="md:col-span-1 space-y-6">
          {/* 안전 점수 카드 */}
          <Card className={`overflow-hidden border-t-4 ${getScoreBorder(result.safetyScore).replace('border-l', 'border-t')}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-lg">안전 신뢰도</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="relative flex items-center justify-center">
                {/* 도넛 차트 배경 */}
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-muted/20" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    className={getScoreColor(result.safetyScore)}
                    strokeDasharray={351}
                    strokeDashoffset={351 - (351 * result.safetyScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`text-3xl font-bold ${getScoreColor(result.safetyScore)}`}>
                    {result.safetyScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <p className="mt-4 font-semibold text-center">
                {result.safetyScore >= 80 ? "매우 안전함" : result.safetyScore >= 50 ? "주의 필요" : "위험 감지됨"}
              </p>
            </CardContent>
          </Card>

          {/* 영상 메타데이터 */}
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><Youtube className="h-4 w-4"/> 조회수</span>
                <span className="font-medium">{result.metadata?.viewCount?.toLocaleString()}회</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">게시일</span>
                <span>{result.metadata?.publishedAt ? new Date(result.metadata.publishedAt).toLocaleDateString() : "-"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. 오른쪽 메인 컨텐츠 (핵심 분석) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* A. 3줄 요약 (항상 공개 - Free) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" /> 
                AI 3줄 요약
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed whitespace-pre-line">
                {aiData.summary}
              </p>
            </CardContent>
          </Card>

          {/* B. 상세 분석 (구독자 전용 - Locked) */}
          <LockedContent isLocked={isLocked} title="심층 분석 리포트">
            <Card className="border-l-4 border-blue-500 bg-slate-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  상세 판단 사유 & 숨겨진 의도
                </CardTitle>
                <CardDescription>AI가 분석한 영상의 논리적 허점과 상업적 의도입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {aiData.reasoning || "상세 분석 데이터가 없습니다."}
                </div>
                
                {aiData.concerns && aiData.concerns.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> 감지된 위험 요소
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {aiData.concerns.map((concern, idx) => (
                        <li key={idx}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </LockedContent>

          {/* C. 댓글 여론 분석 (구독자 전용 - Locked) */}
          <LockedContent isLocked={isLocked} title="댓글 여론 분석">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-500" />
                  베스트 댓글 여론
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.topComments?.slice(0, 5).map((comment, idx) => (
                    <li key={idx} className="bg-muted/40 p-3 rounded-lg text-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-primary">{comment.author}</span>
                        <div className="flex items-center text-xs text-muted-foreground gap-1">
                          <ThumbsUp className="h-3 w-3" /> {comment.likes}
                        </div>
                      </div>
                      <p className="text-slate-700">{comment.text}</p>
                    </li>
                  ))}
                  {(!result.topComments || result.topComments.length === 0) && (
                     <p className="text-muted-foreground text-center py-4">분석된 댓글이 없습니다.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </LockedContent>

        </div>
      </div>
    </div>
  );
}