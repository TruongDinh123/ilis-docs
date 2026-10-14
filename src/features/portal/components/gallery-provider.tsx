import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getGalleryImages } from "../lib/gallery";
import { ImageLightbox } from "./image-lightbox";

interface GalleryState {
  images: string[];
  title: string;
}

interface GalleryApi {
  /** Mở bộ ảnh theo khoá thư mục (vd "/images/thay-doi-dns-google"). Trả về false nếu không có ảnh. */
  open: (target: string, title?: string) => boolean;
}

const GalleryContext = createContext<GalleryApi | null>(null);

/**
 * Provider trình xem ảnh dùng chung toàn trang: mọi nút "Xem ảnh hướng dẫn" (kể cả trong HTML
 * nhân bản) gọi `useGallery().open(...)` thay vì mỗi nơi tự dựng một lightbox (Dependency Inversion).
 */
export function GalleryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GalleryState | null>(null);

  const open = useCallback((target: string, title = "Ảnh hướng dẫn") => {
    const images = getGalleryImages(target);
    if (images.length === 0) return false;
    setState({ images, title });
    return true;
  }, []);

  const api = useMemo<GalleryApi>(() => ({ open }), [open]);

  return (
    <GalleryContext.Provider value={api}>
      {children}
      {state && <ImageLightbox images={state.images} title={state.title} onClose={() => setState(null)} />}
    </GalleryContext.Provider>
  );
}

export function useGallery(): GalleryApi {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery phải được dùng bên trong <GalleryProvider>");
  return ctx;
}
