import { useId } from "react";
import {
  CA_MAU_CAPE_POINT,
  CA_MAU_CITY_POINT,
  CA_MAU_MAP_HEIGHT,
  CA_MAU_MAP_PATH,
  CA_MAU_MAP_WIDTH,
} from "../data/ca-mau-map";
import styles from "./ca-mau-emblem.module.css";

export interface CaMauEmblemProps {
  /** Đường kính hiển thị (px). Mặc định co giãn theo container. */
  size?: number;
  /** Hiện nhãn "TP. Cà Mau" / "Đất Mũi" — chỉ nên bật ở cỡ lớn. */
  showLabels?: boolean;
  className?: string;
  title?: string;
}

const VIEW = 120;
const SCALE = 0.84;
const OFFSET_X = (VIEW - CA_MAU_MAP_WIDTH * SCALE) / 2;
const OFFSET_Y = (VIEW - CA_MAU_MAP_HEIGHT * SCALE) / 2 + 1;

function place([x, y]: readonly [number, number]): [number, number] {
  return [OFFSET_X + x * SCALE, OFFSET_Y + y * SCALE];
}

/**
 * Huy hiệu tròn với bản đồ tỉnh Cà Mau (đường viền đất liền, nguồn GADM) — thay cho hoa văn
 * trống đồng ở vòng tròn trang trí. Hai vòng chấm gợi hoa văn Đông Sơn, marker đánh dấu
 * TP. Cà Mau và Đất Mũi.
 */
export function CaMauEmblem({ size, showLabels = false, className, title = "Bản đồ tỉnh Cà Mau" }: CaMauEmblemProps) {
  const uid = useId().replace(/:/g, "");
  const [cityX, cityY] = place(CA_MAU_CITY_POINT);
  const [capeX, capeY] = place(CA_MAU_CAPE_POINT);

  return (
    <svg
      className={className ? `${styles.emblem} ${className}` : styles.emblem}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id={`${uid}-sea`} cx="35%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#2a8bf2" />
          <stop offset="55%" stopColor="#0a4f9e" />
          <stop offset="100%" stopColor="#062b5a" />
        </radialGradient>
        <linearGradient id={`${uid}-land`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="55%" stopColor="#ffd75e" />
          <stop offset="100%" stopColor="#f5a524" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx="60" cy="60" r="55" />
        </clipPath>
      </defs>

      <circle cx="60" cy="60" r="58.5" fill={`url(#${uid}-sea)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        {/* Vòng đồng tâm gợi mặt trống đồng */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.8" strokeDasharray="1.2 3" />
        <circle cx="60" cy="60" r="41" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="0.8" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="0.8" strokeDasharray="0.8 2.4" />
        <g transform={`translate(${OFFSET_X} ${OFFSET_Y}) scale(${SCALE})`}>
          <path d={CA_MAU_MAP_PATH} fill="#041c3d" opacity="0.35" transform="translate(1.2 1.6)" />
          <path
            d={CA_MAU_MAP_PATH}
            fill={`url(#${uid}-land)`}
            stroke="#ffffff"
            strokeWidth="0.7"
            strokeLinejoin="round"
          />
        </g>
      </g>
      <circle cx="60" cy="60" r="58.5" fill="none" stroke="#ffd75e" strokeWidth="1.4" />
      <circle cx="60" cy="60" r="55" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.5" />

      {/* Marker TP. Cà Mau */}
      <g className={styles.pin}>
        <circle cx={cityX} cy={cityY} r="5.4" fill="#e11d48" fillOpacity="0.25" className={styles.pulse} />
        <circle cx={cityX} cy={cityY} r="2.8" fill="#e11d48" stroke="#ffffff" strokeWidth="1.1" />
      </g>
      {/* Marker Đất Mũi */}
      <circle cx={capeX + 2.4} cy={capeY - 1.6} r="2" fill="#0a4f9e" stroke="#ffffff" strokeWidth="1" />

      {showLabels && (
        <g className={styles.labels}>
          <text x={cityX + 6} y={cityY + 1.4}>TP. Cà Mau</text>
          <text x={capeX + 7} y={capeY - 3.4}>Đất Mũi</text>
        </g>
      )}
    </svg>
  );
}
