import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { content } from "../data/content";

const STORAGE_KEY = "ilis.portal.notifications.read:v1";

/**
 * Trạng thái "đã đọc" của thông báo, lưu cục bộ theo trình duyệt. Chỉ những thông báo gốc
 * đánh dấu `unread` mới được tính là chưa đọc; người dùng đọc/đánh dấu thì không hiện lại.
 */
export function useNotifications() {
  const [readIds, setReadIds] = useLocalStorage<string[]>(STORAGE_KEY, []);
  const items = content.notifications;

  const unreadCount = useMemo(
    () => items.filter((item) => item.unread && !readIds.includes(item.id)).length,
    [items, readIds],
  );

  const isUnread = useCallback(
    (id: string) => items.some((item) => item.id === id && item.unread) && !readIds.includes(id),
    [items, readIds],
  );

  const markAllRead = useCallback(() => setReadIds(items.map((item) => item.id)), [items, setReadIds]);

  return { items, unreadCount, isUnread, markAllRead };
}
