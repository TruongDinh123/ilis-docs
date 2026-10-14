import { Camera, Copy, Headset, MapPin, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SUPPORT_STEPS } from "../data/system-links";
import { SectionShell } from "./section-shell";
import styles from "./support-guide.module.css";

const ICONS: Record<string, LucideIcon> = {
  screenshot: Camera,
  "case-code": Copy,
  parcel: MapPin,
  steps: PenLine,
};

export function SupportGuide() {
  return (
    <SectionShell
      id="huong-dan-ho-tro"
      title="Hướng dẫn gửi yêu cầu hỗ trợ"
      description="Khi gửi yêu cầu hỗ trợ, vui lòng cung cấp đầy đủ các thông tin sau để được xử lý nhanh nhất"
      icon={Headset}
      tone="green"
    >
      <ol className={styles.steps}>
        {SUPPORT_STEPS.map((step, index) => {
          const Icon = ICONS[step.id] ?? Headset;
          return (
            <li key={step.id} className={styles.step}>
              <span className={styles.order} aria-hidden="true">
                {index + 1}
              </span>
              <span className={styles.icon} aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className={styles.text}>{step.text}</span>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}
