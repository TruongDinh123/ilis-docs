import { useCallback, useEffect, useId, useState } from "react";
import {
  Activity,
  BarChart3,
  ExternalLink,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SectionShell } from "./section-shell";
import styles from "./dashboard-monitor.module.css";

export type DashboardTabKey = "baocao" | "vnlis";

interface SubViewItem {
  id: string;
  label: string;
  url: string;
}

interface DashboardConfig {
  id: DashboardTabKey;
  label: string;
  badge: string;
  agency: string;
  defaultUrl: string;
  description: string;
  subViews: SubViewItem[];
}

const DASHBOARDS: DashboardConfig[] = [
  {
    id: "baocao",
    label: "Thống kê Báo cáo Đất đai",
    badge: "VNPT Cà Mau",
    agency: "VNPT Cà Mau",
    defaultUrl: "https://baocaodatdai2.vnptcamau.vn/thong_ke.html",
    description:
      "Báo cáo thống kê làm sạch CSDL đất đai toàn tỉnh Cà Mau: Tiến độ làm sạch không gian, hồ sơ quét (HSQ), cấp GCN và đối soát CSDL dân cư.",
    subViews: [
      { id: "tong-quan", label: "📊 Thống kê tổng quan", url: "https://baocaodatdai2.vnptcamau.vn/thong_ke.html" },
      { id: "tong-hop", label: "📋 Báo cáo tổng hợp", url: "https://baocaodatdai2.vnptcamau.vn/index.html" },
      { id: "ngay", label: "⭐ Xếp hạng theo ngày", url: "https://baocaodatdai2.vnptcamau.vn/bao_cao_ngay.html" },
      { id: "uu-tien", label: "🎯 Số thửa cần ưu tiên", url: "https://baocaodatdai2.vnptcamau.vn/danh_sach_uu_tien.html" },
      { id: "loai-dat", label: "🗺️ Chi tiết theo loại đất", url: "https://baocaodatdai2.vnptcamau.vn/bao_cao_loai_dat.html" },
    ],
  },
  {
    id: "vnlis",
    label: "Hệ thống Giám sát CSDL Quốc gia VNLIS",
    badge: "Bộ NN&MT",
    agency: "Bộ Nông nghiệp và Môi trường",
    defaultUrl: "https://kh2959-vnlis.mae.gov.vn/tinh-ca-mau",
    description:
      "Hệ thống giám sát tiến độ hoàn thiện CSDL đất đai quốc gia (Kế hoạch 2959/KH-STNMT) – Phân hệ giám sát tỉnh Cà Mau.",
    subViews: [
      { id: "ca-mau", label: "🌐 Giám sát Tỉnh Cà Mau", url: "https://kh2959-vnlis.mae.gov.vn/tinh-ca-mau" },
      { id: "toan-quoc", label: "🏛️ Cổng Giám sát Toàn quốc", url: "https://kh2959-vnlis.mae.gov.vn/" },
    ],
  },
];

const DEFAULT_DASHBOARD: DashboardConfig = DASHBOARDS[0]!;

export interface DashboardMonitorProps {
  initialTab?: DashboardTabKey;
}

/**
 * Trung tâm Giám sát & Báo cáo số liệu Đất đai:
 * Tích hợp trực tiếp 2 hệ thống:
 * 1. Báo cáo đất đai VNPT Cà Mau (thong_ke.html)
 * 2. Hệ thống giám sát tiến độ hoàn thiện CSDL đất đai quốc gia (Bộ Nông nghiệp & Môi trường - VNLIS Cà Mau)
 */
export function DashboardMonitor({ initialTab = "baocao" }: DashboardMonitorProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>(initialTab);
  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    const config = DASHBOARDS.find((d) => d.id === initialTab) ?? DEFAULT_DASHBOARD;
    return config.defaultUrl;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLargeHeight, setIsLargeHeight] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const uniqueId = useId();

  const currentDashboard: DashboardConfig = DASHBOARDS.find((d) => d.id === activeTab) ?? DEFAULT_DASHBOARD;

  const handleTabChange = useCallback((tabKey: DashboardTabKey) => {
    setActiveTab(tabKey);
    const target = DASHBOARDS.find((d) => d.id === tabKey) ?? DEFAULT_DASHBOARD;
    setCurrentUrl(target.defaultUrl);
    setIsLoading(true);
  }, []);

  const handleSubViewChange = useCallback((url: string) => {
    setCurrentUrl(url);
    setIsLoading(true);
  }, []);

  const handleReload = useCallback(() => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Xử lý phím ESC để thoát toàn màn hình
  useEffect(() => {
    if (!isFullscreen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  return (
    <SectionShell
      id="thong-ke-giam-sat"
      title="Trung tâm Giám sát & Báo cáo số liệu Đất đai"
      description="Theo dõi trực quan tiến độ làm sạch CSDL đất đai tỉnh Cà Mau và giám sát đồng bộ CSDL Quốc gia VNLIS (Kế hoạch 2959)"
      icon={BarChart3}
      tone="teal"
      badge="Trực tiếp"
    >
      <div className={styles.container}>
        {/* Thanh chuyển đổi Dashboard chính */}
        <div className={styles.controlHeader}>
          <div className={styles.tabGroup} role="tablist" aria-label="Lựa chọn hệ thống báo cáo">
            {DASHBOARDS.map((dash) => {
              const isActive = dash.id === activeTab;
              return (
                <button
                  key={dash.id}
                  id={`tab-${dash.id}-${uniqueId}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${dash.id}-${uniqueId}`}
                  type="button"
                  className={cn(styles.tabBtn, isActive && styles.active)}
                  onClick={() => handleTabChange(dash.id)}
                >
                  {dash.id === "baocao" ? <BarChart3 size={17} /> : <Activity size={17} />}
                  <span>{dash.label}</span>
                  <span className={styles.tabBadge}>{dash.badge}</span>
                </button>
              );
            })}
          </div>

          {/* Cụm công cụ điều khiển khung nhìn */}
          <div className={styles.actionGroup}>
            <button
              type="button"
              className={cn(styles.toolBtn, isLoading && styles.spinning)}
              onClick={handleReload}
              title="Tải lại nội dung báo cáo"
              aria-label="Tải lại iframe"
            >
              <RotateCcw size={15} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => setIsLargeHeight((v) => !v)}
              title="Mở rộng hoặc thu nhỏ chiều cao khung xem"
              aria-label="Đổi chiều cao"
            >
              <Layers size={15} />
              <span>{isLargeHeight ? "Thu gọn (820px)" : "Mở rộng (1020px)"}</span>
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={toggleFullscreen}
              title="Xem toàn màn hình"
              aria-label="Xem toàn màn hình"
            >
              <Maximize2 size={15} />
              <span>Toàn màn hình</span>
            </button>

            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.toolBtn}
              title="Mở trong tab trình duyệt mới"
              aria-label="Mở trang gốc trong tab mới"
            >
              <ExternalLink size={15} />
              <span>Mở tab mới</span>
            </a>
          </div>
        </div>

        {/* Thanh lối tắt sub-views */}
        <div className={styles.subBar}>
          <span className={styles.subLabel}>Báo cáo chi tiết:</span>
          {currentDashboard.subViews.map((sub) => {
            const isSubActive = sub.url === currentUrl;
            return (
              <button
                key={sub.id}
                type="button"
                className={cn(styles.subPill, isSubActive && styles.active)}
                onClick={() => handleSubViewChange(sub.url)}
              >
                {sub.label}
              </button>
            );
          })}
        </div>

        {/* Thanh mô phỏng địa chỉ trình duyệt & trạng thái kết nối */}
        <div className={styles.browserBar}>
          <div className={styles.browserUrl}>
            <Lock size={13} color="#38bdf8" />
            <span>{currentUrl}</span>
          </div>
          <div className={styles.browserStatus}>
            <span className={styles.statusDot} />
            <span>Hệ thống trực tuyến (Đồng bộ tức thời)</span>
          </div>
        </div>

        {/* Khung nhúng Iframe nội dung */}
        <div
          id={`panel-${activeTab}-${uniqueId}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}-${uniqueId}`}
          className={cn(styles.frameWrapper, isLargeHeight && styles.large)}
        >
          {isLoading && (
            <div className={styles.loaderOverlay}>
              <div className={styles.spinner} />
              <div className={styles.loaderText}>Đang nạp dữ liệu từ máy chủ {currentDashboard.agency}…</div>
            </div>
          )}

          <iframe
            key={`${currentUrl}-${reloadKey}`}
            src={currentUrl}
            title={currentDashboard.label}
            className={styles.iframe}
            loading="lazy"
            allow="fullscreen; clipboard-read; clipboard-write"
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Chân thẻ thông tin nghiệp vụ */}
        <div className={styles.footerInfo}>
          <div className={styles.footerDesc}>
            <Sparkles size={16} color="#0d9488" />
            <span>
              <strong>{currentDashboard.agency}:</strong> {currentDashboard.description}
            </span>
          </div>
          <div className={styles.fallbackNotice}>
            Nếu không hiển thị đầy đủ, vui lòng{" "}
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className={styles.fallbackLink}>
              bấm vào đây để mở trực tiếp
            </a>
            .
          </div>
        </div>
      </div>

      {/* Modal hiển thị Fullscreen khi bật */}
      {isFullscreen && (
        <div className={styles.fullscreenModal} role="dialog" aria-modal="true" aria-label="Xem báo cáo toàn màn hình">
          <div className={styles.fullscreenHeader}>
            <div className={styles.fullscreenTitle}>
              <BarChart3 size={20} color="#38bdf8" />
              <span>
                {currentDashboard.label} — {currentDashboard.agency}
              </span>
            </div>
            <button
              type="button"
              className={styles.exitFullscreenBtn}
              onClick={() => setIsFullscreen(false)}
              aria-label="Thoát chế độ toàn màn hình"
            >
              <Minimize2 size={16} />
              <span>Thoát toàn màn hình (Esc)</span>
            </button>
          </div>
          <div className={styles.frameWrapper}>
            <iframe
              key={`fullscreen-${currentUrl}-${reloadKey}`}
              src={currentUrl}
              title={`${currentDashboard.label} toàn màn hình`}
              className={styles.iframe}
              allow="fullscreen; clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </SectionShell>
  );
}
