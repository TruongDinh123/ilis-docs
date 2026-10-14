import { useState } from "react";
import { Button } from "@/components/ui/button";
import styles from "./support-template-card.module.css";

const SUPPORT_TEMPLATE = [
  "Mã hồ sơ:",
  "Đơn vị / xã, phường:",
  "Phân hệ đang sử dụng:",
  "Thời điểm phát sinh:",
  "Các bước đã thực hiện:",
  "Thông báo lỗi nguyên văn:",
  "Ảnh màn hình đính kèm:",
].join("\n");

export function SupportTemplateCard() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SUPPORT_TEMPLATE);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="support-heading">
      <h3 id="support-heading">Gửi yêu cầu hỗ trợ</h3>
      <p>Chuẩn bị đủ thông tin giúp đội hỗ trợ xác định vấn đề nhanh hơn.</p>
      <Button size="sm" variant="secondary" onClick={handleCopy}>
        Sao chép mẫu mô tả sự cố
      </Button>
      <p role="status" aria-live="polite" className={styles.status}>
        {status === "copied" && "Đã sao chép mẫu mô tả sự cố."}
        {status === "failed" &&
          "Trình duyệt chưa cấp quyền sao chép. Hãy ghi lại mã hồ sơ, thời điểm và thông báo lỗi."}
      </p>
    </section>
  );
}
