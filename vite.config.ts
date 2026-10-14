/// <reference types="vitest" />
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

function spa404Plugin() {
  return {
    name: "spa-404-fallback",
    closeBundle() {
      const distDir = path.resolve("dist");
      const indexPath = path.join(distDir, "index.html");
      const notFoundPath = path.join(distDir, "404.html");
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
        fs.writeFileSync(path.join(distDir, ".nojekyll"), "");
      }
    },
  };
}

// Vite + React + absolute "@/" imports (convention from bulletproof-react project-standards.md).
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || "/",
  plugins: [react(), viteTsconfigPaths(), spa404Plugin()],
  server: {
    port: 5173,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/testing/setup-tests.ts",
    css: true,
  },
}));
