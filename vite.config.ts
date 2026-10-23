import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Mesmo encaminhamento do vercel.json, para os webhooks do n8n funcionarem em dev
    proxy: {
      "/api/n8n/nova": {
        target: "http://72.60.7.155:5678",
        changeOrigin: true,
        rewrite: () => "/webhook/8ca0b57f-4a07-41e9-8f90-7839821235ed",
      },
      "/api/n8n/aprovacao": {
        target: "http://72.60.7.155:5678",
        changeOrigin: true,
        rewrite: () => "/webhook/06bec45c-a4a9-4bdc-a4cd-a9c1fb64247d",
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
