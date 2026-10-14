import { useMemo } from "react";
import type { DocumentKind, DocumentRecord } from "@/features/documents/types/document";
import { keywordSearchStrategy, type SearchStrategy } from "@/features/documents/lib/search-strategies";

export interface UseDocumentSearchOptions {
  documents: DocumentRecord[];
  term: string;
  kindFilter: DocumentKind | "all";
  strategy?: SearchStrategy;
}

/**
 * Lọc tài liệu theo từ khóa (qua Strategy) và loại tài liệu. Dùng useMemo với tham số
 * nguyên thủy (term, kindFilter) làm dependency — tránh re-tính khi tham chiếu mảng
 * documents đổi nhưng nội dung lọc không đổi (react-performance: Narrow Dependencies).
 */
export function useDocumentSearch({
  documents,
  term,
  kindFilter,
  strategy = keywordSearchStrategy,
}: UseDocumentSearchOptions): DocumentRecord[] {
  return useMemo(() => {
    const trimmed = term.trim();
    return documents.filter((document) => {
      const matchesKind = kindFilter === "all" || document.kind === kindFilter;
      const matchesTerm = trimmed === "" || strategy.matches(document, trimmed);
      return matchesKind && matchesTerm;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- strategy là hàm thuần, ổn định theo tham chiếu module.
  }, [documents, term, kindFilter]);
}
