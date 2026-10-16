import { ArrowRight, BookOpenCheck, GraduationCap, MapPin, PenTool, Search, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { content } from "../data/content";
import { CaMauEmblem } from "./ca-mau-emblem";
import styles from "./hero.module.css";

interface Stat {
  icon: LucideIcon;
  value: number;
  label: string;
  href: string;
}

export interface HeroProps {
  onOpenSearch: () => void;
}

/** Khối giới thiệu đầu trang: tiêu đề, lối tắt, số liệu nội dung và huy hiệu bản đồ Cà Mau. */
export function Hero({ onOpenSearch }: HeroProps) {
  const errorCount = content.errors.groups.reduce((sum, group) => sum + group.items.length, 0);
  const videoCount = content.videos.groups.reduce((sum, group) => sum + group.items.length, 0);
  const stats: Stat[] = [
    { icon: ShieldAlert, value: errorCount, label: "Lỗi thường gặp", href: "#cac-loi-thuong-gap" },
    { icon: PenTool, value: content.software.length, label: "Phần mềm ký số", href: "#phan-mem-ky-so" },
    { icon: GraduationCap, value: videoCount + 1, label: "Tập huấn sử dụng", href: "#tap-huan-su-dung" },
    { icon: BookOpenCheck, value: content.docs.length, label: "Tài liệu & hình ảnh", href: "#tai-lieu-hd-va-hinh-anh" },
  ];

  return (
    <section id="trang-chu" className={styles.hero} aria-labelledby="page-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <MapPin size={15} aria-hidden="true" />
          Cổng hướng dẫn &amp; hỗ trợ · Tỉnh Cà Mau
        </p>
        <h1 id="page-title">
          Hướng dẫn sử dụng <span>iLIS</span>
        </h1>
        <p className={styles.lead}>
          Tra cứu cách xử lý lỗi, cài đặt phần mềm ký số, xem video và tài liệu hướng dẫn — tất cả
          tập trung tại một nơi dành cho cán bộ sử dụng hệ thống.
        </p>
        <div className={styles.cta}>
          <a className={styles.primary} href="#cac-loi-thuong-gap">
            Xem lỗi thường gặp
            <ArrowRight size={18} aria-hidden="true" />
          </a>
          <button type="button" className={styles.secondary} onClick={onOpenSearch}>
            <Search size={18} aria-hidden="true" />
            Tìm kiếm nhanh
            <kbd>Ctrl K</kbd>
          </button>
        </div>
        <ul className={styles.stats} aria-label="Nội dung có trong cổng">
          {stats.map((stat) => (
            <li key={stat.label}>
              <a href={stat.href} className={styles.stat}>
                <stat.icon size={20} aria-hidden="true" />
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.art} aria-hidden="true">
        <span className={styles.ring1} />
        <span className={styles.ring2} />
        <CaMauEmblem showLabels />
      </div>
    </section>
  );
}
