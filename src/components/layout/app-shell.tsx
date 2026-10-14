import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SidebarNav } from "./sidebar-nav";
import styles from "./app-shell.module.css";

export interface AppShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  /** Dải thông báo phía trên header (vd ticker chạy chữ). */
  banner?: ReactNode;
  /** Thương hiệu thay thế trong header. */
  brand?: ReactNode;
  /** Menu ngang trong header. */
  headerNav?: ReactNode;
  /** Cụm thao tác bên phải header. */
  headerActions?: ReactNode;
}

/**
 * Khung bố cục toàn ứng dụng. Chịu trách nhiệm duy nhất: điều phối banner/header/sidebar/nội dung
 * và khóa cuộn nền khi menu di động mở (Single Responsibility Principle — layout không biết
 * gì về nội dung bên trong, mọi phần riêng của tính năng được truyền vào qua "slot").
 */
export function AppShell({ sidebar, children, banner, brand, headerNav, headerActions }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollPositionRef = useRef(0);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const layout = layoutRef.current;
    if (menuOpen) {
      // Đo đáy header TRƯỚC khi khóa cuộn: nếu banner (ticker) còn hiển thị phía trên thì header không nằm ở y=0.
      const header = layout?.querySelector<HTMLElement>("header");
      if (layout && header) layout.style.setProperty("--drawer-top", `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
      scrollPositionRef.current = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo({ top: scrollPositionRef.current, behavior: "instant" as ScrollBehavior });
    }
  }, [menuOpen]);

  // Đóng menu tự động khi mở rộng về desktop để tránh kẹt trạng thái khóa cuộn.
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 760) setMenuOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Esc đóng drawer (ux: Escape Routes).
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Chọn một mục neo trong drawer: đóng menu rồi mới cuộn (vì nền đang bị khóa cuộn).
  const handleNavigate = useCallback((hash: string) => {
    setMenuOpen(false);
    window.setTimeout(() => {
      const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", hash);
    }, 60);
  }, []);

  return (
    <div className={styles.layout} ref={layoutRef}>
      {banner}
      <SiteHeader
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        brand={brand}
        nav={headerNav}
        actions={headerActions}
      />
      <div className={styles.body}>
        <SidebarNav open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={handleNavigate}>
          {sidebar}
        </SidebarNav>
        <main className={styles.main} id="main-content" tabIndex={-1}>
          <div className={styles.drumDecor} aria-hidden="true">
            <div className={styles.drumSticky}>
              <div className={styles.drumFull} />
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
