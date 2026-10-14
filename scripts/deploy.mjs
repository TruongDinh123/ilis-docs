import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🚀 Bắt đầu quá trình build và deploy production lên GitHub Pages...");

// 1. Build
execSync("npm run build", { stdio: "inherit" });

// 2. Đẩy sang nhánh gh-pages
const distDir = path.resolve("dist");
const repoUrl = "https://github.com/TruongDinh123/ilis-docs.git";

console.log("📦 Đang đẩy bundle lên nhánh gh-pages...");
execSync("git init", { cwd: distDir, stdio: "ignore" });
execSync("git checkout -B gh-pages", { cwd: distDir, stdio: "ignore" });
execSync('git config user.name "TruongDinh123"', { cwd: distDir, stdio: "ignore" });
execSync('git config user.email "dinhtq170601@gmail.com"', { cwd: distDir, stdio: "ignore" });
execSync('git config credential.helper ""', { cwd: distDir, stdio: "ignore" });
execSync('git config --add credential.helper "!\'C:/Program Files/GitHub CLI/gh.exe\' auth git-credential"', { cwd: distDir, stdio: "ignore" });
execSync("git config http.postBuffer 524288000", { cwd: distDir, stdio: "ignore" });
execSync("git config http.version HTTP/1.1", { cwd: distDir, stdio: "ignore" });
execSync(`git remote add origin ${repoUrl}`, { cwd: distDir, stdio: "ignore" });
execSync("git add -A", { cwd: distDir, stdio: "inherit" });
execSync('git commit -m "deploy: update production build"', { cwd: distDir, stdio: "inherit" });
execSync("git push -f -u origin gh-pages", { cwd: distDir, stdio: "inherit" });

// Dọn dẹp .git trong dist
fs.rmSync(path.join(distDir, ".git"), { recursive: true, force: true });

console.log("✅ Deploy thành công! Cổng cẩm nang điện tử iLIS Cà Mau đã sẵn sàng tại: https://truongdinh123.github.io/ilis-docs/");
