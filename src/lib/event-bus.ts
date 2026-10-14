/**
 * Event bus tối giản — triển khai Observer pattern + Singleton.
 * Cho phép các feature không liên quan giao tiếp (vd: "support" lắng nghe
 * sự kiện "document:viewed" để gợi ý mẫu hỗ trợ) mà không phụ thuộc trực tiếp vào nhau,
 * giữ đúng nguyên tắc "unidirectional / feature isolation" của kiến trúc feature-based.
 */
type Listener<T> = (payload: T) => void;

export interface EventMap {
  "document:viewed": { documentId: string };
  "search:performed": { term: string; resultCount: number };
}

class EventBus {
  // Lưu trữ nội bộ dùng kiểu nới lỏng vì TypeScript chưa thể thu hẹp mapped type theo generic K
  // trong thân phương thức; API công khai bên dưới vẫn an toàn kiểu nhờ chữ ký generic <K>.
  private listeners = new Map<keyof EventMap, Set<Listener<EventMap[keyof EventMap]>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<EventMap[keyof EventMap]>);
    return () => set?.delete(listener as Listener<EventMap[keyof EventMap]>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

// Singleton — một instance dùng chung toàn ứng dụng.
export const eventBus = new EventBus();
