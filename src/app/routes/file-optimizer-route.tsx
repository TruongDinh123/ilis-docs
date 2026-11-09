import { useEffect } from "react";
import { FileOptimizerTool } from "@/features/portal";

/**
 * Tuyến trang chuyên biệt hiển thị độc lập Công cụ Kiểm tra & Tối ưu Dung lượng File Hồ sơ (< 15MB)
 * ở chế độ toàn màn hình (dành cho đường dẫn trực tiếp /toi-uu-file khi mở cửa sổ mới).
 */
export function FileOptimizerRoute() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Tối ưu Dung lượng File Hồ sơ (< 15MB) — iLIS Cà Mau";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <main
      id="main-content"
      style={{
        width: "100vw",
        minHeight: "100vh",
        margin: 0,
        padding: "12px 16px",
        background: "#f1f5f9",
        boxSizing: "border-box",
      }}
    >
      <FileOptimizerTool standalone />
    </main>
  );
}


