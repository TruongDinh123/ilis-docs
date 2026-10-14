import { useState, useEffect } from "react";
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VisitorStats {
  onlineCount: number;
  totalVisits: number;
  todayVisits: number;
  isLoading: boolean;
}

const STORAGE_KEYS = {
  SESSION_ID: "ilis.portal.session.id:v2",
  SESSION_TRACKED: "ilis.portal.session.tracked:v2",
  CACHED_TOTAL: "ilis.portal.stats.cached_total:v2",
  CACHED_TODAY: "ilis.portal.stats.cached_today:v2",
};

// Khởi tạo Session ID duy nhất cho mỗi tab/phiên người dùng
function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
  }
  return id;
}

export function useVisitorStats(): VisitorStats {
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [totalVisits, setTotalVisits] = useState<number>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.CACHED_TOTAL);
    return cached ? parseInt(cached, 10) : 1;
  });
  const [todayVisits, setTodayVisits] = useState<number>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.CACHED_TODAY);
    return cached ? parseInt(cached, 10) : 1;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Quản lý lượt truy cập thật (Total & Today Visits) qua Cloud Firestore
  useEffect(() => {
    const statsDocRef = doc(db, "stats", "portal");
    const todayStr = new Date().toISOString().slice(0, 10);
    const hasTrackedSession = sessionStorage.getItem(STORAGE_KEYS.SESSION_TRACKED);

    // Lắng nghe cập nhật lượt truy cập theo thời gian thực (Realtime Snapshot)
    const unsubscribeStats = onSnapshot(
      statsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const total = typeof data.totalVisits === "number" ? data.totalVisits : 1;
          const today = data.lastDate === todayStr && typeof data.todayVisits === "number" ? data.todayVisits : 1;

          setTotalVisits(total);
          setTodayVisits(today);
          localStorage.setItem(STORAGE_KEYS.CACHED_TOTAL, String(total));
          localStorage.setItem(STORAGE_KEYS.CACHED_TODAY, String(today));
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("Lỗi đồng bộ Firestore stats:", error);
        setIsLoading(false);
      }
    );

    // Nếu là phiên truy cập mới, tăng nguyên tử (Atomic increment)
    if (!hasTrackedSession) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_TRACKED, "1");

      async function incrementVisit() {
        try {
          await setDoc(
            statsDocRef,
            {
              totalVisits: increment(1),
              todayVisits: increment(1),
              lastDate: todayStr,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("Lỗi ghi nhận lượt truy cập:", err);
        }
      }

      incrementVisit();
    }

    return () => unsubscribeStats();
  }, []);

  // 2. Quản lý số người đang Online thời gian thực (Real-time Presence System)
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const sessionDocRef = doc(db, "online_sessions", sessionId);
    const sessionsColRef = collection(db, "online_sessions");

    // Đánh dấu phiên hiện diện của người dùng
    async function sendHeartbeat() {
      try {
        await setDoc(
          sessionDocRef,
          {
            lastSeen: Date.now(),
            path: window.location.pathname,
            domain: window.location.hostname,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Lỗi gửi heartbeat:", err);
      }
    }

    sendHeartbeat();

    // Gửi nhịp tim định kỳ mỗi 15 giây
    const heartbeatInterval = setInterval(sendHeartbeat, 15000);

    // Lắng nghe danh sách tất cả các phiên đang hoạt động trên hệ thống
    const unsubscribeOnline = onSnapshot(
      sessionsColRef,
      (snapshot) => {
        const threshold = Date.now() - 40000; // Còn hoạt động trong 40 giây gần nhất
        let activeCount = 0;

        snapshot.forEach((docItem) => {
          const data = docItem.data();
          if (typeof data.lastSeen === "number" && data.lastSeen >= threshold) {
            activeCount++;
          }
        });

        // Ít nhất phải là 1 (chính người dùng đang xem trang)
        setOnlineCount(Math.max(1, activeCount));
      },
      (err) => {
        console.warn("Lỗi theo dõi online presence:", err);
      }
    );

    // Khi người dùng đóng tab / rời trang, tự động dọn dẹp phiên
    const handleUnload = () => {
      deleteDoc(sessionDocRef).catch(() => {});
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribeOnline();
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      deleteDoc(sessionDocRef).catch(() => {});
    };
  }, []);

  return {
    onlineCount,
    totalVisits,
    todayVisits,
    isLoading,
  };
}
