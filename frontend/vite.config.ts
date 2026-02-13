import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000, // 8080 -> 3000 등으로 변경 (또는 이 줄을 지우면 기본값 5173 사용)
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // CommonJS 지원 추가
  optimizeDeps: {
    include: ['google-protobuf', '@improbable-eng/grpc-web'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    commonjsOptions: {
      include: [/generated/, /node_modules/],
      transformMixedEsModules: true
    }
  }
}));