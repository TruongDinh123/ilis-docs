import { content } from "../data/content";

/** Danh sách URL ảnh của một bộ ảnh minh hoạ (khoá dạng "/images/ten-thu-muc"). */
export function getGalleryImages(target: string): string[] {
  const stems = content.imageMap[target];
  if (!stems) return [];
  const base = content.origin || "";
  return stems.map((stem) => `${base}${target}/${stem}.png`);
}

export function hasGallery(target: string): boolean {
  return (content.imageMap[target]?.length ?? 0) > 0;
}
