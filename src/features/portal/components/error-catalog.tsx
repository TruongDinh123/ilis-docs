import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bug,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleCheck,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import { matchesAllTerms, normalizeText, stripHtml } from "../lib/text";
import type { ErrorAction, ErrorItem } from "../types";
import { useGallery } from "./gallery-provider";
import { RichContent } from "./rich-content";
import { SectionShell } from "./section-shell";
import type { Tone } from "./section-shell";
import styles from "./error-catalog.module.css";

const GROUP_TONE: Record<string, Tone> = {
  kyso: "violet",
  trinhduyet: "sky",
  dvc: "teal",
  thue: "amber",
  gcn: "green",
};

interface IndexedItem {
  item: ErrorItem;
  haystack: string;
}

function ActionButton({ action, title }: { action: ErrorAction; title: string }) {
  const gallery = useGallery();
  if (action.type === "gallery") {
    return (
      <button type="button" className={styles.action} onClick={() => gallery.open(action.target, title)}>
        <ImageIcon size={16} aria-hidden="true" />
        {action.label}
      </button>
    );
  }
  const isDownload = action.type === "download";
  return (
    <a
      className={cn(styles.action, isDownload && styles.download)}
      href={action.href}
      target="_blank"
      rel="noopener noreferrer"
      {...(isDownload ? { download: "" } : {})}
    >
      {isDownload ? <Download size={16} aria-hidden="true" /> : <ExternalLink size={16} aria-hidden="true" />}
      {action.label}
    </a>
  );
}

/**
 * Danh mục lỗi thường gặp: tìm kiếm không dấu, lọc theo nhóm, mở/thu gọn từng lỗi.
 * Nội dung nguyên nhân/cách khắc phục luôn nằm trong DOM (chỉ ẩn bằng `hidden`) để các liên kết
 * neo nội bộ (vd "Hướng dẫn xoá cache trình duyệt") vẫn tìm được đích và tự mở đúng mục.
 */
export function ErrorCatalog() {
  const { tabs, groups } = content.errors;
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const index = useMemo(() => {
    const map = new Map<string, IndexedItem[]>();
    for (const group of groups) {
      map.set(
        group.id,
        group.items.map((item) => ({
          item,
          haystack: normalizeText(
            [item.title, item.badge, stripHtml(item.causeHtml), stripHtml(item.solutionHtml)].join(" "),
          ),
        })),
      );
    }
    return map;
  }, [groups]);

  const total = useMemo(() => groups.reduce((sum, group) => sum + group.items.length, 0), [groups]);
  const searching = query.trim().length > 0;

  const visibleGroups = useMemo(
    () =>
      groups
        .filter((group) => tab === "all" || group.id === tab)
        .map((group) => ({
          group,
          entries: (index.get(group.id) ?? []).filter((entry) => !searching || matchesAllTerms(entry.haystack, query)),
        }))
        .filter(({ entries }) => entries.length > 0),
    [groups, index, query, searching, tab],
  );
  const visibleCount = visibleGroups.reduce((sum, { entries }) => sum + entries.length, 0);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: 0 };
    for (const group of groups) {
      const n = (index.get(group.id) ?? []).filter((entry) => !searching || matchesAllTerms(entry.haystack, query)).length;
      result[group.id] = n;
      result.all = (result.all ?? 0) + n;
    }
    return result;
  }, [groups, index, query, searching]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleIds = useMemo(
    () => visibleGroups.flatMap(({ entries }) => entries.map((entry) => entry.item.id)),
    [visibleGroups],
  );
  const allOpen = visibleIds.length > 0 && visibleIds.every((id) => searching || expanded.has(id));

  function toggleAll() {
    setExpanded(allOpen ? new Set() : new Set(visibleIds));
  }

  // Mở đúng mục lỗi khi có liên kết neo trỏ vào bên trong (hash khi tải trang, hashchange, hoặc bấm link).
  useEffect(() => {
    function reveal(id: string, smooth: boolean) {
      if (!id) return false;
      const el = document.getElementById(id);
      const owner = el?.closest<HTMLElement>("[data-error-id]");
      if (!el || !owner) return false;
      const errorId = owner.dataset.errorId;
      if (errorId) setExpanded((prev) => (prev.has(errorId) ? prev : new Set(prev).add(errorId)));
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
      });
      return true;
    }

    function onHash() {
      reveal(decodeURIComponent(window.location.hash.slice(1)), false);
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const id = decodeURIComponent((link.getAttribute("href") ?? "").slice(1));
      if (reveal(id, true)) event.preventDefault();
    }

    onHash();
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <SectionShell
      id="cac-loi-thuong-gap"
      title="Các lỗi thường gặp"
      description="Tra cứu nguyên nhân và cách khắc phục — gõ từ khoá hoặc chọn nhóm lỗi"
      icon={Bug}
      tone="rose"
      badge={`${total} lỗi`}
      flush
    >
      <div className={styles.toolbar}>
        <div className={styles.searchRow}>
          <label className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <span className="visually-hidden">Tìm lỗi</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm lỗi: token, ký số, xã, thuế, đồng bộ…"
              autoComplete="off"
            />
            {query && (
              <button type="button" className={styles.clear} onClick={() => setQuery("")} aria-label="Xoá từ khoá">
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>
          <button type="button" className={styles.toggleAll} onClick={toggleAll} disabled={searching}>
            {allOpen ? <ChevronsDownUp size={16} aria-hidden="true" /> : <ChevronsUpDown size={16} aria-hidden="true" />}
            {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
          </button>
        </div>

        <div className={styles.tabs} role="group" aria-label="Lọc theo nhóm lỗi">
          {tabs.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                className={cn(styles.tab, active && styles.tabActive)}
                data-tone={t.id === "all" ? "rose" : GROUP_TONE[t.id]}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className={styles.count}>{counts[t.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          {searching ? `Tìm thấy ${visibleCount} / ${total} lỗi cho “${query.trim()}”` : `Hiển thị ${visibleCount} / ${total} lỗi`}
        </p>
      </div>

      <div className={styles.groups}>
        {visibleGroups.length === 0 && (
          <div className={styles.empty}>
            <SearchX size={40} aria-hidden="true" />
            <strong>Không tìm thấy lỗi phù hợp</strong>
            <span>Thử từ khoá ngắn hơn, bỏ dấu, hoặc chọn “Tất cả lỗi”.</span>
            <button
              type="button"
              className={styles.toggleAll}
              onClick={() => {
                setQuery("");
                setTab("all");
              }}
            >
              Đặt lại bộ lọc
            </button>
          </div>
        )}

        {visibleGroups.map(({ group, entries }) => (
          <div key={group.id} className={styles.group} data-tone={GROUP_TONE[group.id] ?? "blue"}>
            <h3 className={styles.groupTitle}>
              <span className={styles.groupDot} aria-hidden="true" />
              {group.title}
              <span className={styles.groupCount}>{entries.length}</span>
            </h3>
            <ul className={styles.list}>
              {entries.map(({ item }) => {
                const open = searching || expanded.has(item.id);
                const panelId = `${item.id}-panel`;
                return (
                  <li key={item.id} id={item.id} data-error-id={item.id} className={cn(styles.card, open && styles.cardOpen)}>
                    <h4 className={styles.cardHead}>
                      <button
                        type="button"
                        className={styles.trigger}
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => toggle(item.id)}
                      >
                        <span className={styles.num}>{item.index}</span>
                        <span className={styles.titleWrap}>
                          <span className={styles.badge}>{item.badge}</span>
                          <span className={styles.title}>{item.title}</span>
                        </span>
                        <ChevronDown size={20} className={styles.chevron} aria-hidden="true" />
                      </button>
                    </h4>
                    <div id={panelId} className={styles.panel} hidden={!open}>
                      <div className={styles.cols}>
                        <section className={cn(styles.box, styles.cause)} aria-label="Hiện tượng và nguyên nhân">
                          <h5>
                            <Bug size={15} aria-hidden="true" /> Hiện tượng &amp; Nguyên nhân
                          </h5>
                          <RichContent html={item.causeHtml} galleryTitle={item.title} />
                        </section>
                        <section className={cn(styles.box, styles.fix)} aria-label="Cách khắc phục">
                          <h5>
                            <CircleCheck size={15} aria-hidden="true" /> Cách khắc phục
                          </h5>
                          <RichContent html={item.solutionHtml} galleryTitle={item.title} />
                        </section>
                      </div>
                      {item.actions.length > 0 && (
                        <div className={styles.actions}>
                          {item.actions.map((action, i) => (
                            <ActionButton key={`${item.id}-${i}`} action={action} title={item.title} />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
