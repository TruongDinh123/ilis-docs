import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Giữ tiêu điểm bàn phím bên trong một vùng (modal/drawer) khi đang mở —
 * đáp ứng yêu cầu "Keyboard Navigation" (không để lọt tab ra ngoài, không tạo keyboard trap)
 * và "Focus Not Obscured" từ ui-ux-pro-max.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    (focusables[0] ?? container).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const list = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);

  return containerRef;
}
