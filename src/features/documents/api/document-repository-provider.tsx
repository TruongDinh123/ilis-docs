import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { DocumentRepository } from "./document-repository";

const DocumentRepositoryContext = createContext<DocumentRepository | null>(null);

export function DocumentRepositoryProvider({
  repository,
  children,
}: {
  repository: DocumentRepository;
  children: ReactNode;
}) {
  return (
    <DocumentRepositoryContext.Provider value={repository}>
      {children}
    </DocumentRepositoryContext.Provider>
  );
}

/**
 * Điểm truy cập duy nhất mà hook/component nghiệp vụ được dùng để lấy repository —
 * ép buộc phụ thuộc vào abstraction (DocumentRepository) thay vì import thẳng
 * staticDocumentRepository (Dependency Inversion Principle).
 */
export function useDocumentRepository(): DocumentRepository {
  const repository = useContext(DocumentRepositoryContext);
  if (!repository) {
    throw new Error(
      "useDocumentRepository phải được gọi bên trong <DocumentRepositoryProvider>",
    );
  }
  return repository;
}
