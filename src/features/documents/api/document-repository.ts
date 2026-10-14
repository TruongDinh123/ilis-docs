import type { DocumentRecord } from "@/features/documents/types/document";

/**
 * Interface Segregation + Dependency Inversion: các component chỉ phụ thuộc vào hợp đồng
 * nhỏ này (getAll), không biết dữ liệu đến từ JSON tĩnh hay một API thật. Thay triển khai
 * ở "api/static-document-repository.ts" bằng một HttpDocumentRepository trong tương lai
 * mà không cần sửa bất kỳ component hay hook nào (Liskov Substitution — mọi triển khai
 * phải tôn trọng cùng hợp đồng: trả Promise<DocumentRecord[]>, không throw cho danh sách rỗng).
 */
export interface DocumentRepository {
  getAll(): Promise<DocumentRecord[]>;
}
