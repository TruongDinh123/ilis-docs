import { useEffect, useState } from "react";
import { useDocumentRepository } from "@/features/documents/api/document-repository-provider";
import type { DocumentRecord } from "@/features/documents/types/document";

export interface UseDocumentsResult {
  documents: DocumentRecord[];
  isLoading: boolean;
}

/**
 * Nạp danh sách tài liệu qua abstraction DocumentRepository (không import trực tiếp
 * triển khai tĩnh) — component gọi hook này không cần biết dữ liệu đến từ đâu.
 */
export function useDocuments(): UseDocumentsResult {
  const repository = useDocumentRepository();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    repository.getAll().then((result) => {
      if (!cancelled) {
        setDocuments(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  return { documents, isLoading };
}
