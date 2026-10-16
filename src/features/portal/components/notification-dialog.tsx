import { Bell, CheckCheck } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { PortalNotification } from "../types";
import { RichContent } from "./rich-content";
import styles from "./notification-dialog.module.css";

export interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

/** Nút chuông trên header, có huy hiệu số thông báo chưa đọc. */
export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  const label = unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo";
  return (
    <button type="button" className={styles.bell} onClick={onClick} aria-label={label} title="Thông báo hệ thống">
      <Bell size={20} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export interface NotificationDialogProps {
  open: boolean;
  onClose: () => void;
  items: PortalNotification[];
  isUnread: (id: string) => boolean;
  unreadCount: number;
  onMarkAllRead: () => void;
}

const TONE_LABEL: Record<PortalNotification["tone"], string> = {
  blue: "Cập nhật",
  orange: "Lưu ý",
  red: "Khẩn",
};

export function NotificationDialog({ open, onClose, items, isUnread, unreadCount, onMarkAllRead }: NotificationDialogProps) {
  return (
    <Dialog.Root open={open} onClose={onClose}>
      <Dialog.Content className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.headIcon} aria-hidden="true">
            <Bell size={22} />
          </span>
          <div>
            <Dialog.Title>Thông báo hệ thống</Dialog.Title>
            <p className={styles.sub}>
              {items.length} thông báo · {unreadCount > 0 ? `${unreadCount} chưa đọc` : "đã đọc hết"}
            </p>
          </div>
        </div>
        <Dialog.CloseButton />

        <div className={styles.toolbar}>
          <button type="button" className={styles.markAll} onClick={onMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck size={16} aria-hidden="true" />
            Đánh dấu tất cả đã đọc
          </button>
        </div>

        <ol className={styles.list} data-dialog-scroll="true" aria-label="Danh sách thông báo">
          {items.map((item) => {
            const unread = isUnread(item.id);
            return (
              <li key={item.id} className={styles.item} data-tone={item.tone} data-unread={unread || undefined}>
                <div className={styles.itemHead}>
                  <span className={styles.tag}>{TONE_LABEL[item.tone]}</span>
                  {unread && <span className={styles.new}>Mới</span>}
                  <time className={styles.date}>{item.date}</time>
                </div>
                <h3 className={styles.itemTitle}>{item.title}</h3>
                <RichContent html={item.bodyHtml} className={styles.body} />
              </li>
            );
          })}
        </ol>
      </Dialog.Content>
    </Dialog.Root>
  );
}
