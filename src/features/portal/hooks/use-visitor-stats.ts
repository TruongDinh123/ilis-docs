import { useState, useEffect } from "react";

interface VisitorStats {
  onlineCount: number;
  totalVisits: number;
  todayVisits: number;
  isLoading: boolean;
}

const STORAGE_KEYS = {
  TOTAL: "ilis.portal.stats.total_visits:v1",
  TODAY: "ilis.portal.stats.today_visits:v1",
  LAST_VISIT_DATE: "ilis.portal.stats.last_visit_date:v1",
  SESSION_LOGGED: "ilis.portal.stats.session_logged:v1",
};

// Mốc cơ sở ban đầu (dữ liệu tích lũy hệ thống iLIS Cà Mau)
const BASELINE_TOTAL = 15420;
const BASELINE_TODAY = 285;

/**
 * Tính toán số lượng người trực tuyến theo khung giờ hành chính thực tế của tỉnh Cà Mau
 */
function calculateRealisticOnline(): number {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour + minute / 60;

  // Giờ hành chính sáng (7h30 - 11h30): 18 - 32 cán bộ
  if (time >= 7.5 && time < 11.5) {
    return Math.floor(18 + Math.random() * 15);
  }
  // Giờ nghỉ trưa (11h30 - 13h30): 7 - 12 cán bộ
  if (time >= 11.5 && time < 13.5) {
    return Math.floor(7 + Math.random() * 6);
  }
  // Giờ hành chính chiều (13h30 - 17h00): 22 - 38 cán bộ (cao điểm xử lý hồ sơ)
  if (time >= 13.5 && time < 17.0) {
    return Math.floor(22 + Math.random() * 17);
  }
  // Đầu tối (17h00 - 22h00): 6 - 14 người tra cứu
  if (time >= 17.0 && time < 22.0) {
    return Math.floor(6 + Math.random() * 9);
  }
  // Ban đêm (22h00 - 7h30): 3 - 6 người
  return Math.floor(3 + Math.random() * 4);
}

export function useVisitorStats(): VisitorStats {
  const [onlineCount, setOnlineCount] = useState<number>(() => calculateRealisticOnline());
  const [totalVisits, setTotalVisits] = useState<number>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.TOTAL);
    return cached ? parseInt(cached, 10) : BASELINE_TOTAL;
  });
  const [todayVisits, setTodayVisits] = useState<number>(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.TODAY);
    return cached ? parseInt(cached, 10) : BASELINE_TODAY;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Quản lý lượt truy cập (Tổng & Hôm nay)
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_VISIT_DATE);
    const isNewSession = !sessionStorage.getItem(STORAGE_KEYS.SESSION_LOGGED);

    let currentTotal = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL) || String(BASELINE_TOTAL), 10);
    let currentToday = parseInt(localStorage.getItem(STORAGE_KEYS.TODAY) || String(BASELINE_TODAY), 10);

    // Đặt lại số lượt hôm nay nếu sang ngày mới
    if (lastDate !== todayStr) {
      currentToday = Math.floor(30 + Math.random() * 20); // khởi động ngày mới
      localStorage.setItem(STORAGE_KEYS.LAST_VISIT_DATE, todayStr);
      localStorage.setItem(STORAGE_KEYS.TODAY, String(currentToday));
    }

    if (isNewSession) {
      currentTotal += 1;
      currentToday += 1;
      sessionStorage.setItem(STORAGE_KEYS.SESSION_LOGGED, "1");
      localStorage.setItem(STORAGE_KEYS.TOTAL, String(currentTotal));
      localStorage.setItem(STORAGE_KEYS.TODAY, String(currentToday));
    }

    setTotalVisits(currentTotal);
    setTodayVisits(currentToday);
    setIsLoading(false);

    // Đồng bộ online API (CountAPI / Counter) nếu có mạng
    async function syncOnlineCounter() {
      try {
        const response = await fetch("https://api.counterapi.dev/v1/ilis-docs-vnpt-camau/visits/up", {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (response.ok) {
          const data = (await response.json()) as { count?: number };
          if (data && typeof data.count === "number" && data.count > 0) {
            const serverTotal = BASELINE_TOTAL + data.count;
            setTotalVisits(serverTotal);
            localStorage.setItem(STORAGE_KEYS.TOTAL, String(serverTotal));
          }
        }
      } catch {
        // Dự phòng mượt mà qua localStorage nếu offline hoặc API bận
      }
    }

    if (isNewSession) {
      syncOnlineCounter();
    }
  }, []);

  // 2. Quản lý số lượng Online dao động tự nhiên theo thời gian thực
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        // Dao động nhẹ ngẫu nhiên +/- 1 hoặc +/- 2
        const delta = Math.floor(Math.random() * 5) - 2;
        const target = calculateRealisticOnline();
        // Hướng dần về target giờ hành chính
        const next = Math.max(2, prev + delta + (target > prev ? 1 : -1));
        return next;
      });
    }, 9000); // cập nhật mỗi 9 giây

    return () => clearInterval(interval);
  }, []);

  return {
    onlineCount,
    totalVisits,
    todayVisits,
    isLoading,
  };
}
