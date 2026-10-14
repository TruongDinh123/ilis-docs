import type { DocumentRecord } from "@/features/documents/types/document";
import styles from "./notice-panel.module.css";

export interface NoticePanelProps {
  notices: DocumentRecord[];
  onOpenDocument: (id: string) => void;
}

export function NoticePanel({ notices, onOpenDocument }: NoticePanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="notice-heading">
      <h3 id="notice-heading" className={styles.heading}>
        Thông tin vận hành
      </h3>
      {notices.map((notice) => (
        <button
          key={notice.id}
          type="button"
          className={styles.item}
          onClick={() => onOpenDocument(notice.id)}
        >
          <span className={styles.date}>{notice.updatedLabel}</span>
          <span className={styles.body}>
            <strong>{notice.title}</strong>
            <span>{notice.intro}</span>
          </span>
        </button>
      ))}
    </section>
  );
}
