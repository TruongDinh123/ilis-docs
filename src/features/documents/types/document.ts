export type DocumentKind = "guide" | "issue" | "notice";

export interface DocumentRecord {
  id: string;
  kind: DocumentKind;
  title: string;
  category: string;
  tags: string[];
  intro: string;
  steps: string[];
  updatedLabel: string;
  /** Ghi rõ nguồn gốc nội dung — minh bạch dữ liệu nào đã nhân bản từ nền tảng dùng chung
   * và giá trị nào vẫn cần Cà Mau xác nhận riêng (địa chỉ hệ thống, mã tỉnh, lịch vận hành). */
  source?: string;
}
