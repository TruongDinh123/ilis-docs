import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { BarChart3, Bell, Bug, CornerDownLeft, Files, NotebookPen, PenTool, Search, SearchX, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import { hasGallery } from "../lib/gallery";
import { matchesAllTerms, normalizeText, stripHtml } from "../lib/text";
import { useGallery } from "./gallery-provider";
import type { Tone } from "./section-shell";
import styles from "./global-search.module.css";

type ResultKind = "error" | "doc" | "video" | "software" | "note" | "notification" | "dashboard";

interface SearchEntry {
  key: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  haystack: string;
  titleNorm: string;
  /** Hành động khi chọn */
  run: { type: "goto"; id: string } | { type: "gallery"; target: string; title: string } | { type: "open"; href: string } | { type: "video"; videoId: string } | { type: "notification" };
}

const KIND_META: Record<ResultKind, { label: string; icon: LucideIcon; tone: Tone }> = {
  dashboard: { label: "Thống kê", icon: BarChart3, tone: "teal" },
  error: { label: "Lỗi", icon: Bug, tone: "rose" },
  doc: { label: "Tài liệu", icon: Files, tone: "orange" },
  video: { label: "Video", icon: Video, tone: "teal" },
  software: { label: "Phần mềm", icon: PenTool, tone: "violet" },
  note: { label: "Ghi chú", icon: NotebookPen, tone: "blue" },
  notification: { label: "Thông báo", icon: Bell, tone: "amber" },
};

const MAX_RESULTS = 40;

function buildIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const push = (entry: Omit<SearchEntry, "haystack" | "titleNorm"> & { body?: string }) => {
    const { body = "", ...rest } = entry;
    entries.push({ ...rest, titleNorm: normalizeText(rest.title), haystack: normalizeText(`${rest.title} ${rest.subtitle} ${body}`) });
  };

  push({
    key: "thong-ke-dat-dai-camau",
    kind: "dashboard",
    title: "Thống kê tổng quan - Báo cáo đất đai (VNPT Cà Mau)",
    subtitle: "Làm sạch CSDL đất đai, không gian, hồ sơ quét, CSDL dân cư",
    body: "thong ke tong quan bao cao dat dai vnpt ca mau lam sach du lieu khong gian hoso quet hsq gcn doi soat ccd bcd2",
    run: { type: "goto", id: "thong-ke-giam-sat" },
  });
  push({
    key: "giam-sat-vnlis-camau",
    kind: "dashboard",
    title: "Bộ Nông nghiệp và Môi trường – Hệ thống giám sát tiến độ hoàn thiện CSDL đất đai quốc gia",
    subtitle: "VNLIS Cà Mau - Kế hoạch 2959/KH-STNMT",
    body: "giam sat tien do hoan thien csdl dat dai quoc gia bo nong nghiep va moi truong vnlis tinh ca mau ke hoach 2959 dong bo",
    run: { type: "goto", id: "thong-ke-giam-sat" },
  });

  for (const group of content.errors.groups) {
    for (const item of group.items) {
      push({
        key: item.id,
        kind: "error",
        title: item.title,
        subtitle: item.badge,
        body: `${stripHtml(item.causeHtml)} ${stripHtml(item.solutionHtml)}`,
        run: { type: "goto", id: item.id },
      });
    }
  }
  for (const section of content.notes.sections) {
    push({
      key: section.id,
      kind: "note",
      title: section.title,
      subtitle: `Ghi chú mục ${section.order}`,
      body: stripHtml(section.html),
      run: { type: "goto", id: section.id },
    });
  }
  for (const note of content.notes.important) {
    const text = stripHtml(note.html);
    push({
      key: `luu-y-${note.num}`,
      kind: "note",
      title: text.length > 110 ? `${text.slice(0, 107)}…` : text,
      subtitle: `Lưu ý quan trọng #${note.num}`,
      body: text,
      run: { type: "goto", id: `luu-y-${note.num}` },
    });
  }
  for (const sw of content.software) {
    push({
      key: sw.id,
      kind: "software",
      title: sw.name,
      subtitle: sw.description,
      run: sw.downloadHref ? { type: "open", href: sw.downloadHref } : { type: "goto", id: "phan-mem-ky-so" },
    });
  }
  push({
    key: "tap-huan-su-dung-chinh",
    kind: "video",
    title: "Video hướng dẫn sử dụng iLIS (Khóa đào tạo tập huấn)",
    subtitle: "Tập huấn sử dụng · Thời lượng 45:45 · VNPT Cà Mau",
    body: "video huong dan su dung ilis tap huan dao tao phan mem dat dai ca mau thoi luong 45 phut giao trinh bai giang daotao taphuan",
    run: { type: "goto", id: "tap-huan-su-dung" },
  });
  push({
    key: "tap-huan-su-dung-muc",
    kind: "video",
    title: "Tập huấn sử dụng",
    subtitle: "Khóa đào tạo và video hướng dẫn vận hành hệ thống VNPT iLIS Cà Mau",
    body: "tap huan su dung dao tao huong dan su dung ilis quy trinh thao tac can bo dia chinh chi nhanh vpdvdd",
    run: { type: "goto", id: "tap-huan-su-dung" },
  });
  for (const group of content.videos.groups) {
    for (const video of group.items) {
      push({
        key: `video-${video.id}-${group.title}`,
        kind: "video",
        title: video.title,
        subtitle: group.title,
        run: { type: "video", videoId: video.id },
      });
    }
  }
  for (const doc of content.docs) {
    const name = doc.name.replace(/\.pdf$/i, "");
    push({
      key: doc.id,
      kind: "doc",
      title: name,
      subtitle: doc.kind === "pdf" ? "Tài liệu PDF" : "Hướng dẫn bằng hình ảnh",
      run:
        doc.gallery && hasGallery(doc.gallery)
          ? { type: "gallery", target: doc.gallery, title: name }
          : doc.href
            ? { type: "open", href: doc.href }
            : { type: "goto", id: "tai-lieu-hd-va-hinh-anh" },
    });
  }
  for (const notice of content.notifications) {
    push({
      key: notice.id,
      kind: "notification",
      title: notice.title,
      subtitle: `Thông báo · ${notice.date}`,
      body: stripHtml(notice.bodyHtml),
      run: { type: "notification" },
    });
  }
  return entries;
}

/** Cuộn mượt tới một phần tử theo id, đồng thời kích hoạt cơ chế "tự mở" (accordion) bằng hashchange. */
export function goToAnchor(id: string) {
  window.history.replaceState(null, "", `#${id}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

const SHORTCUTS: { label: string; id: string; icon: LucideIcon; tone: Tone }[] = [
  { label: "Các lỗi thường gặp", id: "cac-loi-thuong-gap", icon: Bug, tone: "rose" },
  { label: "Phần mềm ký số", id: "phan-mem-ky-so", icon: PenTool, tone: "violet" },
  { label: "Video hướng dẫn", id: "huong-dan", icon: Video, tone: "teal" },
  { label: "Tài liệu & hình ảnh", id: "tai-lieu-hd-va-hinh-anh", icon: Files, tone: "orange" },
];

export interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  onOpenNotifications: () => void;
}

function highlight(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  // So khớp không dấu: dựng bản đồ vị trí trên chuỗi đã chuẩn hoá (NFD giữ độ dài ký tự gốc sau khi bỏ dấu).
  const norm = normalizeText(text);
  if (norm.length !== text.length) return text;
  const ranges: [number, number][] = [];
  for (const term of terms.map(normalizeText)) {
    if (!term) continue;
    let from = 0;
    for (;;) {
      const at = norm.indexOf(term, from);
      if (at === -1) break;
      ranges.push([at, at + term.length]);
      from = at + term.length;
    }
  }
  if (ranges.length === 0) return text;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  const nodes: ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], i) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(<mark key={i}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/** Tìm kiếm toàn trang (Ctrl+K): lỗi, ghi chú, phần mềm, video, tài liệu, thông báo. */
export function GlobalSearch({ open, onClose, onOpenNotifications }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const gallery = useGallery();
  const index = useMemo(buildIndex, []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const qNorm = normalizeText(q);
    return index
      .filter((entry) => matchesAllTerms(entry.haystack, q))
      .sort((a, b) => Number(b.titleNorm.includes(qNorm)) - Number(a.titleNorm.includes(qNorm)))
      .slice(0, MAX_RESULTS);
  }, [index, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function select(entry: SearchEntry) {
    onClose();
    // Đợi dialog gỡ khỏi DOM (khóa cuộn nền được trả lại) rồi mới cuộn/mở.
    window.setTimeout(() => {
      switch (entry.run.type) {
        case "goto":
          goToAnchor(entry.run.id);
          break;
        case "gallery":
          gallery.open(entry.run.target, entry.run.title);
          break;
        case "open":
          window.open(entry.run.href, "_blank", "noopener,noreferrer");
          break;
        case "video":
          window.dispatchEvent(new CustomEvent("portal:play-video", { detail: entry.run.videoId }));
          goToAnchor("tap-huan-su-dung");
          break;
        case "notification":
          onOpenNotifications();
          break;
      }
    }, 80);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = results[active];
      if (entry) select(entry);
    }
  }

  return (
    <Dialog.Root open={open} onClose={onClose}>
      <Dialog.Content className={styles.panel}>
        <div className="visually-hidden">
          <Dialog.Title>Tìm kiếm nhanh</Dialog.Title>
        </div>
        <div className={styles.inputRow}>
          <Search size={22} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length > 0 ? `${listId}-${active}` : undefined}
            aria-label="Từ khoá tìm kiếm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tìm lỗi, phần mềm, video, tài liệu, thông báo…"
            autoComplete="off"
          />
          <kbd>Esc</kbd>
        </div>

        <div className={styles.body}>
          {!query.trim() && (
            <div className={styles.suggest}>
              <p>Đi nhanh tới</p>
              <ul>
                {SHORTCUTS.map((item) => (
                  <li key={item.id} data-tone={item.tone}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.setTimeout(() => goToAnchor(item.id), 80);
                      }}
                    >
                      <span aria-hidden="true">
                        <item.icon size={18} />
                      </span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p className={styles.hint}>
                Gợi ý từ khoá: <em>token</em>, <em>ký số</em>, <em>phiếu thuế</em>, <em>đồng bộ</em>, <em>QR</em>…
              </p>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className={styles.empty}>
              <SearchX size={36} aria-hidden="true" />
              <strong>Không có kết quả cho “{query.trim()}”</strong>
              <span>Thử từ khoá ngắn hơn hoặc bỏ dấu.</span>
            </div>
          )}

          {results.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Kết quả tìm kiếm" className={styles.results}>
              {results.map((entry, i) => {
                const meta = KIND_META[entry.kind];
                return (
                  // Theo mẫu ARIA combobox: focus ở lại ô nhập, bàn phím (↑ ↓ Enter) được xử lý ở đó.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                  <li
                    key={entry.key}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    data-tone={meta.tone}
                    className={cn(styles.result, i === active && styles.resultActive)}
                    onMouseMove={() => setActive(i)}
                    onClick={() => select(entry)}
                  >
                    <span className={styles.kindIcon} aria-hidden="true">
                      <meta.icon size={18} />
                    </span>
                    <span className={styles.resultText}>
                      <span className={styles.resultTitle}>{highlight(entry.title, query)}</span>
                      <span className={styles.resultSub}>
                        <b>{meta.label}</b> · {entry.subtitle}
                      </span>
                    </span>
                    <CornerDownLeft size={16} className={styles.enter} aria-hidden="true" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={styles.footer} aria-hidden="true">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> chọn
          </span>
          <span>
            <kbd>Enter</kbd> mở
          </span>
          <span>{results.length > 0 ? `${results.length} kết quả` : `${index.length} mục có thể tìm`}</span>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
