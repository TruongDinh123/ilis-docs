import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getDocumentKindMeta } from "@/features/documents/lib/document-kind-registry";
import type { DocumentRecord } from "@/features/documents/types/document";
import styles from "./document-detail-dialog.module.css";

export interface DocumentDetailDialogProps {
  document: DocumentRecord | null;
  onClose: () => void;
}

export function DocumentDetailDialog({ document, onClose }: DocumentDetailDialogProps) {
  const meta = document ? getDocumentKindMeta(document.kind) : null;

  return (
    <Dialog.Root open={document !== null} onClose={onClose}>
      {document && meta ? (
        <Dialog.Content>
          <Dialog.CloseButton />
          <p className={styles.kicker}>
            {meta.label} · {document.category}
          </p>
          <Dialog.Title>{document.title}</Dialog.Title>
          <p className={styles.intro}>{document.intro}</p>
          <h3 className={styles.stepsHeading}>
            {document.kind === "issue"
              ? "Cách kiểm tra"
              : document.kind === "notice"
                ? "Thông tin cần công bố"
                : "Các bước thực hiện"}
          </h3>
          <ol className={styles.steps}>
            {document.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className={styles.footer}>
            <Badge tone="neutral">{document.updatedLabel}</Badge>
            {document.kind === "notice" ? (
              <Badge tone="warning">Cần VNPT/Trung tâm vận hành xác nhận áp dụng</Badge>
            ) : (
              <Badge tone="success">Nhân bản từ nền tảng VNPT iLIS dùng chung</Badge>
            )}
          </div>
          {document.source ? <p className={styles.sourceLine}>Nguồn: {document.source}</p> : null}
        </Dialog.Content>
      ) : null}
    </Dialog.Root>
  );
}
