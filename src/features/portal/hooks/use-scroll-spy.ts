import { useEffect, useState } from "react";

/**
 * Theo dõi mục nào đang nằm ở vùng đọc chính của màn hình (scroll-spy) để tô sáng menu bên.
 * Dùng IntersectionObserver thay vì lắng nghe scroll → không chặn luồng chính (ux: performance).
 */
export function useScrollSpy(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const key = ids.join("|");

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0 || typeof IntersectionObserver === "undefined") return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        if (visible.size > 0) {
          const [first] = [...visible.entries()].sort((a, b) => a[1] - b[1]);
          if (first) setActiveId(first[0]);
        }
      },
      // Vùng "đang đọc": khoảng 25%–55% chiều cao viewport tính từ trên xuống.
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}
