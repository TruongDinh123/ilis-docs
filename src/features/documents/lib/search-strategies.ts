import type { DocumentRecord } from "@/features/documents/types/document";

/**
 * Strategy pattern: mỗi chiến lược đóng gói MỘT cách so khớp. Hook useDocumentSearch chỉ
 * biết tới interface SearchStrategy — thêm chiến lược mới (vd: tìm kiếm có trọng số, tìm
 * kiếm theo dấu tiếng Việt không dấu) không yêu cầu sửa hook hay bất kỳ component nào
 * đang dùng nó (Open/Closed Principle).
 */
export interface SearchStrategy {
  matches(document: DocumentRecord, term: string): boolean;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("vi");
}

/** Chiến lược mặc định: so khớp trên tiêu đề, danh mục, mô tả, thẻ và các bước. */
export const keywordSearchStrategy: SearchStrategy = {
  matches(document, term) {
    const haystack = normalize(
      [document.title, document.category, document.intro, ...document.tags, ...document.steps].join(
        " ",
      ),
    );
    return haystack.includes(normalize(term));
  },
};

/** Chiến lược thu hẹp: chỉ so khớp trên tiêu đề — dùng cho ô tìm kiếm gợi ý nhanh. */
export const titleOnlySearchStrategy: SearchStrategy = {
  matches(document, term) {
    return normalize(document.title).includes(normalize(term));
  },
};
