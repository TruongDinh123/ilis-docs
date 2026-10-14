import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { DocumentRepositoryProvider } from "@/features/documents/api/document-repository-provider";
import { staticDocumentRepository } from "@/features/documents/api/static-document-repository";

/**
 * Nơi "lắp ráp" các provider toàn cục — Dependency Injection ở biên ứng dụng.
 * AppProvider chọn triển khai repository cụ thể (static JSON hôm nay, có thể thay bằng
 * HttpDocumentRepository sau này) mà không có component nghiệp vụ nào phải biết tới việc đó
 * (Dependency Inversion Principle).
 */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <DocumentRepositoryProvider repository={staticDocumentRepository}>
        {children}
      </DocumentRepositoryProvider>
    </BrowserRouter>
  );
}
