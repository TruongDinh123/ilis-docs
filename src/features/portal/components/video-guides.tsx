import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  GraduationCap,
  ListOrdered,
  Play,
  PlayCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import type { VideoItem } from "../types";
import { SectionShell } from "./section-shell";
import styles from "./video-guides.module.css";

export interface FlatVideo extends VideoItem {
  key: string;
  group: string;
  isLocal?: boolean;
  src?: string;
  duration?: string;
  badge?: string;
  subtitle?: string;
}

const OFFICIAL_VIDEO_KEY = "official-training-0";

const TRAINING_CHAPTERS: { timeSeconds: number; timestamp: string; label: string }[] = [
  { timeSeconds: 0, timestamp: "00:00", label: "Tổng quan khóa tập huấn & Giới thiệu hệ thống VNPT iLIS Cà Mau" },
  { timeSeconds: 375, timestamp: "06:15", label: "Đăng nhập hệ thống, cài đặt môi trường trình duyệt & phân quyền" },
  { timeSeconds: 860, timestamp: "14:20", label: "Quy trình tiếp nhận, kiểm tra hồ sơ và thao tác xử lý nghiệp vụ" },
  { timeSeconds: 1485, timestamp: "24:45", label: "Lập phiếu chuyển thông tin nghĩa vụ tài chính (Phiếu thuế điện tử)" },
  { timeSeconds: 1990, timestamp: "33:10", label: "Trình ký số văn bản điện tử và phê duyệt hồ sơ dành cho Lãnh đạo" },
  { timeSeconds: 2415, timestamp: "40:15", label: "Tra cứu, thống kê tiến độ, xuất báo cáo và các lưu ý nghiệp vụ" },
];

function embedUrl(video: VideoItem): string {
  const params = new URLSearchParams({ rel: "0", autoplay: "1", modestbranding: "1" });
  if (video.start) params.set("start", String(video.start));
  return `https://www.youtube-nocookie.com/embed/${video.id}?${params.toString()}`;
}

function watchUrl(video: VideoItem): string {
  const start = video.start ? `&t=${video.start}s` : "";
  return `https://www.youtube.com/watch?v=${video.id}${start}`;
}

function getVideoSrc(): string {
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return "https://ilis-docs-vnpt-camau.web.app/DaoTao_TapHuan.mp4";
  }
  return `${import.meta.env.BASE_URL}DaoTao_TapHuan.mp4`;
}

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/**
 * Danh mục: Tập huấn sử dụng.
 * Khung phát video tập huấn chính thức (bản MP4 Full HD tại địa phương) kèm các video clip chuyên đề,
 * hỗ trợ chọn mốc thời gian (chapters), tải video về máy và chuyển đổi linh hoạt.
 */
export function VideoGuides() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showChapters, setShowChapters] = useState(false);
  const [copied, setCopied] = useState(false);

  // Tạo danh sách nhóm video với khóa tập huấn chính thức nằm đầu danh sách
  const groups = useMemo(() => {
    const officialGroup = {
      title: "Khóa đào tạo - Tập huấn chính thức",
      items: [
        {
          id: "dao-tao-tap-huan-camau",
          title: "Video hướng dẫn sử dụng iLIS",
          start: null,
          isLocal: true,
          src: getVideoSrc(),
          duration: "45:45",
          badge: "Chính thức",
          subtitle: "Khóa đào tạo và tập huấn vận hành hệ thống thông tin đất đai iLIS dành cho cán bộ, chuyên viên tỉnh Cà Mau",
        },
      ],
    };
    return [officialGroup, ...content.videos.groups];
  }, []);

  const flat = useMemo<FlatVideo[]>(
    () =>
      groups.flatMap((group, gi) =>
        group.items.map((item, ii) => ({
          ...item,
          key: gi === 0 ? OFFICIAL_VIDEO_KEY : `${gi}-${ii}-${item.id}`,
          group: group.title,
        })),
      ),
    [groups],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(OFFICIAL_VIDEO_KEY);
  const [playing, setPlaying] = useState(false);
  const selected = flat.find((video) => video.key === selectedKey) ?? flat[0];

  // Tìm kiếm toàn trang (global-search) yêu cầu chọn một video qua sự kiện DOM
  useEffect(() => {
    function onPlay(event: Event) {
      const videoId = (event as CustomEvent<string>).detail;
      const target = flat.find((video) => video.id === videoId);
      if (target) {
        setSelectedKey(target.key);
        setPlaying(true);
      }
    }
    window.addEventListener("portal:play-video", onPlay);
    return () => window.removeEventListener("portal:play-video", onPlay);
  }, [flat]);

  function choose(video: FlatVideo) {
    setSelectedKey(video.key);
    setPlaying(true);
  }

  function jumpToChapter(seconds: number) {
    if (!selected || !selected.isLocal) {
      setSelectedKey(OFFICIAL_VIDEO_KEY);
      setPlaying(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = seconds;
          videoRef.current.play().catch(() => {});
        }
      }, 200);
      return;
    }
    setPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch(() => {});
      }
    }, 60);
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#tap-huan-su-dung`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!selected) return null;

  return (
    <SectionShell
      id="tap-huan-su-dung"
      title="Tập huấn sử dụng"
      description="Video hướng dẫn sử dụng iLIS và các bài giảng đào tạo thao tác nghiệp vụ đất đai"
      icon={GraduationCap}
      tone="teal"
      badge={`${flat.length} video · Khóa đào tạo`}
    >
      {/* Neo tương thích ngược với liên kết cũ #huong-dan */}
      <span id="huong-dan" className={styles.anchorOffset} aria-hidden="true" />

      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={styles.player}>
            {selected.isLocal ? (
              playing ? (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className={styles.nativeVideo}
                  src={selected.src}
                >
                  Trình duyệt của bạn không hỗ trợ thẻ video HTML5.
                </video>
              ) : (
                <button
                  type="button"
                  className={cn(styles.facade, styles.localFacade)}
                  onClick={() => setPlaying(true)}
                  aria-label={`Phát video: ${selected.title}`}
                >
                  <div className={styles.localPoster}>
                    <div className={styles.posterOverlay} />
                    <div className={styles.posterContent}>
                      <span className={styles.posterTag}>
                        <GraduationCap size={15} /> KHÓA ĐÀO TẠO TẬP HUẤN CHÍNH THỨC
                      </span>
                      <strong className={styles.posterTitle}>Video hướng dẫn sử dụng iLIS</strong>
                      <p className={styles.posterDesc}>VNPT Cà Mau · Hệ thống thông tin đất đai · Thời lượng 45:45</p>
                    </div>
                    <span className={styles.playBtn} aria-hidden="true">
                      <Play size={34} fill="currentColor" />
                    </span>
                  </div>
                </button>
              )
            ) : playing ? (
              <iframe
                key={selected.key}
                src={embedUrl(selected)}
                title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                className={styles.facade}
                onClick={() => setPlaying(true)}
                aria-label={`Phát video: ${selected.title}`}
              >
                <img src={thumb(selected.id)} alt="" loading="lazy" />
                <span className={styles.playBtn} aria-hidden="true">
                  <Play size={34} fill="currentColor" />
                </span>
              </button>
            )}
          </div>

          <div className={styles.now}>
            <div className={styles.nowMeta}>
              <span className={styles.nowGroup}>{selected.group}</span>
              {selected.badge && (
                <span className={styles.officialBadge}>
                  <Sparkles size={12} /> {selected.badge}
                </span>
              )}
              {selected.duration && (
                <span className={styles.durationBadge}>
                  <Clock size={12} /> {selected.duration}
                </span>
              )}
            </div>

            <h3>{selected.title}</h3>
            {selected.subtitle && <p className={styles.nowSubtitle}>{selected.subtitle}</p>}

            <div className={styles.actionRow}>
              {selected.isLocal ? (
                <>
                  <a
                    href={selected.src}
                    download="Video_Huong_Dan_Su_Dung_iLIS_CaMau.mp4"
                    className={styles.downloadBtn}
                    title="Tải video bài giảng về máy tính (241 MB MP4)"
                  >
                    <Download size={15} aria-hidden="true" />
                    Tải video (MP4 · 241 MB)
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowChapters((prev) => !prev)}
                    className={cn(styles.chapterToggleBtn, showChapters && styles.chapterToggleBtnActive)}
                  >
                    <ListOrdered size={15} aria-hidden="true" />
                    {showChapters ? "Ẩn mục lục bài học" : "Xem mục lục bài học (6 phần)"}
                  </button>
                  <button type="button" onClick={copyLink} className={styles.copyBtn}>
                    {copied ? <CheckCircle2 size={15} color="var(--tone-green-fg, #15803d)" /> : <Share2 size={15} />}
                    {copied ? "Đã chép link!" : "Chia sẻ"}
                  </button>
                </>
              ) : (
                <a href={watchUrl(selected)} target="_blank" rel="noopener noreferrer" className={styles.yt}>
                  <ExternalLink size={15} aria-hidden="true" />
                  Mở trên YouTube
                </a>
              )}
            </div>

            {selected.isLocal && showChapters && (
              <div className={styles.chaptersCard}>
                <h4 className={styles.chaptersTitle}>
                  <ListOrdered size={16} /> Mục lục các chuyên đề trong video bài giảng:
                </h4>
                <div className={styles.chaptersGrid}>
                  {TRAINING_CHAPTERS.map((ch, idx) => (
                    <button
                      key={ch.timestamp}
                      type="button"
                      className={styles.chapterItem}
                      onClick={() => jumpToChapter(ch.timeSeconds)}
                      title={`Nhảy tới phút ${ch.timestamp}`}
                    >
                      <span className={styles.chapterIndex}>#{idx + 1}</span>
                      <span className={styles.chapterTime}>{ch.timestamp}</span>
                      <span className={styles.chapterLabel}>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.listWrap}>
          <div className={styles.scroll}>
            {groups.map((group, gi) => (
              <div key={group.title} className={styles.group}>
                <h4 className={styles.groupTitle}>
                  {group.title}
                  <span>{group.items.length}</span>
                </h4>
                <ul className={styles.list}>
                  {group.items.map((item, ii) => {
                    const key = gi === 0 ? OFFICIAL_VIDEO_KEY : `${gi}-${ii}-${item.id}`;
                    const active = key === selected.key;
                    const isLocal = "isLocal" in item && Boolean(item.isLocal);
                    const duration = "duration" in item ? String(item.duration) : null;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className={cn(styles.item, active && styles.itemActive)}
                          aria-current={active || undefined}
                          onClick={() =>
                            choose({
                              ...item,
                              key,
                              group: group.title,
                              isLocal,
                              src: "src" in item ? String(item.src) : undefined,
                              duration: duration ?? undefined,
                              badge: "badge" in item ? String(item.badge) : undefined,
                              subtitle: "subtitle" in item ? String(item.subtitle) : undefined,
                            })
                          }
                        >
                          <span className={cn(styles.thumb, isLocal && styles.localThumb)} aria-hidden="true">
                            {isLocal ? (
                              <div className={styles.localThumbInner}>
                                <GraduationCap size={22} />
                                <span className={styles.localThumbBadge}>45:45</span>
                              </div>
                            ) : (
                              <>
                                <img src={thumb(item.id)} alt="" loading="lazy" />
                                <PlayCircle size={22} />
                              </>
                            )}
                          </span>
                          <span className={styles.itemTitle}>{item.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

