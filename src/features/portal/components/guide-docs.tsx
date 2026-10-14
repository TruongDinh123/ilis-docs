import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, FileText, Files, Image as ImageIcon, Search, SearchX, Sheet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import { hasGallery } from "../lib/gallery";
import { matchesAllTerms, normalizeText } from "../lib/text";
import type { DocKind, GuideDoc } from "../types";
import { useGallery } from "./gallery-provider";
import { SectionShell } from "./section-shell";
import type { Tone } from "./section-shell";
import styles from "./guide-docs.module.css";

const PAGE_SIZE = 12;

interface KindMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}
const KIND_META: Record<DocKind, KindMeta> = {
  pdf: { label: "Tài liệu PDF", icon: FileText, tone: "rose" },
  image: { label: "Hướng dẫn bằng hình ảnh", icon: ImageIcon, tone: "sky" },
  excel: { label: "Bảng tính", icon: Sheet, tone: "green" },
  code: { label: "Mã nguồn / tập lệnh", icon: FileText, tone: "violet" },
};

type Filter = "all" | DocKind;

/** Kho tài liệu hướng dẫn & hình ảnh: tìm kiếm, lọc loại, xem ảnh trong lightbox hoặc mở PDF. */
export function GuideDocs() {
  const gallery = useGallery();
  const docs = content.docs;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const kinds = useMemo(() => [...new Set(docs.map((doc) => doc.kind))], [docs]);
  const indexed = useMemo(() => docs.map((doc) => ({ doc, haystack: normalizeText(`${doc.name} ${doc.updated}`) })), [docs]);

  const searching = query.trim().length > 0;
  const filtered = useMemo(
    () =>
      indexed
        .filter(({ doc, haystack }) => (filter === "all" || doc.kind === filter) && (!searching || matchesAllTerms(haystack, query)))
        .map(({ doc }) => doc),
    [filter, indexed, query, searching],
  );
  const shown = searching || filter !== "all" ? filtered : filtered.slice(0, limit);
  const remaining = filtered.length - shown.length;

  function countOf(kind: Filter) {
    return kind === "all" ? docs.length : docs.filter((doc) => doc.kind === kind).length;
  }

  function openDoc(doc: GuideDoc) {
    if (doc.gallery && hasGallery(doc.gallery)) gallery.open(doc.gallery, doc.name);
  }

  return (
    <SectionShell
      id="tai-lieu-hd-va-hinh-anh"
      title="Tài liệu hướng dẫn & hình ảnh"
      description="Quy trình nghiệp vụ, hướng dẫn thao tác và tài liệu tham khảo"
      icon={Files}
      tone="orange"
      badge={`${docs.length} tài liệu`}
    >
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={18} aria-hidden="true" />
          <span className="visually-hidden">Tìm tài liệu</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tài liệu: ký số, GCN, VNLIS, thuế…"
            autoComplete="off"
          />
          {query && (
            <button type="button" className={styles.clear} onClick={() => setQuery("")} aria-label="Xoá từ khoá">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
        <div className={styles.chips} role="group" aria-label="Lọc theo loại tài liệu">
          {(["all", ...kinds] as Filter[]).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={filter === kind}
              className={cn(styles.chip, filter === kind && styles.chipActive)}
              onClick={() => setFilter(kind)}
            >
              {kind === "all" ? "Tất cả" : KIND_META[kind].label}
              <span>{countOf(kind)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        {filtered.length} / {docs.length} tài liệu
      </p>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <SearchX size={38} aria-hidden="true" />
          <strong>Không tìm thấy tài liệu</strong>
          <span>Hãy thử từ khoá khác hoặc bỏ bộ lọc.</span>
        </div>
      ) : (
        <ul className={styles.grid}>
          {shown.map((doc) => {
            const meta = KIND_META[doc.kind];
            const Icon = meta.icon;
            const opensGallery = Boolean(doc.gallery) && hasGallery(doc.gallery ?? "");
            const body = (
              <>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{doc.name.replace(/\.pdf$/i, "")}</span>
                  <span className={styles.meta}>
                    <span className={styles.kind}>{doc.kind === "pdf" ? "PDF" : doc.kind === "image" ? "Hình ảnh" : meta.label}</span>
                    {doc.updated && <time>Cập nhật {doc.updated}</time>}
                    {doc.isNew && <span className={styles.new}>Mới</span>}
                  </span>
                </span>
                <span className={styles.go} aria-hidden="true">
                  {opensGallery ? <ImageIcon size={18} /> : <ExternalLink size={18} />}
                </span>
              </>
            );
            return (
              <li key={doc.id} data-tone={meta.tone}>
                {opensGallery ? (
                  <button type="button" className={styles.card} onClick={() => openDoc(doc)} aria-label={`Xem ảnh hướng dẫn: ${doc.name}`}>
                    {body}
                  </button>
                ) : (
                  <a className={styles.card} href={doc.href} target="_blank" rel="noopener noreferrer">
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {remaining > 0 && (
        <div className={styles.moreRow}>
          <button type="button" className={styles.more} onClick={() => setLimit((value) => value + PAGE_SIZE)}>
            <ChevronDown size={18} aria-hidden="true" />
            Xem thêm {Math.min(PAGE_SIZE, remaining)} tài liệu ({remaining} còn lại)
          </button>
        </div>
      )}
    </SectionShell>
  );
}
