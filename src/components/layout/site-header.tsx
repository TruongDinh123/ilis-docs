import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { paths } from "@/config/paths";
import vnptLogo from "@/assets/images/logo-vnpt.png";
import styles from "./site-header.module.css";

export interface SiteHeaderProps {
  onToggleMenu: () => void;
  menuOpen: boolean;
  /** Thay thế khối thương hiệu mặc định (logo + tên). */
  brand?: ReactNode;
  /** Menu ngang (chỉ hiện từ màn hình rộng). */
  nav?: ReactNode;
  /** Cụm thao tác bên phải (tìm kiếm, thông báo...). */
  actions?: ReactNode;
}

export function SiteHeader({ onToggleMenu, menuOpen, brand, nav, actions }: SiteHeaderProps) {
  const location = useLocation();

  return (
    <>
      <header className={styles.header}>
        <button
          type="button"
          className={cn(styles.menuButton)}
          aria-label={menuOpen ? "Đóng danh mục" : "Mở danh mục"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={onToggleMenu}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            {menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
        {brand ?? (
          <Link
            to={paths.home.getHref()}
            className={styles.brand}
            aria-label="iLIS Cà Mau — trang chủ"
          >
            <img className={styles.logo} src={vnptLogo} alt="VNPT" />
            <span className={styles.brandText}>
              <strong>iLIS CÀ MAU</strong>
              <span>Hướng dẫn &amp; hỗ trợ người dùng</span>
            </span>
          </Link>
        )}
        {nav && <div className={styles.nav}>{nav}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {/* data-current-path hỗ trợ kiểm thử điều hướng mà không phụ thuộc chi tiết hiển thị */}
      <span className="visually-hidden" data-current-path={location.pathname} />
    </>
  );
}
