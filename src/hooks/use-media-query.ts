import { useSyncExternalStore } from "react";

/**
 * Trả về boolean dẫn xuất thay vì giá trị liên tục (ví dụ chiều rộng cửa sổ),
 * theo khuyến nghị react-performance "Derived State": subscribe tới boolean
 * đã suy ra thay vì giá trị liên tục để tránh re-render không cần thiết.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
