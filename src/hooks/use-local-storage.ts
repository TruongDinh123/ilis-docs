import { useEffect, useState } from "react";

/**
 * State đồng bộ với localStorage (vd: lưu theme đã chọn, tránh phụ thuộc store ngoài).
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Lưu trữ cục bộ có thể bị chặn (chế độ riêng tư) — bỏ qua an toàn.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
