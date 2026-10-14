import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Sao chép văn bản vào clipboard, có phương án dự phòng cho ngữ cảnh không an toàn
 * (HTTP nội bộ) nơi `navigator.clipboard` không khả dụng.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // rơi xuống phương án dự phòng
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Trạng thái "đã chép" tự tắt sau một khoảng ngắn. */
export function useCopyFeedback(resetMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (value: string) => {
      const ok = await copyText(value);
      if (ok) {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetMs);
      }
      return ok;
    },
    [resetMs],
  );

  return { copied, copy };
}
