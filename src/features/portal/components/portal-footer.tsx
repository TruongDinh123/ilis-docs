import { ExternalLink } from "lucide-react";
import { FOOTER_LINKS } from "../data/system-links";
import { CaMauEmblem } from "./ca-mau-emblem";
import styles from "./portal-footer.module.css";

function FooterLink({ href, label }: { href: string; label: string }) {
  const external = !href.startsWith("#");
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {label}
      {external && <ExternalLink size={13} aria-hidden="true" />}
    </a>
  );
}

export function PortalFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.main}>
        <div className={styles.brand}>
          <span className={styles.emblem}>
            <CaMauEmblem size={64} />
          </span>
          <div>
            <h2>iLIS Cà Mau</h2>
            <p>
              Hệ thống thông tin đất đai – Phân hệ quản lý hồ sơ địa chính. Dành cho cán bộ sử dụng hệ
              thống tại tỉnh Cà Mau.
            </p>
          </div>
        </div>
        <nav className={styles.col} aria-label="Liên kết nhanh">
          <h3>Liên kết nhanh</h3>
          <ul>
            {FOOTER_LINKS.quick.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} />
              </li>
            ))}
          </ul>
        </nav>
        <nav className={styles.col} aria-label="Hỗ trợ">
          <h3>Hỗ trợ</h3>
          <ul>
            {FOOTER_LINKS.support.map((link) => (
              <li key={link.label}>
                <FooterLink {...link} />
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} · iLIS Cà Mau — VNPT Cà Mau</p>
      </div>
    </footer>
  );
}
