import { useEffect, useState } from "react";
import {
  AlertOctagon,
  BookOpen,
  ChevronDown,
  LogIn,
  NotebookPen,
  Puzzle,
  Receipt,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import { RichContent } from "./rich-content";
import { SectionShell } from "./section-shell";
import type { Tone } from "./section-shell";
import styles from "./notes-section.module.css";

interface SectionStyle {
  icon: LucideIcon;
  tone: Tone;
}

/** Biểu tượng/màu theo thứ tự các khối ghi chú gốc (đăng nhập, tiện ích, chủ SDĐ, tích hợp, sổ-GCN, phiếu NVTC). */
const SECTION_STYLES: SectionStyle[] = [
  { icon: LogIn, tone: "blue" },
  { icon: Wrench, tone: "teal" },
  { icon: Users, tone: "violet" },
  { icon: Puzzle, tone: "orange" },
  { icon: BookOpen, tone: "green" },
  { icon: Receipt, tone: "amber" },
];

/**
 * Ghi chú quan trọng – hệ thống iLIS: 6 khối hướng dẫn (accordion, mở mục đầu) và
 * danh sách "Lưu ý quan trọng" dạng thẻ đánh số.
 */
export function NotesSection() {
  const { sections, important } = content.notes;
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(sections[0] ? [sections[0].id] : []));

  // Liên kết neo `#ghi-chu-N` (từ sidebar/tìm kiếm) tự mở đúng khối.
  useEffect(() => {
    function onHash() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (sections.some((section) => section.id === id)) {
        setOpen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
      }
    }
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [sections]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SectionShell
      id="ghi-chu"
      title="Ghi chú quan trọng – Hệ thống iLIS"
      description="Hướng dẫn nhanh khi sử dụng iLIS và những lưu ý cần nhớ"
      icon={NotebookPen}
      tone="blue"
      badge={`${sections.length} chủ đề · ${important.length} lưu ý`}
    >
      <div className={styles.sections}>
        {sections.map((section, i) => {
          const style = SECTION_STYLES[i % SECTION_STYLES.length] ?? SECTION_STYLES[0]!;
          const Icon = style.icon;
          const isOpen = open.has(section.id);
          const panelId = `${section.id}-panel`;
          return (
            <article key={section.id} id={section.id} className={cn(styles.card, isOpen && styles.cardOpen)} data-tone={style.tone}>
              <h3 className={styles.head}>
                <button type="button" className={styles.trigger} aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(section.id)}>
                  <span className={styles.icon} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className={styles.titleWrap}>
                    <span className={styles.order}>Mục {section.order}</span>
                    <span className={styles.title}>{section.title}</span>
                  </span>
                  <ChevronDown size={20} className={styles.chevron} aria-hidden="true" />
                </button>
              </h3>
              <div id={panelId} className={styles.panel} hidden={!isOpen}>
                <RichContent html={section.html} galleryTitle={section.title} />
              </div>
            </article>
          );
        })}
      </div>

      <div className={styles.importantHead} id="luu-y-quan-trong">
        <span className={styles.importantIcon} aria-hidden="true">
          <AlertOctagon size={20} />
        </span>
        <div>
          <h3>Lưu ý quan trọng</h3>
          <p>Những điểm dễ nhầm — đọc kỹ trước khi thao tác</p>
        </div>
      </div>
      <ol className={styles.important}>
        {important.map((note) => (
          <li key={note.num} id={`luu-y-${note.num}`} className={styles.note}>
            <span className={styles.noteNum}>{note.num}</span>
            <RichContent html={note.html} galleryTitle={`Lưu ý ${note.num}`} />
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
