import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { getDocumentKindMeta } from "@/features/documents/lib/document-kind-registry";
import type { DocumentRecord } from "@/features/documents/types/document";
import styles from "./document-card.module.css";

export interface DocumentCardProps {
  document: DocumentRecord;
  onOpen: (id: string) => void;
}

/**
 * React.memo: tránh re-render thẻ khi danh sách cha thay đổi nhưng record này không đổi
 * (react-performance: Memoized Components).
 */
export const DocumentCard = memo(function DocumentCard({ document, onOpen }: DocumentCardProps) {
  const meta = getDocumentKindMeta(document.kind);

  return (
    <button type="button" className={styles.card} onClick={() => onOpen(document.id)}>
      <span className={styles.icon} aria-hidden="true">
        {meta.icon}
      </span>
      <span className={styles.info}>
        <strong>{document.title}</strong>
        <span className={styles.meta}>
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <span>{document.category}</span>
        </span>
      </span>
      <span className={styles.arrow} aria-hidden="true">
        →
      </span>
    </button>
  );
});
