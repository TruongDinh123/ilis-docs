import { createContext, useContext, useEffect, useId } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/cn";
import styles from "./dialog.module.css";

/**
 * Compound Component pattern: <Dialog.Root> chia sẻ state (open, id) cho
 * <Dialog.Content>/<Dialog.Title> qua Context — tránh "prop drilling" và cho phép
 * bố cục bên trong tự do thay đổi mà không sửa API gốc (tham chiếu shadcn/ui Dialog).
 */
interface DialogContextValue {
  titleId: string;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error(`${component} phải được đặt bên trong <Dialog.Root>`);
  }
  return ctx;
}

export interface DialogRootProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function Root({ open, onClose, children }: DialogRootProps) {
  const titleId = useId();

  // Khóa cuộn nền khi mở — tránh lỗi "double scroll" đã gặp ở bản prototype trước đó.
  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const scrollY = window.scrollY;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      // Hỗ trợ phím mũi tên và PageUp/PageDown cuộn nội dung modal khi không ở trong ô nhập liệu
      const target = event.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (!isInput) {
        const dialogEl = document.querySelector<HTMLElement>('div[role="dialog"]');
        const scrollable =
          dialogEl?.querySelector<HTMLElement>('[data-dialog-scroll="true"]') ?? dialogEl;
        if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            scrollable.scrollBy({ top: 60, behavior: "smooth" });
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            scrollable.scrollBy({ top: -60, behavior: "smooth" });
          } else if (event.key === "PageDown") {
            event.preventDefault();
            scrollable.scrollBy({ top: 320, behavior: "smooth" });
          } else if (event.key === "PageUp") {
            event.preventDefault();
            scrollable.scrollBy({ top: -320, behavior: "smooth" });
          }
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ titleId, onClose }}>
      {createPortal(children, document.body)}
    </DialogContext.Provider>
  );
}

function Overlay() {
  const { onClose } = useDialogContext("Dialog.Overlay");
  return <div className={styles.overlay} onClick={onClose} aria-hidden="true" />;
}

export interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

function Content({ children, className }: DialogContentProps) {
  const { titleId } = useDialogContext("Dialog.Content");
  const containerRef = useFocusTrap<HTMLDivElement>(true);

  // Cho phép lăn chuột ở bất kỳ đâu trên màn hình (kể cả vùng lề / overlay bên ngoài) để cuộn nội dung modal
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const isOutside = !containerRef.current.contains(event.target as Node);
    if (isOutside) {
      const scrollable =
        containerRef.current.querySelector<HTMLElement>('[data-dialog-scroll="true"]') ??
        containerRef.current;
      scrollable.scrollBy({ top: event.deltaY, behavior: "auto" });
    }
  };

  return (
    <div className={styles.center} onWheel={handleWheel}>
      <Overlay />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(styles.content, className)}
      >
        {children}
      </div>
    </div>
  );
}

function Title({ children }: { children: ReactNode }) {
  const { titleId } = useDialogContext("Dialog.Title");
  return (
    <h2 id={titleId} className={styles.title}>
      {children}
    </h2>
  );
}

function CloseButton() {
  const { onClose } = useDialogContext("Dialog.CloseButton");
  return (
    <button type="button" className={styles.close} onClick={onClose} aria-label="Đóng">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  );
}

export const Dialog = {
  Root,
  Content,
  Title,
  CloseButton,
};
