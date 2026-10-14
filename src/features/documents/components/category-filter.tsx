import { listDocumentKinds, getDocumentKindMeta } from "@/features/documents/lib/document-kind-registry";
import type { DocumentKind } from "@/features/documents/types/document";
import { cn } from "@/lib/cn";
import styles from "./category-filter.module.css";

export interface CategoryFilterProps {
  value: DocumentKind | "all";
  onChange: (value: DocumentKind | "all") => void;
  counts: Record<DocumentKind | "all", number>;
}

export function CategoryFilter({ value, onChange, counts }: CategoryFilterProps) {
  const kinds = listDocumentKinds();

  return (
    <div className={styles.row} role="group" aria-label="Lọc tài liệu">
      <button
        type="button"
        className={cn(styles.chip, value === "all" && styles.active)}
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
      >
        Tất cả ({counts.all})
      </button>
      {kinds.map((kind) => (
        <button
          key={kind}
          type="button"
          className={cn(styles.chip, value === kind && styles.active)}
          aria-pressed={value === kind}
          onClick={() => onChange(kind)}
        >
          {getDocumentKindMeta(kind).label} ({counts[kind]})
        </button>
      ))}
    </div>
  );
}
