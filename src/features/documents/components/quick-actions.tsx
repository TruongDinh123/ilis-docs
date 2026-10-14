import type { DocumentKind } from "@/features/documents/types/document";
import styles from "./quick-actions.module.css";

export interface QuickAction {
  label: string;
  description: string;
  icon: string;
  kind: DocumentKind | "all";
  query?: string;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  onSelect: (kind: DocumentKind | "all", query?: string) => void;
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
  return (
    <div className={styles.grid}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={styles.card}
          onClick={() => onSelect(action.kind, action.query)}
        >
          <span className={styles.icon} aria-hidden="true">
            {action.icon}
          </span>
          <strong>{action.label}</strong>
          <span className={styles.description}>{action.description}</span>
        </button>
      ))}
    </div>
  );
}
