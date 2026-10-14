import { describe, expect, it } from "vitest";
import { keywordSearchStrategy, titleOnlySearchStrategy } from "../search-strategies";
import type { DocumentRecord } from "@/features/documents/types/document";

const sample: DocumentRecord = {
  id: "token",
  kind: "issue",
  title: "Không nhận token hoặc không ký được",
  category: "Ký số · 4 bước kiểm tra",
  tags: ["token", "ký số", "VGCA"],
  intro: "Kiểm tra theo thứ tự đơn giản trước khi gửi yêu cầu hỗ trợ.",
  steps: ["Rút và cắm lại token."],
  updatedLabel: "Khung nội dung",
};

describe("keywordSearchStrategy", () => {
  it("khớp theo tiêu đề không phân biệt hoa thường/dấu", () => {
    expect(keywordSearchStrategy.matches(sample, "TOKEN")).toBe(true);
  });

  it("khớp theo thẻ (tags)", () => {
    expect(keywordSearchStrategy.matches(sample, "VGCA")).toBe(true);
  });

  it("trả về false khi không khớp bất kỳ trường nào", () => {
    expect(keywordSearchStrategy.matches(sample, "phiếu thuế")).toBe(false);
  });
});

describe("titleOnlySearchStrategy", () => {
  it("không khớp theo thẻ, chỉ khớp theo tiêu đề", () => {
    expect(titleOnlySearchStrategy.matches(sample, "VGCA")).toBe(false);
    expect(titleOnlySearchStrategy.matches(sample, "token")).toBe(true);
  });
});
