import { seedDocuments } from "@/features/documents/data/seed-documents";
import type { DocumentRepository } from "./document-repository";

/**
 * Triển khai cụ thể dùng dữ liệu tĩnh trong bộ nhớ. Bọc trong Promise để giữ đúng hợp đồng
 * bất đồng bộ của DocumentRepository — hoán đổi bằng nguồn dữ liệu thật (API) sau này sẽ
 * không làm vỡ bất kỳ nơi gọi nào.
 */
export const staticDocumentRepository: DocumentRepository = {
  async getAll() {
    return seedDocuments;
  },
};
