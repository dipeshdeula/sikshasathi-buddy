import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "i18next", "react-i18next"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query", "i18next", "react-i18next", "i18next-browser-languagedetector"],
    force: true,
  },
}));
