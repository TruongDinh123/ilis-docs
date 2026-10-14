import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import styles from "./section-shell.module.css";

export type Tone = "blue" | "amber" | "green" | "violet" | "rose" | "teal" | "orange" | "sky";

export interface SectionShellProps {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Chip nhỏ cạnh tiêu đề, vd "28 lỗi" */
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Không padding ở thân khi nội dung tự quản (vd bảng/accordion sát mép) */
  flush?: boolean;
}

/**
 * Khung chung cho mọi khối nội dung: tiêu đề có chip biểu tượng màu theo "tone", mô tả ngắn,
 * vùng thao tác bên phải. Mỗi section có `id` làm neo cho sidebar/scroll-spy (deep link).
 */
export function SectionShell({
  id,
  title,
  description,
  icon: Icon,
  tone = "blue",
  badge,
  actions,
  children,
  className,
  bodyClassName,
  flush = false,
}: SectionShellProps) {
  const headingId = `${id}-title`;
  return (
    <section id={id} data-tone={tone} className={cn(styles.section, className)} aria-labelledby={headingId}>
      <header className={styles.head}>
        <span className={styles.chip} aria-hidden="true">
          <Icon size={22} strokeWidth={2} />
        </span>
        <div className={styles.titles}>
          <h2 id={headingId}>
            {title}
            {badge && <span className={styles.badge}>{badge}</span>}
          </h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={cn(styles.body, flush && styles.flush, bodyClassName)}>{children}</div>
    </section>
  );
}
