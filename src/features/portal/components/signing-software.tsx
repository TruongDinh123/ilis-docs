import { useState } from "react";
import { BookOpenText, Download, PenTool, ShieldCheck } from "lucide-react";
import { content } from "../data/content";
import { SectionShell } from "./section-shell";
import styles from "./signing-software.module.css";

const TONES = ["violet", "blue", "teal", "amber", "rose", "green", "sky", "orange"] as const;

function Logo({ src, tone }: { src: string; tone: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <span className={styles.logoFallback} data-tone={tone} aria-hidden="true">
        <ShieldCheck size={26} />
      </span>
    );
  }
  return <img className={styles.logo} src={src} alt="" width={56} height={56} loading="lazy" onError={() => setFailed(true)} />;
}

/** Danh sách phần mềm ký số/token: nút tải về và tài liệu hướng dẫn cài đặt (ẩn nếu gốc không có). */
export function SigningSoftware() {
  const items = content.software;
  return (
    <SectionShell
      id="phan-mem-ky-so"
      title="Phần mềm ký số"
      description="Tải bộ cài và xem hướng dẫn cài đặt cho từng phần mềm"
      icon={PenTool}
      tone="violet"
      badge={`${items.length} phần mềm`}
    >
      <ul className={styles.grid}>
        {items.map((sw, i) => {
          const tone = TONES[i % TONES.length] ?? "violet";
          const hasGuide = Boolean(sw.guideHref);
          return (
            <li key={sw.id} className={styles.card} data-tone={tone}>
              <div className={styles.top}>
                <Logo src={sw.logo} tone={tone} />
                <div className={styles.meta}>
                  <span className={styles.desc}>{sw.description}</span>
                  <strong className={styles.name}>{sw.name}</strong>
                </div>
              </div>
              <div className={styles.buttons}>
                {sw.downloadHref && (
                  <a className={styles.download} href={sw.downloadHref} target="_blank" rel="noopener noreferrer">
                    <Download size={16} aria-hidden="true" />
                    Tải về
                  </a>
                )}
                {hasGuide && (
                  <a className={styles.guide} href={sw.guideHref} target="_blank" rel="noopener noreferrer">
                    <BookOpenText size={16} aria-hidden="true" />
                    {sw.guideLabel || "Hướng dẫn"}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
