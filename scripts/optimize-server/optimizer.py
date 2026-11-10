import base64
import io
import math
import re
from typing import Tuple, Dict, Any

import pymupdf as fitz  # PyMuPDF
from PIL import Image, ImageOps


def compute_target_bytes(target_mb: float) -> int:
    """
    Calculate safe ceiling byte size strictly under target_mb (98% of binary MiB).
    For target_mb = 15.0, ceiling is ~14.70 MiB (15,414,067 bytes), while the
    optimizer aims for the 13.2 - 14.7 MiB sweet spot (88% - 98% of target_mb).
    """
    valid_mb = target_mb if target_mb > 0.05 else 15.0
    return max(1024, int(valid_mb * 1024 * 1024 * 0.98))


def _replace_image_inplace(
    doc: fitz.Document,
    xref: int,
    new_jpg: bytes,
    nw: int,
    nh: int,
    mode: str,
) -> None:
    """Update an image XObject stream in-place without creating duplicate xrefs or losing page annotations/signatures."""
    cs = "/DeviceGray" if mode == "L" else "/DeviceRGB"
    doc.update_stream(xref, new_jpg, compress=False)
    doc.xref_set_key(xref, "Filter", "/DCTDecode")
    doc.xref_set_key(xref, "DecodeParms", "null")
    doc.xref_set_key(xref, "ColorSpace", cs)
    doc.xref_set_key(xref, "BitsPerComponent", "8")
    doc.xref_set_key(xref, "Width", str(nw))
    doc.xref_set_key(xref, "Height", str(nh))


def _compress_pdf_embedded_image(
    pil_img: Image.Image,
    target_b: int,
    max_b: int,
    orig_b: int,
    steps: int = 5,
) -> Tuple[bytes, int, int, str]:
    """
    Downscale image resolution and binary-search JPEG quality so the output stream
    lands as close as possible to target_b while staying <= max_b.
    """
    if pil_img.mode not in ("RGB", "L"):
        pil_img = pil_img.convert("RGB")
    w, h = pil_img.size
    ratio = min(0.96, target_b / max(1, orig_b))

    # Always reduce resolution slightly (<= 0.95) and scale proportionally to target ratio
    init_scale = min(0.95, max(0.32, math.sqrt(ratio) * 0.98))
    scales = [
        init_scale,
        min(0.97, init_scale * 1.08),
        init_scale * 0.82,
        init_scale * 0.65,
        init_scale * 0.48,
    ]
    unique_scales = []
    for s in scales:
        s_clamped = round(max(0.20, min(0.97, s)), 3)
        if s_clamped not in unique_scales:
            unique_scales.append(s_clamped)

    best_res: Tuple[bytes, int, int, str] | None = None
    best_diff = float("inf")
    best_under: Tuple[bytes, int, int, str] | None = None

    for sc in unique_scales:
        nw, nh = max(64, int(w * sc)), max(64, int(h * sc))
        resized = (
            pil_img.resize((nw, nh), Image.Resampling.BILINEAR)
            if sc < 0.999
            else pil_img
        )
        lo, hi = 30, 96
        for step_idx in range(steps):
            mid = 95 if step_idx == 0 and ratio > 0.75 else (lo + hi) // 2
            buf = io.BytesIO()
            sub = 0 if mid >= 86 else -1
            resized.save(buf, format="JPEG", quality=mid, subsampling=sub)
            data = buf.getvalue()
            sz = len(data)
            item = (data, nw, nh, resized.mode)

            if sz <= max_b:
                if best_under is None or abs(sz - target_b) < abs(len(best_under[0]) - target_b):
                    best_under = item
            diff = abs(sz - target_b)
            if diff < best_diff:
                best_diff = diff
                best_res = item

            if sz > target_b:
                hi = mid - 1
            else:
                lo = mid + 1

            if best_under is not None and target_b * 0.95 <= len(best_under[0]) <= max_b:
                return best_under

        if best_under is not None and len(best_under[0]) >= target_b * 0.88:
            return best_under

    return best_under or best_res or (b"", w, h, pil_img.mode)


def _run_inplace_pdf_pass(
    input_bytes: bytes,
    desired_total: int,
    max_total: int,
    force_all_images: bool = False,
) -> Tuple[bytes, str] | None:
    """Run a single pass of in-place XObject resolution/quality optimization."""
    orig_size = len(input_bytes)
    doc = fitz.open(stream=input_bytes, filetype="pdf")
    xref_raw_len: Dict[int, int] = {}
    for page in doc:
        for im in page.get_images(full=True):
            xref, smask = im[0], im[1]
            if smask > 0 or xref in xref_raw_len:
                continue
            try:
                raw_len = len(doc.xref_stream_raw(xref))
            except Exception:
                continue
            if raw_len >= 24_576:
                xref_raw_len[xref] = raw_len

    if not xref_raw_len:
        doc.close()
        return None

    sorted_items = sorted(xref_raw_len.items(), key=lambda x: x[1], reverse=True)
    total_img_bytes = sum(xref_raw_len.values())
    non_img_overhead = max(0, orig_size - total_img_bytes)
    bytes_to_shed = max(1024, orig_size - desired_total)

    selected = []
    sel_orig_sum = 0
    for xref, ob in sorted_items:
        selected.append((xref, ob))
        sel_orig_sum += ob
        if (
            not force_all_images
            and len(selected) >= 8
            and sel_orig_sum >= bytes_to_shed * 2.5
        ):
            break

    unselected_sum = total_img_bytes - sel_orig_sum
    rem_target = max(1024, desired_total - non_img_overhead - unselected_sum)
    rem_max = max(1024, max_total - non_img_overhead - unselected_sum)
    rem_orig = sel_orig_sum
    steps = 5 if len(selected) <= 12 else 3

    for xref, orig_b in selected:
        share = orig_b / max(1, rem_orig)
        t_b = int(rem_target * share)
        m_b = int(rem_max * share)
        try:
            pix = fitz.Pixmap(doc, xref)
            if pix.n - pix.alpha > 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            elif pix.alpha:
                pix = fitz.Pixmap(pix, 0)
            mode = "L" if pix.n == 1 else "RGB"
            pil_im = Image.frombytes(mode, (pix.width, pix.height), pix.samples)
            new_jpg, nw, nh, m_out = _compress_pdf_embedded_image(
                pil_im, t_b, m_b, orig_b, steps=steps
            )
            if 0 < len(new_jpg) < orig_b:
                _replace_image_inplace(doc, xref, new_jpg, nw, nh, m_out)
                actual_b = len(new_jpg)
            else:
                actual_b = orig_b
        except Exception:
            actual_b = orig_b

        rem_target = max(1024, rem_target - actual_b)
        rem_max = max(1024, rem_max - actual_b)
        rem_orig = max(1, rem_orig - orig_b)

    out = doc.tobytes(garbage=3, deflate=False)
    if len(out) > max_total:
        out_deflate = doc.tobytes(garbage=4, deflate=True, clean=True)
        if len(out_deflate) < len(out):
            out = out_deflate
    doc.close()
    return out, f"smart_inplace_jpeg({len(selected)}/{len(sorted_items)}_imgs)"


def optimize_pdf(input_bytes: bytes, target_bytes: int) -> Tuple[bytes, Dict[str, Any]]:
    """
    Optimize a PDF file to land in the 88% - 98% band of target_mb (e.g. 13.2 - 14.7 MB for 15 MB)
    while preserving all pages, text, stamps, and visual signature appearances.
    """
    orig_size = len(input_bytes)
    if orig_size <= target_bytes:
        return input_bytes, {
            "method": "original",
            "original_size": orig_size,
            "optimized_size": orig_size,
        }

    desired_bytes = int(target_bytes * 0.955)
    best_bytes = input_bytes
    best_method = "original"

    try:
        res = _run_inplace_pdf_pass(
            input_bytes,
            desired_total=desired_bytes,
            max_total=target_bytes,
            force_all_images=False,
        )
        if res is not None:
            cand_bytes, cand_method = res
            if 0 < len(cand_bytes) < len(best_bytes):
                best_bytes = cand_bytes
                best_method = cand_method
            if len(best_bytes) <= target_bytes:
                return best_bytes, {
                    "method": best_method,
                    "original_size": orig_size,
                    "optimized_size": len(best_bytes),
                }

        res2 = _run_inplace_pdf_pass(
            input_bytes,
            desired_total=int(target_bytes * 0.90),
            max_total=int(target_bytes * 0.96),
            force_all_images=True,
        )
        if res2 is not None:
            cand_bytes2, cand_method2 = res2
            if 0 < len(cand_bytes2) < len(best_bytes):
                best_bytes = cand_bytes2
                best_method = cand_method2
            if len(best_bytes) <= target_bytes:
                return best_bytes, {
                    "method": best_method,
                    "original_size": orig_size,
                    "optimized_size": len(best_bytes),
                }
    except Exception:
        pass

    try:
        src_doc = fitz.open(stream=input_bytes, filetype="pdf")
        page_count = max(1, len(src_doc))
        rem_target = int(desired_bytes * 0.97)
        rem_max = int(target_bytes * 0.98)

        out_doc = fitz.open()
        for idx, page in enumerate(src_doc):
            pages_left = max(1, page_count - idx)
            p_target = max(4096, int(rem_target / pages_left))
            p_max = max(4096, int(rem_max / pages_left))
            rect = page.rect
            page_jpeg = _render_page_within_budget(page, p_target, p_max)
            new_page = out_doc.new_page(width=rect.width, height=rect.height)
            new_page.insert_image(rect, stream=page_jpeg)
            rem_target = max(4096, rem_target - len(page_jpeg))
            rem_max = max(4096, rem_max - len(page_jpeg))

        raster_bytes = out_doc.tobytes(garbage=3, deflate=False)
        out_doc.close()
        src_doc.close()

        if 0 < len(raster_bytes) < len(best_bytes):
            best_bytes = raster_bytes
            best_method = "adaptive_page_raster"
    except Exception:
        pass

    return best_bytes, {
        "method": best_method,
        "original_size": orig_size,
        "optimized_size": len(best_bytes),
    }


def _render_page_within_budget(page: fitz.Page, target_bytes: int, max_bytes: int) -> bytes:
    """Render a single PDF page to JPEG bytes aiming for target_bytes and strictly <= max_bytes."""
    if target_bytes >= 1_500_000:
        dpi_candidates = [240, 200, 160, 130, 100]
    elif target_bytes >= 600_000:
        dpi_candidates = [180, 150, 125, 100, 80]
    elif target_bytes >= 250_000:
        dpi_candidates = [140, 115, 95, 75]
    else:
        dpi_candidates = [110, 90, 72, 55]

    best_under = b""
    best_any = b""
    for dpi in dpi_candidates:
        pix = page.get_pixmap(dpi=max(48, dpi), alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        lo, hi = 30, 95
        for _ in range(5):
            mid = (lo + hi) // 2
            buf = io.BytesIO()
            sub = 0 if mid >= 86 else -1
            img.save(buf, format="JPEG", quality=mid, subsampling=sub)
            data = buf.getvalue()
            if not best_any or abs(len(data) - target_bytes) < abs(len(best_any) - target_bytes):
                best_any = data
            if len(data) <= max_bytes:
                if not best_under or abs(len(data) - target_bytes) < abs(len(best_under) - target_bytes):
                    best_under = data
            if len(data) > target_bytes:
                hi = mid - 1
            else:
                lo = mid + 1
        if best_under and len(best_under) >= target_bytes * 0.85:
            return best_under

    return best_under or best_any


def optimize_svg(input_bytes: bytes, target_bytes: int) -> Tuple[bytes, Dict[str, Any]]:
    """
    Optimize SVG file to land in 88% - 98% of target_bytes while preserving vector/embedded content.
    """
    orig_size = len(input_bytes)
    if orig_size <= target_bytes:
        return input_bytes, {
            "method": "original",
            "original_size": orig_size,
            "optimized_size": orig_size,
        }

    desired_bytes = int(target_bytes * 0.95)
    try:
        text = input_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return input_bytes, {"method": "unmodified", "original_size": orig_size, "optimized_size": orig_size}

    data_uri_pattern = re.compile(
        r"(data:image/(?:png|jpeg|jpg|webp|bmp|gif|tiff|tif);base64,)([A-Za-z0-9+/=\s]+)",
        flags=re.IGNORECASE,
    )
    matches = list(data_uri_pattern.finditer(text))
    if matches:
        total_match_chars = sum(len(m.group(0)) for m in matches)
        non_img_bytes = max(0, len(text.encode("utf-8")) - total_match_chars)
        avail_b64_bytes = max(8192, desired_bytes - non_img_bytes)
        per_img_budget = max(4096, int((avail_b64_bytes * 0.74) / len(matches)))

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

    out_bytes = text.encode("utf-8")
    if len(out_bytes) > target_bytes:
        text = re.sub(r"<!--[\s\S]*?-->", "", text)
        text = re.sub(r"<metadata[\s\S]*?</metadata>", "", text, flags=re.IGNORECASE)
        text = re.sub(r"<sodipodi:namedview[\s\S]*?(?:/>|</sodipodi:namedview>)", "", text, flags=re.IGNORECASE)
        text = re.sub(r">\s+<", "><", text)
        text = re.sub(r"\s{2,}", " ", text).strip()
        out_bytes = text.encode("utf-8")

    if len(out_bytes) <= target_bytes:
        return out_bytes, {
            "method": "svg_minify_and_embed_compress",
            "original_size": orig_size,
            "optimized_size": len(out_bytes),
        }

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

    return out_bytes, {
        "method": "svg_precision_optimize",
        "original_size": orig_size,
        "optimized_size": len(out_bytes),
    }


def optimize_image(input_bytes: bytes, ext: str, target_bytes: int) -> Tuple[bytes, Dict[str, Any]]:
    """
    Optimize raster images (.jpg, .jpeg, .png, .webp, .bmp, .tiff, .tif, .gif)
    to land in 88% - 98% of target_bytes while preserving file format and high visual fidelity.
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

    best_bytes, method = _compress_pil_image(img, ext, target_bytes, orig_size=orig_size)
    if len(best_bytes) >= orig_size and orig_size <= target_bytes:
        return input_bytes, {"method": "original", "original_size": orig_size, "optimized_size": orig_size}

    return best_bytes, {
        "method": method,
        "original_size": orig_size,
        "optimized_size": len(best_bytes),
    }


def _compress_pil_image(
    img: Image.Image,
    ext: str,
    target_bytes: int,
    orig_size: int = 0,
) -> Tuple[bytes, str]:
    """Internal helper to compress a PIL Image near desired_bytes (<= target_bytes) matching extension."""
    desired_bytes = int(target_bytes * 0.95)
    best_under = b""
    best_under_method = "image_optimize"
    best_any = b""
    best_any_method = "image_optimize"

    def _record(data: bytes, label: str) -> bool:
        nonlocal best_under, best_under_method, best_any, best_any_method
        if not best_any or abs(len(data) - desired_bytes) < abs(len(best_any) - desired_bytes):
            best_any = data
            best_any_method = label
        if len(data) <= target_bytes:
            if not best_under or abs(len(data) - desired_bytes) < abs(len(best_under) - desired_bytes):
                best_under = data
                best_under_method = label
            return len(data) >= desired_bytes * 0.88
        return False

    w, h = img.size
    ratio = desired_bytes / max(1, orig_size) if orig_size > target_bytes else 0.85
    init_scale = min(0.95, max(0.35, math.sqrt(ratio) * 0.98))

    if ext in (".jpg", ".jpeg", ".webp"):
        fmt = "WEBP" if ext == ".webp" else "JPEG"
        work_img = img if (fmt == "WEBP" or img.mode == "RGB") else img.convert("RGB")
        scales = [init_scale, min(0.98, init_scale * 1.08), init_scale * 0.80, init_scale * 0.60, 0.40]
        for sc in scales:
            nw, nh = max(64, int(w * sc)), max(64, int(h * sc))
            resized = work_img.resize((nw, nh), Image.Resampling.BILINEAR) if sc < 0.999 else work_img
            lo, hi = 30, 96
            for _ in range(5):
                mid = (lo + hi) // 2
                buf = io.BytesIO()
                if fmt == "JPEG":
                    sub = 0 if mid >= 86 else -1
                    resized.save(buf, format=fmt, quality=mid, subsampling=sub)
                else:
                    resized.save(buf, format=fmt, quality=mid)
                data = buf.getvalue()
                label = f"{fmt.lower()}_scale({int(sc*100)}%)_q{mid}"
                if _record(data, label):
                    return best_under, best_under_method
                if len(data) > desired_bytes:
                    hi = mid - 1
                else:
                    lo = mid + 1
            if best_under and len(best_under) >= desired_bytes * 0.85:
                return best_under, best_under_method
        return (best_under or best_any), (best_under_method if best_under else best_any_method)

    elif ext in (".tif", ".tiff"):
        work_img = img.convert("RGB") if img.mode not in ("RGB", "L") else img
        scales = [init_scale, init_scale * 0.80, init_scale * 0.60, 0.40]
        for sc in scales:
            nw, nh = max(64, int(w * sc)), max(64, int(h * sc))
            resized = work_img.resize((nw, nh), Image.Resampling.BILINEAR) if sc < 0.999 else work_img
            lo, hi = 30, 95
            for _ in range(5):
                mid = (lo + hi) // 2
                buf = io.BytesIO()
                try:
                    resized.save(buf, format="TIFF", compression="jpeg", quality=mid)
                except Exception:
                    resized.save(buf, format="TIFF", compression="tiff_lzw")
                data = buf.getvalue()
                if _record(data, f"tiff_scale({int(sc*100)}%)_q{mid}"):
                    return best_under, best_under_method
                if len(data) > desired_bytes:
                    hi = mid - 1
                else:
                    lo = mid + 1
            if best_under and len(best_under) >= desired_bytes * 0.85:
                return best_under, best_under_method
        return (best_under or best_any), (best_under_method if best_under else best_any_method)

    elif ext == ".png":
        scale = init_scale
        for _ in range(7):
            nw, nh = max(64, int(w * scale)), max(64, int(h * scale))
            resized = img.resize((nw, nh), Image.Resampling.BILINEAR)
            buf = io.BytesIO()
            resized.save(buf, format="PNG", compress_level=6)
            data = buf.getvalue()
            if _record(data, f"png_scale({int(scale*100)}%)"):
                return best_under, best_under_method
            if len(data) > desired_bytes:
                scale *= max(0.65, math.sqrt(desired_bytes / max(1, len(data))) * 0.97)
            else:
                if best_under and len(best_under) >= desired_bytes * 0.82:
                    return best_under, best_under_method
                scale = min(0.98, scale * 1.08)
        return (best_under or best_any), (best_under_method if best_under else best_any_method)

    else:
        fmt = "GIF" if ext == ".gif" else "BMP"
        scale = init_scale
        for _ in range(7):
            nw, nh = max(32, int(w * scale)), max(32, int(h * scale))
            resized = img.resize((nw, nh), Image.Resampling.BILINEAR)
            buf = io.BytesIO()
            resized.save(buf, format=fmt)
            data = buf.getvalue()
            if _record(data, f"{fmt.lower()}_scale({int(scale*100)}%)"):
                return best_under, best_under_method
            scale *= max(0.65, math.sqrt(desired_bytes / max(1, len(data))) * 0.97)
        return (best_under or best_any), (best_under_method if best_under else best_any_method)


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
    """Main entry point to optimize any supported file to land in 88%-98% of target_mb."""
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
