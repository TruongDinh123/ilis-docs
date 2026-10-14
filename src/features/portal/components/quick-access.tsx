import { ArrowDown, ArrowUpRight, FileSearch, Flame, Map as MapIcon, RefreshCcw, Receipt, TriangleAlert, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QUICK_ACCESS } from "../data/system-links";
import { content } from "../data/content";
import { SectionShell } from "./section-shell";
import styles from "./quick-access.module.css";

const ICONS: Record<string, LucideIcon> = {
  "loi-thuong-gap": TriangleAlert,
  cadas: MapIcon,
  lpm: Receipt,
  "tracuu-gcn": FileSearch,
  "dong-bo": RefreshCcw,
};

export function QuickAccess() {
  const errorCount = content.errors.groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <SectionShell
      id="truy-cap-nhanh"
      title="Truy cập nhanh"
      description="Các hệ thống và lối tắt được dùng nhiều nhất"
      icon={Zap}
      tone="amber"
    >
      <ul className={styles.grid}>
        {QUICK_ACCESS.map((item) => {
          const Icon = ICONS[item.id] ?? Zap;
          const internal = item.href.startsWith("#");
          const detail = item.id === "loi-thuong-gap" ? `Tổng hợp ${errorCount} lỗi & cách xử lý` : item.subtitle;
          const sub = item.id === "loi-thuong-gap" ? item.detail : item.detail;
          return (
            <li key={item.id}>
              <a
                className={styles.card}
                data-tone={item.tone}
                href={item.href}
                {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              >
                {item.badge && (
                  <span className={styles.hot}>
                    <Flame size={12} aria-hidden="true" /> {item.badge}
                  </span>
                )}
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={26} strokeWidth={1.9} />
                </span>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.subtitle}>{detail}</span>
                <span className={styles.detail}>{sub}</span>
                <span className={styles.go}>
                  {internal ? "Xem ngay" : "Mở hệ thống"}
                  {internal ? <ArrowDown size={15} aria-hidden="true" /> : <ArrowUpRight size={15} aria-hidden="true" />}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
