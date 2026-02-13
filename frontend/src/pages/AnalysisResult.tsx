import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import { useMonitoringContext } from "@/context/MonitoringContext";

export default function AnalysisResult() {
  const navigate = useNavigate();
  // 전역 상태에서 분석 결과 가져오기
  const { analysisResult: result, videoId } = useMonitoringContext();

  // 결과가 없으면(새로고침 등) 메인으로 안내
  if (!result) {
    return (
      <div className="container mx-auto p-8 text-center flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground text-lg">분석 결과가 없습니다.</p>
        <Button onClick={() => navigate("/")} variant="outline">
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl py-8 space-y-6 animate-in fade-in duration-500">
      {/* 상단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          모니터링으로 돌아가기
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI 상세 분석 리포트</h1>
        <p className="text-muted-foreground">
          AI 탐정이 분석한 영상의 진위 여부와 위험 요소입니다.
        </p>
      </div>

      {/* 1. 요약 카드 (Summary) */}
      <Card className={`border-l-4 ${result.safety_score >= 80 ? "border-l-green-500" : result.safety_score >= 50 ? "border-l-yellow-500" : "border-l-red-500"}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {result.safety_score >= 80 ? (
              <ShieldCheck className="h-6 w-6 text-green-600" />
            ) : result.safety_score >= 50 ? (
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-red-600" />
            )}
            분석 요약
          </CardTitle>
          <CardDescription>
            AI Engine Assessment Results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-lg font-medium leading-relaxed">
            {result.summary}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
             신뢰 점수: <span className={`font-bold text-base ${
               result.safety_score >= 80 ? "text-green-600" : result.safety_score >= 50 ? "text-yellow-600" : "text-red-600"
             }`}>{result.safety_score}점</span> / 100점
          </div>
        </CardContent>
      </Card>

      {/* 2. 상세 분석 내용 (Reasoning) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            상세 판단 사유
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-loose">
            {result.reasoning}
          </div>
        </CardContent>
      </Card>

      {/* 3. 우려 사항 (Concerns) - 있을 때만 표시 */}
      {result.concerns && result.concerns.length > 0 && (
        <Card className="border-red-100 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-red-700 text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              감지된 위험 키워드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.concerns.map((concern, idx) => (
                <li key={idx} className="flex items-center gap-2 text-red-800 bg-white/50 px-3 py-2 rounded-md text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {concern}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 하단 버튼 */}
      <div className="flex justify-center pt-8">
         <Button size="lg" onClick={() => navigate("/")} className="w-full sm:w-auto">
            새로운 영상 분석하기
         </Button>
      </div>
    </div>
  );
}