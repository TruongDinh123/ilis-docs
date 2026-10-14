import { useEffect, useRef } from "react";
import { copyText } from "../hooks/use-copy";
import { cn } from "@/lib/cn";
import { useGallery } from "./gallery-provider";
import styles from "./rich-content.module.css";

export interface RichContentProps {
  /** HTML đã được làm sạch ở bước trích xuất (whitelist thẻ/thuộc tính) — nguồn tin cậy, tĩnh. */
  html: string;
  className?: string;
  galleryTitle?: string;
}

/**
 * Hiển thị đoạn HTML nhân bản từ site gốc. Các nút tương tác được chuyển thành thuộc tính
 * `data-gallery` / `data-copy` lúc trích xuất; ở đây ta gắn MỘT listener uỷ quyền cho cả khối
 * thay vì gắn từng nút (hiệu năng + không cần dùng handler inline).
 */
export function RichContent({ html, className, galleryTitle }: RichContentProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const gallery = useGallery();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>("[data-gallery],[data-copy]");
      if (!el || !root?.contains(el)) return;

      const galleryKey = el.dataset.gallery;
      if (galleryKey) {
        event.preventDefault();
        gallery.open(galleryKey, galleryTitle ?? el.textContent?.trim() ?? "Ảnh hướng dẫn");
        return;
      }
      const value = el.dataset.copy;
      if (value) {
        event.preventDefault();
        const original = el.textContent ?? "";
        void copyText(value).then((ok) => {
          el.textContent = ok ? "Đã chép ✓" : "Không chép được";
          el.dataset.state = ok ? "copied" : "failed";
          window.setTimeout(() => {
            el.textContent = original;
            delete el.dataset.state;
          }, 1500);
        });
      }
    }

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [gallery, galleryTitle]);

  return <div ref={ref} className={cn(styles.rich, className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
