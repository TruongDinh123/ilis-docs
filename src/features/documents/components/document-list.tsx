import { DocumentCard } from "./document-card";
import type { DocumentRecord } from "@/features/documents/types/document";
import styles from "./document-list.module.css";

export interface DocumentListProps {
  documents: DocumentRecord[];
  onOpenDocument: (id: string) => void;
}

export function DocumentList({ documents, onOpenDocument }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <strong>Chưa tìm thấy tài liệu phù hợp</strong>
        <span>Thử từ khóa ngắn hơn hoặc chọn một danh mục khác.</span>
      </div>
    );
  }

  return (
    <div className={styles.list} aria-live="polite">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} onOpen={onOpenDocument} />
      ))}
    </div>
  );
}
