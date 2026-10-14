import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./sidebar-nav.module.css";

export interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
  /** Gọi khi người dùng chọn một liên kết neo (#id) trong menu lúc drawer di động đang mở. */
  onNavigate?: (hash: string) => void;
  children: ReactNode;
}

/**
 * Cột điều hướng. Desktop: cột dính (sticky) nền gradient xanh đậm chạy suốt chiều cao khung nhìn.
 * Di động: drawer trượt từ trái; khóa cuộn nền được xử lý ở AppShell (tránh lỗi "cuộn kép").
 */
export function SidebarNav({ open, onClose, onNavigate, children }: SidebarNavProps) {
  const asideRef = useRef<HTMLElement | null>(null);

  // Uỷ quyền một listener cho mọi liên kết neo thay vì buộc nội dung sidebar phải biết về drawer.
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside || !open) return;

    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      event.preventDefault();
      onNavigate?.(link.getAttribute("href") ?? "");
    }

    aside.addEventListener("click", onClick);
    return () => aside.removeEventListener("click", onClick);
  }, [open, onNavigate]);

  return (
    <>
      <aside
        ref={asideRef}
        className={cn(styles.sidebar, open && styles.open)}
        id="primary-navigation"
        aria-label="Danh mục"
      >
        {children}
      </aside>
      <div className={cn(styles.scrim)} hidden={!open} onClick={onClose} aria-hidden="true" />
    </>
  );
}
