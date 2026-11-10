/// <reference types="vitest" />
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePythonExecutable(): string {
  const candidates = [
    path.resolve(__dirname, "..", ".venv", "Scripts", "python.exe"),
    "E:\\optimize_file\\.venv\\Scripts\\python.exe",
    "python",
  ];
  for (const candidate of candidates) {
    if (candidate === "python" || fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "python";
}

/**
 * If a multipart/form-data body is sent to the Vite middleware, extract the raw file payload,
 * filename, and target_mb field so both raw binary requests and FormData requests work reliably.
 */
function extractPayloadFromBuffer(
  rawBuffer: Buffer,
  contentType: string,
  defaultFileName: string,
  defaultTargetMb: number,
): { fileBuffer: Buffer; fileName: string; targetMb: number } {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    return {
      fileBuffer: rawBuffer,
      fileName: defaultFileName,
      targetMb: defaultTargetMb,
    };
  }

  const boundary = `--${(boundaryMatch[1] || boundaryMatch[2] || "").trim()}`;
  const rawStr = rawBuffer.toString("latin1");
  const parts = rawStr.split(boundary);

  let fileBuffer = rawBuffer;
  let fileName = defaultFileName;
  let targetMb = defaultTargetMb;

  for (const part of parts) {
    if (!part || part === "--\r\n" || part === "--") continue;
    const headerEndIdx = part.indexOf("\r\n\r\n");
    if (headerEndIdx === -1) continue;

    const headerStr = part.slice(0, headerEndIdx);
    const bodyLatin1 = part.slice(headerEndIdx + 4).replace(/\r\n$/, "");

    if (/name="target_mb"/i.test(headerStr)) {
      const parsed = parseFloat(bodyLatin1.trim());
      if (!Number.isNaN(parsed) && parsed > 0.05) {
        targetMb = parsed;
      }
    } else if (/name="file"/i.test(headerStr)) {
      const fnMatch = headerStr.match(/filename="([^"]+)"/i);
      if (fnMatch && fnMatch[1]) {
        try {
          fileName = Buffer.from(fnMatch[1], "latin1").toString("utf8");
        } catch {
          fileName = fnMatch[1];
        }
      }
      fileBuffer = Buffer.from(bodyLatin1, "latin1");
    }
  }

  return { fileBuffer, fileName, targetMb };
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
        const contentType = String(req.headers["content-type"] || "");

        const defaultFileName =
          typeof rawNameHeader === "string" && rawNameHeader
            ? decodeURIComponent(rawNameHeader)
            : "document.pdf";
        const defaultTargetMb =
          typeof targetMbHeader === "string" && !Number.isNaN(parseFloat(targetMbHeader))
            ? parseFloat(targetMbHeader)
            : 15.0;

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        req.on("end", () => {
          const rawBuffer = Buffer.concat(chunks);
          const { fileBuffer, fileName, targetMb } = extractPayloadFromBuffer(
            rawBuffer,
            contentType,
            defaultFileName,
            defaultTargetMb,
          );

          if (targetMb <= 0.05) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ detail: "target_mb phải lớn hơn 0.05 MB" }));
            return;
          }

          const tmpId = crypto.randomBytes(8).toString("hex");
          const ext = path.extname(fileName) || ".pdf";
          const inPath = path.join(os.tmpdir(), `ilis_opt_in_${tmpId}${ext}`);
          const outPath = path.join(os.tmpdir(), `ilis_opt_out_${tmpId}${ext}`);
          const scriptPath = path.resolve(__dirname, "scripts", "optimize-server", "cli_optimize.py");
          const pythonExe = resolvePythonExecutable();

          try {
            fs.writeFileSync(inPath, fileBuffer);
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
            return;
          }

          execFile(
            pythonExe,
            [scriptPath, inPath, outPath, fileName, String(targetMb)],
            { maxBuffer: 20 * 1024 * 1024, timeout: 180_000 },
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
                  original_size: fileBuffer.byteLength,
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
