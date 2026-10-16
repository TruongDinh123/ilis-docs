import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

console.log("🚀 Bắt đầu quá trình build và deploy production...");

// 1. Build & Deploy lên Firebase Hosting (Google Cloud)
console.log("☁️  1/2: Đang build và deploy lên Google Cloud Firebase Hosting...");
execSync("npm run build", { stdio: "inherit", env: { ...process.env, BASE_PATH: "/" } });
execSync("firebase deploy --only hosting", { stdio: "inherit" });

// 2. Build & Deploy lên GitHub Pages
console.log("🐙 2/2: Đang build và deploy lên GitHub Pages...");
execSync("npm run build", {
  stdio: "inherit",
  env: { ...process.env, BASE_PATH: "/ilis-docs/" },
});

const distDir = path.resolve("dist");
const repoUrl = "https://github.com/TruongDinh123/ilis-docs.git";

// Loại bỏ tạm tệp video lớn >100MB khỏi commit gh-pages để không bị GitHub chặn limit 100MB
// (Trên GitHub Pages, video tự động stream trực tiếp từ CDN của Firebase Hosting: https://ilis-docs-vnpt-camau.web.app/DaoTao_TapHuan.mp4)
const largeVideoDist = path.join(distDir, "DaoTao_TapHuan.mp4");
const tempBackup = path.resolve(".DaoTao_TapHuan_backup.mp4");
let hasLargeVideo = false;
if (fs.existsSync(largeVideoDist)) {
  fs.renameSync(largeVideoDist, tempBackup);
  hasLargeVideo = true;
}

try {
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
  execSync('git commit -m "deploy: update production build with Tap Huan Su Dung category"', { cwd: distDir, stdio: "inherit" });
  execSync("git push -f -u origin gh-pages", { cwd: distDir, stdio: "inherit" });
} finally {
  if (hasLargeVideo && fs.existsSync(tempBackup)) {
    fs.renameSync(tempBackup, largeVideoDist);
  }
  fs.rmSync(path.join(distDir, ".git"), { recursive: true, force: true });
}

console.log("✅ Deploy thành công cả 2 nền tảng production!");
console.log("🌐 1. Google Cloud Firebase: https://ilis-docs-vnpt-camau.web.app/");
console.log("🌐 2. GitHub Pages:          https://truongdinh123.github.io/ilis-docs/");
