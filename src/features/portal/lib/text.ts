/** Bỏ thẻ HTML, giải mã thực thể cơ bản — dùng để lập chỉ mục tìm kiếm. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Chuẩn hoá để so khớp không phân biệt hoa/thường và dấu tiếng Việt. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Mọi từ khoá (tách theo khoảng trắng) đều phải xuất hiện trong văn bản đã chuẩn hoá. */
export function matchesAllTerms(haystackNormalized: string, query: string): boolean {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  return terms.every((term) => haystackNormalized.includes(term));
}
