import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, X, ZoomIn, ZoomOut } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/cn";
import styles from "./image-lightbox.module.css";

export interface ImageLightboxProps {
  images: string[];
  title: string;
  startIndex?: number;
  onClose: () => void;
}

/**
 * Trình xem ảnh hướng dẫn (thay Viewer.js của site gốc): điều hướng bằng nút/phím mũi tên,
 * phóng to bằng click hoặc phím +/-, dải ảnh thu nhỏ, và phương án dự phòng khi ảnh lỗi tải.
 */
export function ImageLightbox({ images, title, startIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const containerRef = useFocusTrap<HTMLDivElement>(true);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const total = images.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + total) % total);
      setZoomed(false);
    },
    [total],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "+" || event.key === "=") setZoomed(true);
      else if (event.key === "-") setZoomed(false);
    }
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [go, onClose]);

  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0, left: 0 });
  }, [index, zoomed]);

  const current = images[index];
  if (!current) return null;

  return createPortal(
    <div className={styles.root}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Ảnh hướng dẫn: ${title}`}
        tabIndex={-1}
      >
        <header className={styles.bar}>
          <div className={styles.barTitle}>
            <strong>{title}</strong>
            <span>
              Ảnh {index + 1} / {total}
            </span>
          </div>
          <div className={styles.barActions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setZoomed((value) => !value)}
              aria-label={zoomed ? "Thu nhỏ vừa khung" : "Phóng to kích thước thật"}
              aria-pressed={zoomed}
            >
              {zoomed ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
            </button>
            <a className={styles.iconButton} href={current} target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh gốc trong tab mới">
              <ExternalLink size={18} aria-hidden="true" />
            </a>
            <button type="button" className={cn(styles.iconButton, styles.close)} onClick={onClose} aria-label="Đóng trình xem ảnh">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.stageWrap}>
          {total > 1 && (
            <button type="button" className={cn(styles.nav, styles.prev)} onClick={() => go(-1)} aria-label="Ảnh trước">
              <ChevronLeft size={26} aria-hidden="true" />
            </button>
          )}
          <div ref={stageRef} className={cn(styles.stage, zoomed && styles.stageZoomed)}>
            {failed[index] ? (
              <div className={styles.error} role="alert">
                <ImageOff size={34} aria-hidden="true" />
                <p>Không tải được ảnh. Hãy kiểm tra kết nối mạng tới máy chủ hướng dẫn.</p>
                <a href={current} target="_blank" rel="noopener noreferrer">
                  Thử mở ảnh trong tab mới
                </a>
              </div>
            ) : (
              <>
                {!loaded[index] && <div className={styles.skeleton} aria-hidden="true" />}
                <button
                  type="button"
                  className={styles.imageButton}
                  onClick={() => setZoomed((value) => !value)}
                  aria-label={zoomed ? "Thu nhỏ ảnh" : "Phóng to ảnh"}
                >
                  <img
                    key={current}
                    className={cn(styles.image, zoomed && styles.imageZoomed)}
                    src={current}
                    alt={`${title} — ảnh ${index + 1}`}
                    onLoad={() => setLoaded((state) => ({ ...state, [index]: true }))}
                    onError={() => setFailed((state) => ({ ...state, [index]: true }))}
                  />
                </button>
              </>
            )}
          </div>
          {total > 1 && (
            <button type="button" className={cn(styles.nav, styles.next)} onClick={() => go(1)} aria-label="Ảnh sau">
              <ChevronRight size={26} aria-hidden="true" />
            </button>
          )}
        </div>

        {total > 1 && (
          <ul className={styles.thumbs} aria-label="Danh sách ảnh">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  className={cn(styles.thumb, i === index && styles.thumbActive)}
                  onClick={() => {
                    setIndex(i);
                    setZoomed(false);
                  }}
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-current={i === index}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
