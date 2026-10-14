/**
 * Kiểu dữ liệu của nội dung portal. Cấu trúc khớp với đầu ra của
 * `scripts/sync-dongthap-content.py` (dữ liệu được trích từ page source của
 * https://ilis-docs.vnptdongthap.com.vn/).
 */

export type NotificationTone = "blue" | "red" | "orange";

export interface PortalNotification {
  id: string;
  tone: NotificationTone;
  unread: boolean;
  title: string;
  date: string;
  /** HTML đã làm sạch (whitelist) — chỉ render qua <RichContent />. */
  bodyHtml: string;
}

export type ErrorAction =
  | { type: "gallery"; label: string; target: string }
  | { type: "download" | "link"; label: string; href: string };

export interface ErrorItem {
  id: string;
  index: number;
  category: string;
  badge: string;
  title: string;
  causeHtml: string;
  solutionHtml: string;
  actions: ErrorAction[];
}

export interface ErrorGroup {
  id: string;
  title: string;
  items: ErrorItem[];
}

export interface ErrorTab {
  id: string;
  label: string;
}

export interface NoteSection {
  id: string;
  order: number;
  title: string;
  html: string;
}

export interface ImportantNote {
  num: number;
  html: string;
}

export interface SigningSoftware {
  id: string;
  name: string;
  description: string;
  logo: string;
  downloadHref: string;
  guideHref: string;
  guideLabel: string;
}

export interface VideoItem {
  id: string;
  title: string;
  start: number | null;
}

export interface VideoGroup {
  title: string;
  items: VideoItem[];
}

export type DocKind = "pdf" | "image" | "code" | "excel";

export interface GuideDoc {
  id: string;
  name: string;
  kind: DocKind;
  updated: string;
  isNew: boolean;
  href?: string;
  gallery?: string;
}

export interface PortalContent {
  origin: string;
  ticker: string[];
  notifications: PortalNotification[];
  errors: { tabs: ErrorTab[]; groups: ErrorGroup[] };
  notes: { sections: NoteSection[]; important: ImportantNote[] };
  software: SigningSoftware[];
  videos: { defaultPlaylist: string; groups: VideoGroup[] };
  docs: GuideDoc[];
  imageMap: Record<string, string[]>;
}
