import {
  BarChart3,
  Bug,
  Files,
  GraduationCap,
  Headset,
  House,
  MessagesSquare,
  NotebookPen,
  PenTool,
  Search,
  Waypoints,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import { SYSTEM_LINKS } from "../data/system-links";
import { useScrollSpy } from "../hooks/use-scroll-spy";
import type { Tone } from "./section-shell";
import styles from "./portal-sidebar.module.css";

interface NavEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
  count?: number;
}

export interface PortalSidebarProps {
  onOpenSearch: () => void;
}

/**
 * Menu bên trái: mỗi mục có chip biểu tượng màu riêng (cùng tông với khối nội dung tương ứng),
 * tự tô sáng mục đang đọc (scroll-spy) và hiện số lượng nội dung.
 */
export function PortalSidebar({ onOpenSearch }: PortalSidebarProps) {
  const errorCount = content.errors.groups.reduce((sum, group) => sum + group.items.length, 0);
  const videoCount = content.videos.groups.reduce((sum, group) => sum + group.items.length, 0);

  const entries: NavEntry[] = [
    { id: "trang-chu", label: "Trang chủ", icon: House, tone: "sky" },
    { id: "truy-cap-nhanh", label: "Truy cập nhanh", icon: Zap, tone: "amber" },
    { id: "thong-ke-giam-sat", label: "Giám sát & Thống kê", icon: BarChart3, tone: "teal" },
    { id: "huong-dan-ho-tro", label: "Gửi yêu cầu hỗ trợ", icon: Headset, tone: "green" },
    { id: "cac-loi-thuong-gap", label: "Các lỗi thường gặp", icon: Bug, tone: "rose", count: errorCount },
    { id: "ghi-chu", label: "Ghi chú quan trọng", icon: NotebookPen, tone: "blue", count: content.notes.important.length },
    { id: "phan-mem-ky-so", label: "Phần mềm ký số", icon: PenTool, tone: "violet", count: content.software.length },
    { id: "tap-huan-su-dung", label: "Tập huấn sử dụng", icon: GraduationCap, tone: "teal", count: videoCount + 1 },
    { id: "tai-lieu-hd-va-hinh-anh", label: "Tài liệu & hình ảnh", icon: Files, tone: "orange", count: content.docs.length },
    { id: "tien-ich", label: "Tiện ích & liên kết", icon: Waypoints, tone: "sky" },
  ];

  const activeId = useScrollSpy(entries.map((entry) => entry.id));

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.search} onClick={onOpenSearch}>
        <Search size={18} aria-hidden="true" />
        <span>Tìm kiếm nhanh…</span>
        <kbd>Ctrl K</kbd>
      </button>

      <p className={styles.label}>Danh mục</p>
      <nav aria-label="Mục lục trang">
        <ul className={styles.list}>
          {entries.map((entry) => {
            const active = entry.id === activeId;
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className={cn(styles.item, active && styles.active)}
                  data-tone={entry.tone}
                  aria-current={active ? "location" : undefined}
                >
                  <span className={styles.chip} aria-hidden="true">
                    <entry.icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className={styles.text}>{entry.label}</span>
                  {entry.count !== undefined && <span className={styles.count}>{entry.count}</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.help}>
        <span className={styles.helpIcon} aria-hidden="true">
          <MessagesSquare size={20} />
        </span>
        <strong>Cần hỗ trợ trực tiếp?</strong>
        <p>Tham gia nhóm Zalo hỗ trợ dịch vụ công để được giải đáp nhanh.</p>
        <a href={SYSTEM_LINKS.zaloSupport} target="_blank" rel="noopener noreferrer">
          Vào nhóm Zalo
        </a>
      </div>
    </div>
  );
}
