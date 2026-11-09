import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileArchive,
  FileUp,
  FolderOpen,
  FolderOutput,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  SUPPORTED_EXTENSIONS,
  buildZipArchiveBytes,
  computeBatchSummary,
  filterFileItems,
  formatFileSize,
  generateSampleDatasetFiles,
  getFileExt,
  getThresholdBytes,
  isEffectiveOverLimit,
  optimizeFileItem,
  readBlobBytes,
  readEntryRecursively,
  reevaluateFileItems,
  toBlobPart,
} from "../services/file-optimizer.service";
import type {
  FileFilterTab,
  FileOptimizerItem,
  RawFileEntry,
  WebkitFileSystemEntry,
} from "../services/file-optimizer.service";
import { SectionShell } from "./section-shell";
import styles from "./file-optimizer.module.css";

const PRESET_THRESHOLDS = [5, 10, 15, 20] as const;

interface DirectoryPickerHandle {
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<DirectoryPickerHandle>;
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export interface FileOptimizerToolProps {
  /** Chế độ hiển thị độc lập toàn màn hình khi mở ở cửa sổ riêng (/toi-uu-file) */
  standalone?: boolean;
}

export function FileOptimizerTool({ standalone = false }: FileOptimizerToolProps = {}) {
  const uid = useId();
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nextIdRef = useRef<number>(1);

  const [thresholdMb, setThresholdMb] = useState<number>(15);
  const [thresholdInputStr, setThresholdInputStr] = useState<string>("15");
  const [fileItems, setFileItems] = useState<FileOptimizerItem[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FileFilterTab>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [exportAllTree, setExportAllTree] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressVisible, setProgressVisible] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const baseUrl = import.meta.env.BASE_URL || "/";
  const standaloneHref = `${baseUrl.replace(/\/$/, "")}/toi-uu-file`;

  const setFolderInputAttrs = useCallback((el: HTMLInputElement | null) => {
    folderInputRef.current = el;
    if (el) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }, []);

  const addFilesToState = useCallback(
    (rawList: RawFileEntry[]) => {
      if (rawList.length === 0) return;
      const limit = getThresholdBytes(thresholdMb);
      let skippedCount = 0;

      setFileItems((prev) => {
        const next = [...prev];
        let added = 0;

        for (const entry of rawList) {
          const file = entry.file;
          const relPath = (
            entry.relativePath ||
            (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
            file.name
          ).replace(/\\/g, "/");
          const ext = getFileExt(file.name);

          if (!SUPPORTED_EXTENSIONS.has(ext)) {
            skippedCount++;
            continue;
          }

          const exists = next.some((x) => x.relativePath === relPath && x.origSize === file.size);
          if (exists) continue;

          const over = file.size > limit;
          next.push({
            id: nextIdRef.current++,
            file,
            name: file.name,
            relativePath: relPath,
            ext,
            origSize: file.size,
            selected: over,
            status: over ? "over" : "valid",
            optimizedBlob: null,
            optimizedSize: null,
            method: null,
          });
          added++;
        }

        if (added === 0 && rawList.length > 0) {
          setBannerMessage(
            "Không tìm thấy file hợp lệ mới (chỉ nhận PDF, JPG, JPEG, PNG, SVG, WEBP, TIFF, BMP, GIF).",
          );
          return prev;
        }

        if (skippedCount > 0) {
          setBannerMessage(
            `Đã nạp ${added} file hồ sơ hợp lệ (tự động loại trừ ${skippedCount} file Word/Excel/PPT/Video không thuộc phạm vi tối ưu).`,
          );
        } else {
          setBannerMessage(null);
        }

        next.sort((a, b) => b.origSize - a.origSize);
        return next;
      });
    },
    [thresholdMb],
  );

  const handleThresholdChange = useCallback((newMb: number, rawStr?: string) => {
    const safeMb = Number.isFinite(newMb) && newMb > 0.05 ? newMb : 15;
    setThresholdMb(safeMb);
    setThresholdInputStr(rawStr ?? String(safeMb));
    setFileItems((prev) => reevaluateFileItems(prev, safeMb));
  }, []);

  const handleFolderInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const list: RawFileEntry[] = Array.from(files).map((f) => ({
        file: f,
        relativePath:
          (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      }));
      addFilesToState(list);
      e.target.value = "";
    },
    [addFilesToState],
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const list: RawFileEntry[] = Array.from(files).map((f) => ({
        file: f,
        relativePath: f.name,
      }));
      addFilesToState(list);
      e.target.value = "";
    },
    [addFilesToState],
  );

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (isProcessing) return;

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const firstItem = items[0] as DataTransferItem & {
          webkitGetAsEntry?: () => WebkitFileSystemEntry | null;
        };
        if (typeof firstItem.webkitGetAsEntry === "function") {
          const collected: RawFileEntry[] = [];
          for (let i = 0; i < items.length; i++) {
            const dtItem = items[i] as DataTransferItem & {
              webkitGetAsEntry?: () => WebkitFileSystemEntry | null;
            };
            const entry = dtItem.webkitGetAsEntry?.();
            if (entry) {
              const sub = await readEntryRecursively(entry, "");
              collected.push(...sub);
            }
          }
          addFilesToState(collected);
          return;
        }
      }

      const list: RawFileEntry[] = Array.from(e.dataTransfer.files).map((f) => ({
        file: f,
        relativePath:
          (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      }));
      addFilesToState(list);
    },
    [addFilesToState, isProcessing],
  );

  const handleLoadSampleDataset = useCallback(() => {
    if (isProcessing) return;
    const samples = generateSampleDatasetFiles();
    addFilesToState(samples);
    setBannerMessage(
      "Đã nạp Bộ hồ sơ mẫu kiểm thử (gồm 4 file >15MB BÁO ĐỎ và 3 file <15MB Đạt chuẩn trong cấu trúc thư mục xã).",
    );
  }, [addFilesToState, isProcessing]);

  const handleClearAll = useCallback(() => {
    if (isProcessing) return;
    setFileItems([]);
    setProgressVisible(false);
    setBannerMessage(null);
  }, [isProcessing]);

  const stats = useMemo(
    () => computeBatchSummary(fileItems, thresholdMb),
    [fileItems, thresholdMb],
  );

  const filteredItems = useMemo(
    () => filterFileItems(fileItems, currentFilter, searchQuery, thresholdMb),
    [fileItems, currentFilter, searchQuery, thresholdMb],
  );

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => item.selected);

  const handleToggleSelectAll = useCallback(
    (checked: boolean) => {
      const visibleIds = new Set(filteredItems.map((x) => x.id));
      setFileItems((prev) =>
        prev.map((item) => (visibleIds.has(item.id) ? { ...item, selected: checked } : item)),
      );
    },
    [filteredItems],
  );

  const handleToggleRow = useCallback((id: number, checked: boolean) => {
    setFileItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: checked } : item)),
    );
  }, []);

  const optimizeBatch = useCallback(
    async (itemsToProcess: FileOptimizerItem[]) => {
      if (itemsToProcess.length === 0 || isProcessing) return;
      setIsProcessing(true);
      setProgressVisible(true);

      const total = itemsToProcess.length;
      const limit = getThresholdBytes(thresholdMb);

      for (let i = 0; i < total; i++) {
        const targetItem = itemsToProcess[i];
        if (!targetItem) continue;
        const pct = Math.round((i / total) * 100);
        setProgressText(`Đang tối ưu (${i + 1}/${total}): ${targetItem.relativePath}`);
        setProgressPercent(pct);

        setFileItems((prev) =>
          prev.map((it) => (it.id === targetItem.id ? { ...it, status: "processing" } : it)),
        );

        try {
          const result = await optimizeFileItem(targetItem.file, thresholdMb, {
            preferBackend: true,
          });
          const optSize = result.blob.size;
          const isUnder = optSize <= limit;

          setFileItems((prev) =>
            prev.map((it) =>
              it.id === targetItem.id
                ? {
                    ...it,
                    optimizedBlob: result.blob,
                    optimizedSize: optSize,
                    method: result.meta.method,
                    status: isUnder ? "optimized" : "over",
                    selected: !isUnder,
                  }
                : it,
            ),
          );
        } catch {
          setFileItems((prev) =>
            prev.map((it) =>
              it.id === targetItem.id
                ? {
                    ...it,
                    status: isEffectiveOverLimit(it, thresholdMb) ? "over" : "valid",
                  }
                : it,
            ),
          );
        }
      }

      setProgressText(`Hoàn tất tối ưu ${total}/${total} file về dưới ${thresholdMb} MB!`);
      setProgressPercent(100);
      setIsProcessing(false);
    },
    [isProcessing, thresholdMb],
  );

  const handleOptimizeSelected = useCallback(() => {
    const selected = fileItems.filter((x) => x.selected);
    void optimizeBatch(selected);
  }, [fileItems, optimizeBatch]);

  const handleExportZip = useCallback(async () => {
    const itemsToExport = exportAllTree
      ? fileItems
      : fileItems.filter((x) => x.optimizedBlob != null);

    if (itemsToExport.length === 0) {
      setBannerMessage(
        "Chưa có file nào được tối ưu để xuất. Hãy bấm 'Tối ưu' trước hoặc tích chọn 'Xuất trọn bộ'.",
      );
      return;
    }

    setIsProcessing(true);
    setProgressVisible(true);
    try {
      const entries = [];
      for (let i = 0; i < itemsToExport.length; i++) {
        const item = itemsToExport[i];
        if (!item) continue;
        const pct = Math.round(((i + 1) / itemsToExport.length) * 100);
        setProgressText(
          `Đang đóng gói cấu trúc thư mục (${i + 1}/${itemsToExport.length}): ${item.relativePath}`,
        );
        setProgressPercent(pct);

        const sourceBlob = item.optimizedBlob ?? item.file;
        const data = await readBlobBytes(sourceBlob);
        entries.push({
          relativePath: item.relativePath,
          data,
        });
      }

      const zipBytes = buildZipArchiveBytes(entries);
      const zipBlob = new Blob([toBlobPart(zipBytes)], { type: "application/zip" });
      triggerBlobDownload(zipBlob, `HoSo_DaToiUu_Duoi_${thresholdMb}MB.zip`);
      setProgressText(
        `Đã xuất file HoSo_DaToiUu_Duoi_${thresholdMb}MB.zip (${itemsToExport.length} file, giữ nguyên cấu trúc thư mục)!`,
      );
    } finally {
      setIsProcessing(false);
    }
  }, [exportAllTree, fileItems, thresholdMb]);

  const handleExportFolder = useCallback(async () => {
    const itemsToExport = exportAllTree
      ? fileItems
      : fileItems.filter((x) => x.optimizedBlob != null);

    if (itemsToExport.length === 0) {
      setBannerMessage(
        "Chưa có file nào được tối ưu để xuất. Hãy bấm 'Tối ưu' trước hoặc tích chọn 'Xuất trọn bộ'.",
      );
      return;
    }

    const win = window as Window & {
      showDirectoryPicker?: (options?: { mode?: string }) => Promise<DirectoryPickerHandle>;
    };

    if (typeof win.showDirectoryPicker !== "function") {
      setBannerMessage(
        "Trình duyệt hiện tại không hỗ trợ ghi trực tiếp ra thư mục. Hệ thống tự động chuyển sang tải xuống file .ZIP giữ nguyên cấu trúc thư mục.",
      );
      await handleExportZip();
      return;
    }

    try {
      const rootDirHandle = await win.showDirectoryPicker({ mode: "readwrite" });
      setIsProcessing(true);
      setProgressVisible(true);
      const total = itemsToExport.length;

      for (let i = 0; i < total; i++) {
        const item = itemsToExport[i];
        if (!item) continue;
        const pct = Math.round(((i + 1) / total) * 100);
        setProgressText(`Đang xuất ra thư mục mới (${i + 1}/${total}): ${item.relativePath}`);
        setProgressPercent(pct);

        const parts = item.relativePath.split("/").filter(Boolean);
        const fileName = parts.pop() || item.name;

        let currentDir = rootDirHandle;
        for (const folderName of parts) {
          currentDir = await currentDir.getDirectoryHandle(folderName, { create: true });
        }

        const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        const contentBlob = item.optimizedBlob ?? item.file;
        await writable.write(contentBlob);
        await writable.close();
      }

      setProgressText(
        `Đã xuất thành công ${total} file ra thư mục mới (giữ nguyên cấu trúc thư mục)!`,
      );
    } catch (err) {
      const errorObj = err as { name?: string; message?: string };
      if (errorObj?.name !== "AbortError") {
        setBannerMessage(`Có lỗi khi ghi thư mục: ${errorObj?.message || "Không xác định"}`);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [exportAllTree, fileItems, handleExportZip]);

  return (
    <SectionShell
      id="toi-uu-file"
      title="Kiểm tra & Tối ưu Dung lượng Hồ sơ (< 15MB)"
      description="Kiểm tra hàng loạt PDF, JPG, PNG, SVG, WEBP, TIFF, BMP · Cảnh báo đỏ file vượt ngưỡng DVC/HSQ · Nén & xuất giữ nguyên cấu trúc thư mục"
      icon={FileArchive}
      tone="blue"
      className={cn(
        standalone && styles.standaloneSection,
        isFullscreen && styles.fullscreenSection,
      )}
      actions={
        <div className={styles.headerActions}>
          {!standalone && (
            <>
              <button
                type="button"
                className={styles.headerActionBtn}
                onClick={() => setIsFullscreen((prev) => !prev)}
                title={isFullscreen ? "Thu nhỏ (Esc)" : "Phóng to toàn màn hình"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 size={15} aria-hidden="true" />
                    <span>Thu nhỏ (Esc)</span>
                  </>
                ) : (
                  <>
                    <Maximize2 size={15} aria-hidden="true" />
                    <span>Toàn màn hình</span>
                  </>
                )}
              </button>
              <a
                href={standaloneHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(styles.headerActionBtn, styles.headerActionPrimary)}
                title="Mở công cụ tối ưu file trong cửa sổ mới toàn màn hình"
              >
                <ExternalLink size={15} aria-hidden="true" />
                <span>Mở cửa sổ riêng (Full màn hình)</span>
              </a>
            </>
          )}
          {standalone && (
            <a
              href={baseUrl}
              className={styles.headerActionBtn}
              title="Quay về cổng Cẩm nang iLIS Cà Mau"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Về Cổng Cẩm nang iLIS</span>
            </a>
          )}
        </div>
      }
    >
      <div className={styles.wrapper}>
        {/* Thanh cấu hình ngưỡng dung lượng tối đa */}
        <div className={styles.topBar}>
          <div className={styles.topInfo}>
            <div className={styles.topTitle}>
              <Zap size={18} aria-hidden="true" />
              <span>Chuẩn hóa dung lượng đính kèm Dịch vụ công &amp; Hồ sơ quét (HSQ)</span>
            </div>
            <p className={styles.topSub}>
              Tự động lọc bỏ Word/Excel/PPT/Video · Giữ nguyên chất lượng các file đã đạt chuẩn ≤{" "}
              {thresholdMb} MB
            </p>
          </div>

          <div className={styles.thresholdBox}>
            <label htmlFor={`${uid}-threshold`} className={styles.thresholdLabel}>
              Ngưỡng tối đa (MB):
            </label>
            <input
              id={`${uid}-threshold`}
              type="number"
              className={styles.thresholdInput}
              value={thresholdInputStr}
              min={0.1}
              max={500}
              step={0.5}
              onChange={(e) => {
                const raw = e.target.value;
                setThresholdInputStr(raw);
                const parsed = parseFloat(raw);
                if (!Number.isNaN(parsed) && parsed > 0.05) {
                  handleThresholdChange(parsed, raw);
                }
              }}
            />
            <div className={styles.presets}>
              {PRESET_THRESHOLDS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={cn(
                    styles.presetBtn,
                    thresholdMb === val && styles.presetBtnActive,
                  )}
                  onClick={() => handleThresholdChange(val)}
                >
                  {val}MB
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Khu vực Kéo thả / Chọn Thư mục hoặc File lẻ */}
        <div
          className={cn(styles.dropZone, isDragging && styles.dropZoneActive)}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className={styles.uploadIconWrap} aria-hidden="true">
            <FolderOpen size={26} />
          </div>
          <h3 className={styles.dropTitle}>Kéo thả Thư mục hoặc File vào đây để kiểm tra</h3>
          <p className={styles.dropDesc}>
            Hỗ trợ định dạng: <strong>PDF, JPG, JPEG, PNG, SVG, WEBP, TIFF, BMP, GIF</strong> (Tự
            động giữ nguyên cấu trúc thư mục con nhiều cấp)
          </p>

          <div className={styles.uploadActions}>
            <button
              type="button"
              className={cn(styles.btn, styles.btnPrimary)}
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FolderOpen size={17} aria-hidden="true" />
              Chọn cả Thư mục
            </button>
            <button
              type="button"
              className={cn(styles.btn, styles.btnOutline)}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FileUp size={17} aria-hidden="true" />
              Chọn nhiều File lẻ
            </button>
            <button
              type="button"
              className={cn(styles.btn, styles.btnSample)}
              onClick={handleLoadSampleDataset}
              disabled={isProcessing}
            >
              <Sparkles size={17} aria-hidden="true" />
              Nạp bộ hồ sơ mẫu (&gt;15MB &amp; &lt;15MB)
            </button>
            {standalone ? (
              <a href={baseUrl} className={cn(styles.btn, styles.btnOutline)}>
                <ArrowLeft size={16} aria-hidden="true" />
                Về Cổng Cẩm nang
              </a>
            ) : (
              <a
                href={standaloneHref}
                target="_blank"
                rel="noreferrer"
                className={cn(styles.btn, styles.btnOutline)}
              >
                <ExternalLink size={16} aria-hidden="true" />
                Mở cửa sổ riêng
              </a>
            )}
            {fileItems.length > 0 && (
              <button
                type="button"
                className={cn(styles.btn, styles.btnGhost)}
                onClick={handleClearAll}
                disabled={isProcessing}
              >
                <RefreshCcw size={16} aria-hidden="true" />
                Làm mới danh sách
              </button>
            )}
          </div>

          <input
            ref={setFolderInputAttrs}
            type="file"
            multiple
            hidden
            onChange={handleFolderInputChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.svg,.webp,.bmp,.tif,.tiff,.gif"
            hidden
            onChange={handleFileInputChange}
          />
        </div>

        {bannerMessage && (
          <div className={styles.noticeBanner} role="status">
            <span>{bannerMessage}</span>
            <button
              type="button"
              className={styles.btnMini}
              onClick={() => setBannerMessage(null)}
            >
              Đóng
            </button>
          </div>
        )}

        {/* Thống kê nhanh 4 thẻ KPI */}
        {fileItems.length > 0 && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Tổng số file kiểm tra</span>
              <strong className={styles.statValue}>{stats.totalFiles}</strong>
              <span className={styles.statSub}>
                Tổng dung lượng gốc: {formatFileSize(stats.totalOrigBytes)}
              </span>
            </div>

            <div className={cn(styles.statCard, styles.statDanger)}>
              <span className={styles.statLabel}>Vượt ngưỡng (BÁO ĐỎ)</span>
              <strong className={styles.statValue}>{stats.overCount}</strong>
              <span className={styles.statSub}>Cần tối ưu về &lt; {thresholdMb} MB</span>
            </div>

            <div className={cn(styles.statCard, styles.statSuccess)}>
              <span className={styles.statLabel}>Đạt chuẩn dung lượng</span>
              <strong className={styles.statValue}>{stats.validCount}</strong>
              <span className={styles.statSub}>Hợp lệ ngay (≤ {thresholdMb} MB)</span>
            </div>

            <div className={cn(styles.statCard, styles.statInfo)}>
              <span className={styles.statLabel}>Đã tối ưu thành công</span>
              <strong className={styles.statValue}>{stats.optimizedCount}</strong>
              <span className={styles.statSub}>
                Tiết kiệm: {formatFileSize(stats.savedBytes)}
              </span>
            </div>
          </div>
        )}

        {/* Thanh tiến trình tối ưu / đóng gói */}
        {progressVisible && (
          <div className={styles.progressPanel}>
            <div className={styles.progressHeader}>
              <span>{progressText}</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressBar}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bảng làm việc & Bộ lọc */}
        {fileItems.length > 0 && (
          <div className={styles.workspacePanel}>
            <div className={styles.toolbar}>
              <div className={styles.filterTabs}>
                <button
                  type="button"
                  className={cn(
                    styles.tabBtn,
                    currentFilter === "all" && styles.tabBtnActive,
                  )}
                  onClick={() => setCurrentFilter("all")}
                >
                  Tất cả ({stats.totalFiles})
                </button>
                <button
                  type="button"
                  className={cn(
                    styles.tabBtn,
                    styles.tabBtnDanger,
                    currentFilter === "over" && styles.tabBtnDangerActive,
                  )}
                  onClick={() => setCurrentFilter("over")}
                >
                  Vượt ngưỡng - Báo đỏ ({stats.overCount})
                </button>
                <button
                  type="button"
                  className={cn(
                    styles.tabBtn,
                    currentFilter === "valid" && styles.tabBtnActive,
                  )}
                  onClick={() => setCurrentFilter("valid")}
                >
                  Đạt chuẩn ({stats.validCount})
                </button>
                <button
                  type="button"
                  className={cn(
                    styles.tabBtn,
                    currentFilter === "optimized" && styles.tabBtnActive,
                  )}
                  onClick={() => setCurrentFilter("optimized")}
                >
                  Đã tối ưu ({stats.optimizedCount})
                </button>
              </div>

              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Tìm theo tên file hoặc thư mục..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.actionBar}>
              <div className={styles.actionLeft}>
                <button
                  type="button"
                  className={cn(styles.btn, styles.btnDangerSolid)}
                  onClick={handleOptimizeSelected}
                  disabled={isProcessing || stats.selectedCount === 0}
                >
                  <Zap size={16} aria-hidden="true" />
                  Tối ưu các file đã chọn (&lt; {thresholdMb} MB)
                </button>
                <span className={styles.selectedHint}>
                  Đã chọn {stats.selectedCount} file
                </span>
              </div>

              <div className={styles.actionRight}>
                <label
                  className={styles.checkboxInline}
                  title="Khi xuất ra thư mục mới hoặc ZIP, sao chép cả các file vốn đã đạt chuẩn để tạo thành bộ hồ sơ đầy đủ"
                >
                  <input
                    type="checkbox"
                    checked={exportAllTree}
                    onChange={(e) => setExportAllTree(e.target.checked)}
                  />
                  <span>Xuất trọn bộ (gồm cả file gốc đã đạt chuẩn)</span>
                </label>

                <button
                  type="button"
                  className={cn(styles.btn, styles.btnSuccess)}
                  onClick={handleExportFolder}
                  disabled={isProcessing || fileItems.length === 0}
                >
                  <FolderOutput size={16} aria-hidden="true" />
                  Xuất ra Thư mục mới
                </button>

                <button
                  type="button"
                  className={cn(styles.btn, styles.btnSecondary)}
                  onClick={handleExportZip}
                  disabled={isProcessing || fileItems.length === 0}
                >
                  <Archive size={16} aria-hidden="true" />
                  Tải về .ZIP (Giữ cấu trúc)
                </button>
              </div>
            </div>

            <div
              className={cn(
                styles.tableContainer,
                (standalone || isFullscreen) && styles.tableContainerStandalone,
              )}
            >
              <table className={styles.fileTable}>
                <thead>
                  <tr>
                    <th className={styles.colCheck}>
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        disabled={isProcessing || filteredItems.length === 0}
                        title="Chọn/Bỏ chọn tất cả file đang hiển thị"
                      />
                    </th>
                    <th className={styles.colIndex}>#</th>
                    <th>Đường dẫn cấu trúc thư mục / Tên file</th>
                    <th className={styles.colType}>Loại</th>
                    <th className={styles.colSize}>Dung lượng gốc</th>
                    <th className={styles.colStatus}>Trạng thái kiểm tra</th>
                    <th className={styles.colNewSize}>Sau tối ưu</th>
                    <th className={styles.colAction}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyRow}>
                        Không có file nào khớp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const over = isEffectiveOverLimit(item, thresholdMb);
                      const slashIdx = item.relativePath.lastIndexOf("/");
                      const folderPart =
                        slashIdx !== -1 ? item.relativePath.slice(0, slashIdx + 1) : "";
                      const filePart =
                        slashIdx !== -1
                          ? item.relativePath.slice(slashIdx + 1)
                          : item.relativePath;
                      const extLabel = item.ext.replace(".", "");

                      const pctReduction =
                        item.optimizedSize != null && item.origSize > 0
                          ? Math.round(
                              ((item.origSize - item.optimizedSize) / item.origSize) * 100,
                            )
                          : 0;

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            over && styles.rowOver,
                            !over && item.optimizedBlob && styles.rowOptimized,
                          )}
                        >
                          <td className={styles.colCheck}>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              disabled={isProcessing}
                              onChange={(e) => handleToggleRow(item.id, e.target.checked)}
                            />
                          </td>
                          <td className={styles.colIndex}>{idx + 1}</td>
                          <td>
                            <span className={styles.folderPrefix}>{folderPart}</span>
                            <span className={styles.fileName}>{filePart}</span>
                          </td>
                          <td className={styles.colType}>
                            <span
                              className={cn(
                                styles.badgeExt,
                                extLabel === "pdf" && styles.badgePdf,
                              )}
                            >
                              {extLabel}
                            </span>
                          </td>
                          <td className={styles.colSize}>
                            <span className={styles.sizeOrig}>
                              {formatFileSize(item.origSize)}
                            </span>
                          </td>
                          <td className={styles.colStatus}>
                            {item.status === "processing" ? (
                              <span
                                className={cn(styles.statusPill, styles.statusProcessing)}
                              >
                                Đang tối ưu...
                              </span>
                            ) : over ? (
                              <span className={cn(styles.statusPill, styles.statusOver)}>
                                <AlertTriangle size={13} aria-hidden="true" />
                                BÁO ĐỎ (&gt; {thresholdMb} MB)
                              </span>
                            ) : item.optimizedBlob ? (
                              <span
                                className={cn(styles.statusPill, styles.statusOptimized)}
                              >
                                <CheckCircle2 size={13} aria-hidden="true" />
                                ĐÃ TỐI ƯU (&lt; {thresholdMb} MB)
                              </span>
                            ) : (
                              <span className={cn(styles.statusPill, styles.statusValid)}>
                                <CheckCircle2 size={13} aria-hidden="true" />
                                Đạt chuẩn (≤ {thresholdMb} MB)
                              </span>
                            )}
                          </td>
                          <td className={styles.colNewSize}>
                            {item.optimizedSize != null ? (
                              <div className={styles.newSizeBox}>
                                <span className={styles.newSizeVal}>
                                  {formatFileSize(item.optimizedSize)}
                                </span>
                                <span className={styles.newSizeDiff}>
                                  {pctReduction > 0
                                    ? `Giảm -${pctReduction}%`
                                    : pctReduction === 0
                                      ? "Giữ nguyên (0%)"
                                      : `Tăng +${Math.abs(pctReduction)}%`}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>-</span>
                            )}
                          </td>
                          <td className={styles.colAction}>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={cn(
                                  styles.btnMini,
                                  over && styles.btnMiniDanger,
                                )}
                                disabled={isProcessing}
                                onClick={() => void optimizeBatch([item])}
                              >
                                {item.optimizedBlob ? "Nén lại" : "Tối ưu"}
                              </button>
                              {item.optimizedBlob && (
                                <button
                                  type="button"
                                  className={styles.btnMini}
                                  title="Tải file này"
                                  onClick={() =>
                                    triggerBlobDownload(item.optimizedBlob!, item.name)
                                  }
                                >
                                  <Download size={13} aria-hidden="true" />
                                  Tải
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
