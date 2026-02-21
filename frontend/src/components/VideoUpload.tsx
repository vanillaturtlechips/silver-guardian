import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileVideo, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnalysisServiceClientImpl } from "@/generated/analysis";
import { GrpcWebImpl } from "@/generated/analysis";
import axios from "axios";

const grpcUrl = import.meta.env.VITE_GRPC_URL || "http://localhost:8080";
const rpc = new GrpcWebImpl(grpcUrl, {});
const client = new AnalysisServiceClientImpl(rpc);

interface VideoUploadProps {
  onUploadComplete?: (s3Key: string, uploadId: string) => void;
  userId?: string;
}

export default function VideoUpload({ onUploadComplete, userId = "guest" }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("video/")) {
      setFile(droppedFile);
    } else {
      toast({
        title: "잘못된 파일 형식",
        description: "동영상 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith("video/")) {
      setFile(selectedFile);
    } else {
      toast({
        title: "잘못된 파일 형식",
        description: "동영상 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      // 1. Presigned URL 요청
      const urlResponse = await client.GetUploadURL({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        userId: userId,
      });

      // 2. S3에 직접 업로드
      await axios.put(urlResponse.uploadUrl, file, {
        headers: {
          "Content-Type": file.type,
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      setUploadStatus("success");
      toast({
        title: "업로드 완료!",
        description: "영상이 성공적으로 업로드되었습니다.",
      });

      onUploadComplete?.(urlResponse.s3Key, urlResponse.uploadId);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("error");
      toast({
        title: "업로드 실패",
        description: "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">동영상을 드래그하거나 클릭하세요</p>
            <p className="text-sm text-muted-foreground">MP4, MOV, AVI 등 지원</p>
            <input
              id="file-input"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <FileVideo className="w-10 h-10 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {uploadStatus === "idle" && (
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              {uploadStatus === "success" && (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              )}
              {uploadStatus === "error" && (
                <AlertCircle className="w-6 h-6 text-destructive" />
              )}
            </div>

            {uploadStatus === "uploading" && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">업로드 중...</span>
                  <span className="font-semibold">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {uploadStatus === "idle" && (
              <Button onClick={handleUpload} className="w-full" size="lg">
                <Upload className="w-4 h-4 mr-2" />
                업로드 시작
              </Button>
            )}

            {uploadStatus === "success" && (
              <Button onClick={handleReset} variant="outline" className="w-full">
                다른 파일 업로드
              </Button>
            )}

            {uploadStatus === "error" && (
              <div className="flex gap-2">
                <Button onClick={handleUpload} variant="default" className="flex-1">
                  다시 시도
                </Button>
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  취소
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
