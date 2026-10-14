import { ArrowUpRight, Activity, KeyRound, MessagesSquare, Quote, Search, Waypoints } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QUOTE, SYSTEM_LINKS } from "../data/system-links";
import { SectionShell } from "./section-shell";
import type { Tone } from "./section-shell";
import styles from "./resources-section.module.css";

interface Resource {
  id: string;
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
}

const RESOURCES: Resource[] = [
  {
    id: "vnlis",
    title: "Giám sát tiến độ CSDL đất đai",
    detail: "Theo dõi tình hình xây dựng, đồng bộ dữ liệu lên CSDL quốc gia (VNLIS)",
    href: SYSTEM_LINKS.vnlisMonitor,
    icon: Activity,
    tone: "teal",
  },
  // {
  //   id: "check-xml",
  //   title: "Check XML thuế",
  //   detail: "Kiểm tra tệp XML phiếu thuế trước khi gửi liên thông",
  //   href: SYSTEM_LINKS.checkXmlThue,
  //   icon: FileCode2,
  //   tone: "amber",
  // },
  {
    id: "luan-chuyen",
    title: "Luân chuyển hồ sơ (LPM)",
    detail: "Chuyển bước hồ sơ giữa các bộ phận xử lý",
    href: SYSTEM_LINKS.lpm,
    icon: Waypoints,
    tone: "blue",
  },
  {
    id: "co-yeu",
    title: "Ban Cơ yếu Chính phủ",
    detail: "Tải phần mềm, tài nguyên chữ ký số chuyên dùng",
    href: SYSTEM_LINKS.crypto,
    icon: KeyRound,
    tone: "violet",
  },
  {
    id: "tra-cuu",
    title: "Tra cứu Giấy chứng nhận",
    detail: "Dành cho công dân, doanh nghiệp tra cứu thông tin GCN",
    href: SYSTEM_LINKS.tracuuGcn,
    icon: Search,
    tone: "green",
  },
  {
    id: "zalo",
    title: "Nhóm hỗ trợ DVC (Zalo)",
    detail: "Trao đổi, phản ánh vướng mắc về dịch vụ công trực tuyến",
    href: SYSTEM_LINKS.zaloSupport,
    icon: MessagesSquare,
    tone: "sky",
  },
];

/** Tiện ích & liên kết hệ thống + lời nhắn của đội ngũ iLIS. */
export function ResourcesSection() {
  return (
    <SectionShell
      id="tien-ich"
      title="Tiện ích & liên kết"
      description="Các công cụ hỗ trợ và hệ thống liên quan"
      icon={Waypoints}
      tone="sky"
    >
      <ul className={styles.grid}>
        {RESOURCES.map((item) => (
          <li key={item.id} data-tone={item.tone}>
            <a className={styles.card} href={item.href} target="_blank" rel="noopener noreferrer">
              <span className={styles.icon} aria-hidden="true">
                <item.icon size={22} />
              </span>
              <span className={styles.text}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
              <ArrowUpRight size={18} className={styles.go} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>

      <figure className={styles.quote}>
        <Quote size={34} aria-hidden="true" />
        <blockquote>{QUOTE.text}</blockquote>
        <figcaption>— {QUOTE.author}</figcaption>
      </figure>
    </SectionShell>
  );
}
