import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentList } from "../document-list";
import type { DocumentRecord } from "@/features/documents/types/document";

const docs: DocumentRecord[] = [
  {
    id: "a",
    kind: "guide",
    title: "Tài liệu A",
    category: "Danh mục A",
    tags: [],
    intro: "intro",
    steps: ["bước 1"],
    updatedLabel: "Khung nội dung",
  },
];

describe("DocumentList", () => {
  it("hiển thị thông báo rỗng khi không có tài liệu", () => {
    render(<DocumentList documents={[]} onOpenDocument={vi.fn()} />);
    expect(screen.getByText("Chưa tìm thấy tài liệu phù hợp")).toBeInTheDocument();
  });

  it("gọi onOpenDocument với đúng id khi nhấn vào thẻ tài liệu", async () => {
    const user = userEvent.setup();
    const onOpenDocument = vi.fn();
    render(<DocumentList documents={docs} onOpenDocument={onOpenDocument} />);

    await user.click(screen.getByText("Tài liệu A"));

    expect(onOpenDocument).toHaveBeenCalledWith("a");
  });
});
