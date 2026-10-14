import { Eye, Users, CalendarDays } from "lucide-react";
import { useVisitorStats } from "../hooks/use-visitor-stats";
import styles from "./visitor-stats.module.css";

interface VisitorStatsProps {
  variant?: "footer" | "compact";
}

/**
 * Định dạng số theo chuẩn Việt Nam (phân tách hàng nghìn bằng dấu chấm)
 */
function formatNumber(num: number): string {
  return num.toLocaleString("vi-VN");
}

export function VisitorStats({ variant = "footer" }: VisitorStatsProps) {
  const { onlineCount, totalVisits, todayVisits, isLoading } = useVisitorStats();

  if (variant === "compact") {
    return (
      <div className={styles.compactBadge} role="status" aria-label="Thống kê truy cập">
        <span className={styles.compactItem}>
          <span className={styles.pulseDot} aria-hidden="true" />
          <span className={styles.compactLabel}>Online:</span>
          <strong className={styles.compactValue}>{isLoading ? "…" : onlineCount}</strong>
        </span>
        <span className={styles.compactDivider} aria-hidden="true">|</span>
        <span className={styles.compactItem}>
          <Eye size={13} className={styles.icon} aria-hidden="true" />
          <span className={styles.compactLabel}>Lượt truy cập:</span>
          <strong className={styles.compactValue}>{isLoading ? "…" : formatNumber(totalVisits)}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Thống kê truy cập</h3>
      <div className={styles.card}>
        {/* Đang Online */}
        <div className={styles.statRow}>
          <div className={styles.statHeader}>
            <span className={styles.pulseDot} aria-hidden="true" />
            <span className={styles.label}>
              <Users size={15} aria-hidden="true" />
              Đang online:
            </span>
          </div>
          <strong className={`${styles.value} ${styles.onlineValue}`}>
            {isLoading ? "…" : onlineCount}
          </strong>
        </div>

        {/* Lượt truy cập hôm nay */}
        <div className={styles.statRow}>
          <div className={styles.statHeader}>
            <span className={styles.label}>
              <CalendarDays size={14} aria-hidden="true" />
              Hôm nay:
            </span>
          </div>
          <strong className={styles.value}>
            {isLoading ? "…" : formatNumber(todayVisits)}
          </strong>
        </div>

        {/* Tổng lượt truy cập */}
        <div className={styles.statRow}>
          <div className={styles.statHeader}>
            <span className={styles.label}>
              <Eye size={14} aria-hidden="true" />
              Tổng lượt truy cập:
            </span>
          </div>
          <strong className={`${styles.value} ${styles.totalValue}`}>
            {isLoading ? "…" : formatNumber(totalVisits)}
          </strong>
        </div>
      </div>
    </div>
  );
}
