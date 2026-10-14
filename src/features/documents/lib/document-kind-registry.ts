import type { DocumentKind } from "@/features/documents/types/document";

export interface DocumentKindMeta {
  label: string;
  icon: string;
  tone: "primary" | "danger" | "warning";
}

/**
 * Factory/registry pattern: tra cứu siêu dữ liệu hiển thị (nhãn, icon, màu) theo loại
 * tài liệu qua một điểm duy nhất. Thêm loại tài liệu mới chỉ cần thêm một mục ở đây —
 * không phải sửa DocumentCard, DocumentList hay bất kỳ nơi nào khác hiển thị nó
 * (Open/Closed Principle).
 */
const registry: Record<DocumentKind, DocumentKindMeta> = {
  guide: { label: "Hướng dẫn", icon: "▤", tone: "primary" },
  issue: { label: "Lỗi thường gặp", icon: "⚠", tone: "danger" },
  notice: { label: "Thông báo", icon: "◷", tone: "warning" },
};

export function getDocumentKindMeta(kind: DocumentKind): DocumentKindMeta {
  return registry[kind];
}

export function listDocumentKinds(): DocumentKind[] {
  return Object.keys(registry) as DocumentKind[];
}
