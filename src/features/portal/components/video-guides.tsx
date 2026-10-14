import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Play, PlayCircle, Video } from "lucide-react";
import { cn } from "@/lib/cn";
import { content } from "../data/content";
import type { VideoItem } from "../types";
import { SectionShell } from "./section-shell";
import styles from "./video-guides.module.css";

interface FlatVideo extends VideoItem {
  key: string;
  group: string;
}

function embedUrl(video: VideoItem): string {
  const params = new URLSearchParams({ rel: "0", autoplay: "1", modestbranding: "1" });
  if (video.start) params.set("start", String(video.start));
  return `https://www.youtube-nocookie.com/embed/${video.id}?${params.toString()}`;
}

function watchUrl(video: VideoItem): string {
  const start = video.start ? `&t=${video.start}s` : "";
  return `https://www.youtube.com/watch?v=${video.id}${start}`;
}

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/**
 * Thư viện video hướng dẫn: khung phát (tải iframe YouTube khi bấm — nhẹ cho trang và không
 * đặt cookie trước khi người dùng chủ động xem) + danh sách theo nhóm.
 */
export function VideoGuides() {
  const { groups } = content.videos;
  const flat = useMemo<FlatVideo[]>(
    () => groups.flatMap((group, gi) => group.items.map((item, ii) => ({ ...item, key: `${gi}-${ii}-${item.id}`, group: group.title }))),
    [groups],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(flat[0]?.key ?? null);
  const [playing, setPlaying] = useState(false);
  const selected = flat.find((video) => video.key === selectedKey) ?? flat[0];

  // Tìm kiếm toàn trang (global-search) yêu cầu chọn một video qua sự kiện DOM — giữ hai khối tách biệt.
  useEffect(() => {
    function onPlay(event: Event) {
      const videoId = (event as CustomEvent<string>).detail;
      const target = flat.find((video) => video.id === videoId);
      if (target) {
        setSelectedKey(target.key);
        setPlaying(false);
      }
    }
    window.addEventListener("portal:play-video", onPlay);
    return () => window.removeEventListener("portal:play-video", onPlay);
  }, [flat]);

  function choose(video: FlatVideo) {
    setSelectedKey(video.key);
    setPlaying(true);
  }

  if (!selected) return null;

  return (
    <SectionShell
      id="huong-dan"
      title="Video hướng dẫn sử dụng iLIS"
      description="Phát trực tiếp tại trang, chọn video ở danh sách bên cạnh"
      icon={Video}
      tone="teal"
      badge={`${flat.length} video`}
    >
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={styles.player}>
            {playing ? (
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
              <button type="button" className={styles.facade} onClick={() => setPlaying(true)} aria-label={`Phát video: ${selected.title}`}>
                <img src={thumb(selected.id)} alt="" loading="lazy" />
                <span className={styles.playBtn} aria-hidden="true">
                  <Play size={34} fill="currentColor" />
                </span>
              </button>
            )}
          </div>
          <div className={styles.now}>
            <span className={styles.nowGroup}>{selected.group}</span>
            <h3>{selected.title}</h3>
            <a href={watchUrl(selected)} target="_blank" rel="noopener noreferrer" className={styles.yt}>
              <ExternalLink size={15} aria-hidden="true" />
              Mở trên YouTube
            </a>
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
                    const key = `${gi}-${ii}-${item.id}`;
                    const active = key === selected.key;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className={cn(styles.item, active && styles.itemActive)}
                          aria-current={active || undefined}
                          onClick={() => choose({ ...item, key, group: group.title })}
                        >
                          <span className={styles.thumb} aria-hidden="true">
                            <img src={thumb(item.id)} alt="" loading="lazy" />
                            <PlayCircle size={22} />
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
