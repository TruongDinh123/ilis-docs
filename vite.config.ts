/// <reference types="vitest" />
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

function resolvePythonExecutable(): string {
  const candidates = [
    "E:\\optimize_file\\.venv\\Scripts\\python.exe",
    path.resolve("..", ".venv", "Scripts", "python.exe"),
    "python",
  ];
  for (const candidate of candidates) {
    if (candidate === "python" || fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "python";
}

function pythonOptimizerPlugin(): Plugin {
  return {
    name: "ilis-python-file-optimizer",
    configureServer(server) {
      server.middlewares.use("/api/optimize", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        const rawNameHeader = req.headers["x-file-name"];
        const targetMbHeader = req.headers["x-target-mb"];
        const fileName =
          typeof rawNameHeader === "string" && rawNameHeader
            ? decodeURIComponent(rawNameHeader)
            : "document.pdf";
        const targetMb =
          typeof targetMbHeader === "string" && !Number.isNaN(parseFloat(targetMbHeader))
            ? parseFloat(targetMbHeader)
            : 15.0;

        if (targetMb <= 0.05) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ detail: "target_mb phải lớn hơn 0.05 MB" }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        req.on("end", () => {
          const inputBuffer = Buffer.concat(chunks);
          const tmpId = crypto.randomBytes(8).toString("hex");
          const ext = path.extname(fileName) || ".bin";
          const inPath = path.join(os.tmpdir(), `ilis_opt_in_${tmpId}${ext}`);
          const outPath = path.join(os.tmpdir(), `ilis_opt_out_${tmpId}${ext}`);
          const scriptPath = path.resolve("scripts", "optimize-server", "cli_optimize.py");
          const pythonExe = resolvePythonExecutable();

          try {
            fs.writeFileSync(inPath, inputBuffer);
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
            return;
          }

          execFile(
            pythonExe,
            [scriptPath, inPath, outPath, fileName, String(targetMb)],
            { maxBuffer: 10 * 1024 * 1024 },
            (error, stdout, stderr) => {
              try {
                if (error || !fs.existsSync(outPath)) {
                  console.error("[ilis-python-file-optimizer] Error:", error, stderr);
                  res.statusCode = 500;
                  res.end(stderr || String(error));
                  return;
                }

                const optimizedBuffer = fs.readFileSync(outPath);
                let meta = {
                  original_size: inputBuffer.byteLength,
                  optimized_size: optimizedBuffer.byteLength,
                  method: "pymupdf_optimized",
                };
                try {
                  const parsed = JSON.parse(stdout.trim());
                  if (parsed && typeof parsed === "object") {
                    meta = { ...meta, ...parsed };
                  }
                } catch {
                  // Ignore JSON parse fallback
                }

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/octet-stream");
                res.setHeader("X-Original-Size", String(meta.original_size));
                res.setHeader("X-Optimized-Size", String(meta.optimized_size));
                res.setHeader("X-Method", String(meta.method));
                res.setHeader(
                  "Access-Control-Expose-Headers",
                  "X-Original-Size, X-Optimized-Size, X-Method",
                );
                res.end(optimizedBuffer);
              } finally {
                try {
                  if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
                  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
                } catch {
                  // Ignore temp cleanup errors
                }
              }
            },
          );
        });
      });
    },
  };
}

function spa404Plugin(): Plugin {
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
export default defineConfig(({ mode: _mode }) => ({
  base: process.env.BASE_PATH || "/",
  plugins: [react(), viteTsconfigPaths(), pythonOptimizerPlugin(), spa404Plugin()],
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
