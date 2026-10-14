/**
 * Các liên kết hệ thống / tài nguyên. Hiện đang trỏ về hạ tầng Đồng Tháp (nguồn nhân bản).
 * Khi Cà Mau có địa chỉ riêng, chỉ cần sửa tại đây — toàn bộ giao diện tự cập nhật.
 */
export interface SystemLink {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  /** Tên token màu trong CSS (xem portal-tokens.css) */
  tone: "blue" | "amber" | "green" | "violet" | "rose";
  badge?: string;
}

export const SYSTEM_LINKS = {
  cadas: "https://ilis-cadas.vnpt.vn/",
  lpm: "https://ilis-lpm.vnpt.vn/",
  tracuuGcn: "https://ilis-tracuugcn.vnpt.vn/",
  syncRequestSheet:
    "https://docs.google.com/spreadsheets/d/1CRBD5P0dw4TuIDjnae3ufy9jb2S8LecfxPVtSKorcQc/edit?gid=158860723#gid=158860723",
  dataSharing: "https://ilis-datasharing.dongthap.gov.vn",
  sso: "https://ilis-sso.dongthap.gov.vn/Account/LoggedOut",
  crypto: "https://dichvucong.ca.gov.vn/#/page/taitainguyen/PM",
  vnlisMonitor: "https://kh2959-vnlis.mae.gov.vn/",
  zaloSupport: "https://zalo.me/g/ngqplu402",
  checkXmlThue: "https://ilis-docs.vnptdongthap.com.vn/check-xml-thue.html",
} as const;

export const QUICK_ACCESS: SystemLink[] = [
  {
    id: "loi-thuong-gap",
    title: "Các lỗi thường gặp",
    subtitle: "Tổng hợp lỗi & cách xử lý",
    detail: "Ký số, DVC, Thuế, Đăng nhập, SĐC…",
    href: "#cac-loi-thuong-gap",
    tone: "rose",
    badge: "Cần biết",
  },
  {
    id: "cadas",
    title: "Tài khoản CB đất đai xử lý",
    subtitle: "Hệ thống ILIS CADAS",
    detail: "Tiếp nhận, xử lý hồ sơ và chỉnh lý bản đồ",
    href: SYSTEM_LINKS.cadas,
    tone: "blue",
  },
  {
    id: "lpm",
    title: "Tài khoản CB thuế xử lý",
    subtitle: "Hệ thống ILIS LPM",
    detail: "Luân chuyển hồ sơ, chuyển bước",
    href: SYSTEM_LINKS.lpm,
    tone: "amber",
  },
  {
    id: "tracuu-gcn",
    title: "Tra cứu GCN",
    subtitle: "Tra cứu Giấy chứng nhận",
    detail: "Công dân, doanh nghiệp tra cứu GCN",
    href: SYSTEM_LINKS.tracuuGcn,
    tone: "green",
  },
  // {
  //   id: "dong-bo",
  //   title: "Y/C đồng bộ hồ sơ",
  //   subtitle: "Yêu cầu đồng bộ hồ sơ",
  //   detail: "Đồng bộ hồ sơ giữa ILIS và DVC",
  //   href: SYSTEM_LINKS.syncRequestSheet,
  //   tone: "violet",
  // },
];

export interface SupportStep {
  id: string;
  text: string;
}

export const SUPPORT_STEPS: SupportStep[] = [
  { id: "screenshot", text: "Gửi ảnh màn hình lỗi" },
  { id: "case-code", text: "Gửi mã hồ sơ dạng text" },
  { id: "parcel", text: "Gửi kèm thông tin tờ, thửa, xã/phường, khu vực của thửa đất dạng text" },
  { id: "steps", text: "Gửi kèm mô tả thao tác đang bị lỗi dạng text" },
];

export const TICKER_FALLBACK = "Thông báo vận hành hệ thống iLIS sẽ được cập nhật tại đây.";

export const QUOTE = {
  text: "Thành công của phần mềm không chỉ đến từ đội ngũ phát triển, mà còn được đúc kết từ sự tin tưởng và những phản hồi tâm huyết của Quý khách hàng.",
  author: "VNPT Cà Mau.",
};

export const FOOTER_LINKS = {
  quick: [
    { label: "Các lỗi thường gặp", href: "#cac-loi-thuong-gap" },
    { label: "Phần mềm ký số", href: "#phan-mem-ky-so" },
    { label: "Hướng dẫn ILIS", href: "#huong-dan" },
    { label: "Tra cứu GCN", href: SYSTEM_LINKS.tracuuGcn },
    { label: "Đăng nhập ILIS", href: SYSTEM_LINKS.cadas },
  ],
  support: [
    { label: "Luân chuyển hồ sơ", href: SYSTEM_LINKS.lpm },
    // { label: "Check XML thuế", href: SYSTEM_LINKS.checkXmlThue },
    { label: "Ban cơ yếu CP", href: SYSTEM_LINKS.crypto },
    { label: "Giám sát tiến độ CSDL đất đai (VNLIS)", href: SYSTEM_LINKS.vnlisMonitor },
    { label: "Nhóm hỗ trợ DVC (Zalo)", href: SYSTEM_LINKS.zaloSupport },
  ],
};
