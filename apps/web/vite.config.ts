import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@cyberstreams/osint-panel": path.resolve(__dirname, "../../packages/osint-panel/src/index.ts")
    }
  },
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
