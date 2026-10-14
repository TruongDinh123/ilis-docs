import { useState } from "react";
import { Bell, Megaphone, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { content } from "../data/content";
import { TICKER_FALLBACK } from "../data/system-links";
import styles from "./ticker-bar.module.css";

export interface TickerBarProps {
  onOpenNotifications: () => void;
}

/**
 * Dải thông báo chạy chữ phía trên cùng. Dừng khi rê chuột/focus (ux: pause on hover),
 * có thể đóng — trạng thái đóng gắn với nội dung tin đầu tiên nên tin mới sẽ hiện lại.
 * Với người dùng bật "giảm chuyển động", chữ đứng yên và hiển thị tin mới nhất.
 */
export function TickerBar({ onOpenNotifications }: TickerBarProps) {
  const items = content.ticker.length > 0 ? content.ticker : [TICKER_FALLBACK];
  const signature = items[0] ?? "";
  const [dismissedSignature, setDismissedSignature] = useLocalStorage<string>("ilis.portal.ticker.dismissed:v1", "");
  const [paused, setPaused] = useState(false);

  if (dismissedSignature === signature) return null;

  return (
    <div className={styles.bar} role="region" aria-label="Thông báo hệ thống">
      <span className={styles.label}>
        <Megaphone size={15} aria-hidden="true" />
        Thông báo
      </span>
      <div
        className={styles.viewport}
        data-paused={paused || undefined}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className={styles.track}>
          {[0, 1].map((copy) => (
            <ul key={copy} className={styles.list} aria-hidden={copy === 1 || undefined}>
              {items.map((item, index) => (
                <li key={`${copy}-${index}`}>
                  <button type="button" className={styles.item} onClick={onOpenNotifications} tabIndex={copy === 1 ? -1 : 0}>
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button type="button" className={styles.more} onClick={onOpenNotifications}>
        <Bell size={14} aria-hidden="true" />
        <span>Xem tất cả</span>
      </button>
      <button
        type="button"
        className={styles.close}
        aria-label="Ẩn thanh thông báo"
        onClick={() => setDismissedSignature(signature)}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
