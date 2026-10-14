import { Search } from "lucide-react";
import { CaMauEmblem } from "./ca-mau-emblem";
import styles from "./portal-header.module.css";

/** Thương hiệu trên header: huy hiệu bản đồ Cà Mau + tên cổng. */
export function PortalBrand() {
  return (
    <a href="#trang-chu" className={styles.brand} aria-label="iLIS Cà Mau — về đầu trang">
      <span className={styles.emblem}>
        <CaMauEmblem />
      </span>
      <span className={styles.brandText}>
        <strong>iLIS CÀ MAU</strong>
        <span>Hướng dẫn &amp; hỗ trợ người dùng</span>
      </span>
    </a>
  );
}

const NAV = [
  { label: "Lỗi thường gặp", href: "#cac-loi-thuong-gap", tone: "rose" },
  { label: "Phần mềm ký số", href: "#phan-mem-ky-so", tone: "violet" },
  { label: "Video", href: "#huong-dan", tone: "teal" },
  { label: "Tài liệu", href: "#tai-lieu-hd-va-hinh-anh", tone: "orange" },
] as const;

/** Menu ngang nhanh (màn hình rộng). */
export function PortalNav() {
  return (
    <nav aria-label="Lối tắt" className={styles.nav}>
      {NAV.map((item) => (
        <a key={item.href} href={item.href} className={styles.pill} data-tone={item.tone}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export interface HeaderSearchButtonProps {
  onClick: () => void;
}

export function HeaderSearchButton({ onClick }: HeaderSearchButtonProps) {
  return (
    <button type="button" className={styles.searchBtn} onClick={onClick} aria-label="Tìm kiếm nhanh (Ctrl+K)">
      <Search size={18} aria-hidden="true" />
      <span>Tìm kiếm</span>
      <kbd>Ctrl K</kbd>
    </button>
  );
}
