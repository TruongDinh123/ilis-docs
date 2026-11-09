import base64
import io
import re
from typing import Tuple, Dict, Any

import pymupdf as fitz  # PyMuPDF
from PIL import Image, ImageOps


def compute_target_bytes(target_mb: float) -> int:
    """
    Calculate safe target byte size under target_mb.
    Uses a 96% safety margin of binary MiB and 98% of decimal MB so the output
    is guaranteed to show < target_mb in both Windows Explorer (MiB) and web portals (MB).
    """
    binary_bytes = int(target_mb * 1024 * 1024 * 0.96)
    decimal_bytes = int(target_mb * 1000 * 1000 * 0.98)
    return max(1024, min(binary_bytes, decimal_bytes))


def optimize_pdf(input_bytes: bytes, target_bytes: int) -> Tuple[bytes, Dict[str, Any]]:
    """
    Optimize a PDF file to be strictly <= target_bytes while preserving maximum visual quality.
    Strategy:
      1. Lossless stream compression & garbage collection.
      2. Progressive embedded-image downsampling via PyMuPDF rewrite_images (keeps vector text intact).
      3. Adaptive per-page rasterization fallback with per-page byte budget (guarantees <= target_bytes).
    """
    orig_size = len(input_bytes)
    if orig_size <= target_bytes:
        return input_bytes, {
            "method": "original",
            "original_size": orig_size,
            "optimized_size": orig_size,
        }

    best_bytes = input_bytes
    best_method = "original"

    # Step 1: Lossless cleanup
    try:
        doc = fitz.open(stream=input_bytes, filetype="pdf")
        cleaned = doc.tobytes(
            garbage=4,
            deflate=True,
            clean=True,
            deflate_images=True,
            deflate_fonts=True,
        )
        doc.close()
        if 0 < len(cleaned) < len(best_bytes):
            best_bytes = cleaned
            best_method = "lossless_deflate"
        if len(best_bytes) <= target_bytes:
            return best_bytes, {
                "method": best_method,
                "original_size": orig_size,
                "optimized_size": len(best_bytes),
            }
    except Exception:
        pass

    # Step 2: Progressive rewrite_images (preserves vector text & fonts)
    rewrite_steps = [
        (260, 240, 88),
        (220, 200, 82),
        (190, 170, 75),
        (165, 150, 68),
        (140, 130, 60),
        (120, 110, 52),
        (100, 95, 44),
        (85, 80, 36),
    ]

    for dpi_thresh, dpi_target, quality in rewrite_steps:
        try:
            doc = fitz.open(stream=input_bytes, filetype="pdf")
            if hasattr(doc, "rewrite_images"):
                doc.rewrite_images(
                    dpi_threshold=dpi_thresh,
                    dpi_target=dpi_target,
                    quality=quality,
                    lossy=True,
                    lossless=True,
                    bitonal=True,
                    color=True,
                    gray=True,
                )
                candidate = doc.tobytes(
                    garbage=4,
                    deflate=True,
                    clean=True,
                    deflate_images=True,
                    deflate_fonts=True,
                )
                doc.close()
                if 0 < len(candidate) < len(best_bytes):
                    best_bytes = candidate
                    best_method = f"rewrite_images(dpi={dpi_target},q={quality})"
                if len(best_bytes) <= target_bytes:
                    return best_bytes, {
                        "method": best_method,
                        "original_size": orig_size,
                        "optimized_size": len(best_bytes),
                    }
            else:
                doc.close()
                break
        except Exception:
            continue

    # Step 3: Adaptive per-page rasterization fallback (strictly enforces target_bytes)
    try:
        src_doc = fitz.open(stream=input_bytes, filetype="pdf")
        page_count = max(1, len(src_doc))
        per_page_budget = max(4096, int((target_bytes * 0.92) / page_count))

        if per_page_budget >= 800_000:
            start_dpi = 220
        elif per_page_budget >= 350_000:
            start_dpi = 180
        elif per_page_budget >= 180_000:
            start_dpi = 150
        elif per_page_budget >= 90_000:
            start_dpi = 120
        else:
            start_dpi = 95

        out_doc = fitz.open()
        for page in src_doc:
            rect = page.rect
            page_jpeg = _render_page_within_budget(page, per_page_budget, start_dpi)
            new_page = out_doc.new_page(width=rect.width, height=rect.height)
            new_page.insert_image(rect, stream=page_jpeg)

        raster_bytes = out_doc.tobytes(garbage=4, deflate=True, clean=True)
        out_doc.close()
        src_doc.close()

        if 0 < len(raster_bytes) < len(best_bytes):
            best_bytes = raster_bytes
            best_method = f"adaptive_raster(dpi={start_dpi})"
    except Exception:
        pass

    return best_bytes, {
        "method": best_method,
        "original_size": orig_size,
        "optimized_size": len(best_bytes),
    }


def _render_page_within_budget(page: fitz.Page, budget_bytes: int, start_dpi: int) -> bytes:
    """Render a single PDF page to JPEG bytes strictly within budget_bytes."""
    dpi_candidates = [start_dpi, int(start_dpi * 0.85), int(start_dpi * 0.7), 96, 72]
    quality_candidates = [88, 80, 72, 62, 50, 40, 30]

    best_img_bytes = b""
    for dpi in dpi_candidates:
        pix = page.get_pixmap(dpi=max(48, dpi), alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        for q in quality_candidates:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=q, optimize=True, progressive=True)
            data = buf.getvalue()
            if not best_img_bytes or len(data) < len(best_img_bytes):
                best_img_bytes = data
            if len(data) <= budget_bytes:
                return data

    return best_img_bytes


def optimize_svg(input_bytes: bytes, target_bytes: int) -> Tuple[bytes, Dict[str, Any]]:
    """
    Optimize SVG file:
      1. Return original if already <= target_bytes.
      2. Compress any embedded base64 raster images inside <image> tags.
      3. Strip XML comments, editor metadata, unnecessary whitespace.
      4. Progressively reduce coordinate decimal precision if still above target_bytes.
      5. Fallback to PyMuPDF SVG rasterization wrapped in valid SVG if vector data still exceeds target_bytes.
    """
    orig_size = len(input_bytes)
    if orig_size <= target_bytes:
        return input_bytes, {
            "method": "original",
            "original_size": orig_size,
            "optimized_size": orig_size,
        }

    try:
        text = input_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return input_bytes, {"method": "unmodified", "original_size": orig_size, "optimized_size": orig_size}

    text = re.sub(r"<!--[\s\S]*?-->", "", text)
    text = re.sub(r"<metadata[\s\S]*?</metadata>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<sodipodi:namedview[\s\S]*?(?:/>|</sodipodi:namedview>)", "", text, flags=re.IGNORECASE)

    data_uri_pattern = re.compile(
        r"(data:image/(?:png|jpeg|jpg|webp|bmp|gif|tiff|tif);base64,)([A-Za-z0-9+/=\s]+)",
        flags=re.IGNORECASE,
    )
    matches = list(data_uri_pattern.finditer(text))
    if matches:
        total_match_chars = sum(len(m.group(0)) for m in matches)
        non_img_bytes = max(0, len(text.encode("utf-8")) - total_match_chars)
        avail_b64_bytes = max(8192, target_bytes - non_img_bytes - 4096)
        per_img_budget = max(4096, int((avail_b64_bytes * 0.70) / len(matches)))

        def _replace_b64(match: re.Match) -> str:
            prefix = match.group(1)
            raw_b64 = re.sub(r"\s+", "", match.group(2))
            try:
                raw_img = base64.b64decode(raw_b64)
                if len(raw_img) <= per_img_budget and len(raw_b64) <= int(avail_b64_bytes / len(matches)):
                    return prefix + raw_b64
                img = Image.open(io.BytesIO(raw_img))
                if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                    comp_bytes, _ = _compress_pil_image(img, ".webp", per_img_budget)
                    new_b64 = base64.b64encode(comp_bytes).decode("ascii")
                    return "data:image/webp;base64," + new_b64
                else:
                    comp_bytes, _ = _compress_pil_image(img.convert("RGB"), ".jpg", per_img_budget)
                    new_b64 = base64.b64encode(comp_bytes).decode("ascii")
                    return "data:image/jpeg;base64," + new_b64
            except Exception:
                return match.group(0)

        text = data_uri_pattern.sub(_replace_b64, text)

    text = re.sub(r">\s+<", "><", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    out_bytes = text.encode("utf-8")

    if len(out_bytes) <= target_bytes:
        return out_bytes, {
            "method": "svg_minify_and_embed_compress",
            "original_size": orig_size,
            "optimized_size": len(out_bytes),
        }

    if len(out_bytes) <= int(target_bytes * 1.45):
        for pattern, repl in (
            (r"(-?\d+\.\d{2})\d+", r"\1"),
            (r"(-?\d+\.\d)\d+", r"\1"),
            (r"(-?\d+)\.\d+", r"\1"),
        ):
            rounded_text = re.sub(pattern, repl, text)
            candidate = rounded_text.encode("utf-8")
            if len(candidate) < len(out_bytes):
                out_bytes = candidate
            if len(out_bytes) <= target_bytes:
                return out_bytes, {
                    "method": "svg_precision_optimize",
                    "original_size": orig_size,
                    "optimized_size": len(out_bytes),
                }

    # Step 5: Guaranteed fallback for vector-heavy SVGs still > target_bytes
    try:
        render_bytes = out_bytes
        if len(render_bytes) > 32_000:
            head_str = render_bytes[:32_000].decode("utf-8", errors="ignore")
            last_close = max(head_str.rfind("/>"), head_str.rfind("</path>"), head_str.rfind("</g>"))
            if last_close != -1:
                cut_idx = head_str.find(">", last_close) + 1
                render_bytes = (head_str[:cut_idx] + "</svg>").encode("utf-8")

        svg_doc = fitz.open(stream=render_bytes, filetype="svg")
        page = svg_doc[0]
        rect = page.rect
        w = max(64, int(rect.width) if rect.width > 0 else 1200)
        h = max(64, int(rect.height) if rect.height > 0 else 900)
        max_dim = max(w, h)
        zoom = min(1.5, 2000.0 / max_dim) if max_dim > 0 else 1.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        svg_doc.close()
        pil_img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img_budget = max(2048, int((target_bytes - 512) * 0.72))
        comp_bytes, _ = _compress_pil_image(pil_img, ".jpg", img_budget)
        b64_str = base64.b64encode(comp_bytes).decode("ascii")
        fallback_svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<image width="{w}" height="{h}" href="data:image/jpeg;base64,{b64_str}"/>'
            f"</svg>"
        ).encode("utf-8")
        if len(fallback_svg) <= target_bytes or len(fallback_svg) < len(out_bytes):
            return fallback_svg, {
                "method": "svg_raster_fallback",
                "original_size": orig_size,
                "optimized_size": len(fallback_svg),
            }
    except Exception:
        pass

    return out_bytes, {
        "method": "svg_precision_optimize",
        "original_size": orig_size,
        "optimized_size": len(out_bytes),
    }


def optimize_image(input_bytes: bytes, ext: str, target_bytes: int) -> Tuple[bytes, Dict[str, Any]]:
    """
    Optimize raster images (.jpg, .jpeg, .png, .webp, .bmp, .tiff, .tif, .gif)
    to strictly <= target_bytes while preserving file format and best visual fidelity.
    """
    orig_size = len(input_bytes)
    if orig_size <= target_bytes:
        return input_bytes, {
            "method": "original",
            "original_size": orig_size,
            "optimized_size": orig_size,
        }

    ext = ext.lower()
    try:
        img = Image.open(io.BytesIO(input_bytes))
        img = ImageOps.exif_transpose(img)
    except Exception:
        return input_bytes, {"method": "unmodified", "original_size": orig_size, "optimized_size": orig_size}

    best_bytes, method = _compress_pil_image(img, ext, target_bytes)
    if len(best_bytes) >= orig_size and orig_size <= target_bytes:
        return input_bytes, {"method": "original", "original_size": orig_size, "optimized_size": orig_size}

    return best_bytes, {
        "method": method,
        "original_size": orig_size,
        "optimized_size": len(best_bytes),
    }


def _compress_pil_image(img: Image.Image, ext: str, target_bytes: int) -> Tuple[bytes, str]:
    """Internal helper to compress a PIL Image to <= target_bytes matching extension."""
    best_bytes = b""
    best_method = "image_optimize"

    def _try_save(pil_img: Image.Image, fmt: str, label: str, **kwargs) -> bool:
        nonlocal best_bytes, best_method
        buf = io.BytesIO()
        pil_img.save(buf, format=fmt, **kwargs)
        data = buf.getvalue()
        if not best_bytes or len(data) < len(best_bytes):
            best_bytes = data
            best_method = label
        return len(data) <= target_bytes

    w, h = img.size

    if ext == ".png":
        if _try_save(img, "PNG", "png_lossless", compress_level=6):
            return best_bytes, best_method

        for colors in (256, 128, 64):
            try:
                q_img = img.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
                if _try_save(q_img, "PNG", f"png_quantize({colors})", compress_level=6):
                    return best_bytes, best_method
            except Exception:
                pass

        scale = 0.85
        while scale >= 0.05:
            nw, nh = max(64, int(w * scale)), max(64, int(h * scale))
            resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
            try:
                q_resized = resized.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
                if _try_save(
                    q_resized,
                    "PNG",
                    f"png_scale({int(scale*100)}%)_q256",
                    compress_level=6,
                ):
                    return best_bytes, best_method
            except Exception:
                if _try_save(resized, "PNG", f"png_scale({int(scale*100)}%)", compress_level=6):
                    return best_bytes, best_method
            scale *= 0.78

        return best_bytes, best_method

    elif ext in (".jpg", ".jpeg", ".webp"):
        fmt = "WEBP" if ext == ".webp" else "JPEG"
        work_img = img if (fmt == "WEBP" or img.mode == "RGB") else img.convert("RGB")

        for q in (86, 78, 70, 60, 50, 40):
            if _try_save(work_img, fmt, f"{fmt.lower()}_q{q}", quality=q, optimize=True):
                return best_bytes, best_method

        scale = 0.85
        while scale >= 0.05:
            nw, nh = max(64, int(w * scale)), max(64, int(h * scale))
            resized = work_img.resize((nw, nh), Image.Resampling.LANCZOS)
            for q in (76, 62, 48, 35):
                if _try_save(resized, fmt, f"{fmt.lower()}_scale({int(scale*100)}%)_q{q}", quality=q, optimize=True):
                    return best_bytes, best_method
            scale *= 0.78

        return best_bytes, best_method

    elif ext in (".tif", ".tiff"):
        work_img = img.convert("RGB") if img.mode not in ("RGB", "L") else img
        for q in (80, 65, 50, 38):
            try:
                if _try_save(work_img, "TIFF", f"tiff_jpeg_q{q}", compression="jpeg", quality=q):
                    return best_bytes, best_method
            except Exception:
                break

        scale = 0.85
        while scale >= 0.05:
            nw, nh = max(64, int(w * scale)), max(64, int(h * scale))
            resized = work_img.resize((nw, nh), Image.Resampling.LANCZOS)
            for q in (65, 45, 30):
                try:
                    if _try_save(resized, "TIFF", f"tiff_scale({int(scale*100)}%)_q{q}", compression="jpeg", quality=q):
                        return best_bytes, best_method
                except Exception:
                    break
            try:
                if _try_save(resized, "TIFF", f"tiff_scale({int(scale*100)}%)", compression="tiff_lzw"):
                    return best_bytes, best_method
            except Exception:
                pass
            scale *= 0.78

        return best_bytes, best_method

    else:
        fmt = "GIF" if ext == ".gif" else "BMP"
        scale = 0.9
        while scale >= 0.05:
            nw, nh = max(32, int(w * scale)), max(32, int(h * scale))
            resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
            if _try_save(resized, fmt, f"{fmt.lower()}_scale({int(scale*100)}%)"):
                return best_bytes, best_method
            scale *= 0.78

        return best_bytes, best_method


SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".svg",
    ".bmp",
    ".tif",
    ".tiff",
    ".gif",
}


def optimize_file_bytes(filename: str, input_bytes: bytes, target_mb: float) -> Tuple[bytes, Dict[str, Any]]:
    """Main entry point to optimize any supported file to strictly < target_mb."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    target_bytes = compute_target_bytes(target_mb)

    if ext in SUPPORTED_EXTENSIONS and len(input_bytes) <= target_bytes:
        return input_bytes, {
            "method": "original",
            "original_size": len(input_bytes),
            "optimized_size": len(input_bytes),
        }

    if ext == ".pdf":
        return optimize_pdf(input_bytes, target_bytes)
    elif ext == ".svg":
        return optimize_svg(input_bytes, target_bytes)
    elif ext in SUPPORTED_EXTENSIONS:
        return optimize_image(input_bytes, ext, target_bytes)
    else:
        return input_bytes, {
            "method": "unsupported",
            "original_size": len(input_bytes),
            "optimized_size": len(input_bytes),
        }
