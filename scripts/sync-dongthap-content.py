#!/usr/bin/env python3
"""
Trích xuất nội dung từ trang ilis-docs.vnptdongthap.com.vn (page source) thành JSON có cấu trúc
cho portal React. Chỉ dùng thư viện chuẩn của Python.

Cách dùng:
    python scripts/sync-dongthap-content.py <duong-dan-page-source.html> [<duong-dan-output.json>]

Mặc định output: src/features/portal/data/dongthap-content.json

Nội dung rich-text (ghi chú, nguyên nhân/cách khắc phục...) được "làm sạch" theo whitelist thẻ/thuộc
tính, đường dẫn tương đối được đổi thành tuyệt đối trỏ về site gốc, nút xem ảnh/copy được chuyển thành
thuộc tính data-gallery / data-copy để React gắn sự kiện (xem rich-content.tsx).
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ORIGIN = "https://ilis-docs.vnptdongthap.com.vn"
VOID = {"br", "hr", "img", "input", "meta", "link", "source", "area", "base", "col", "embed", "param", "track", "wbr"}
EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B50\u2B06\uFE0F\u200D]")


# ───────────────────────────── Mini DOM ─────────────────────────────
class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.children = []
        self.parent = parent

    @property
    def classes(self):
        return (self.attrs.get("class") or "").split()

    def has(self, cls):
        return cls in self.classes


class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        self.cur.children.append(data)


def walk(node):
    for c in node.children:
        if isinstance(c, Node):
            yield c
            yield from walk(c)


def find_all(node, pred):
    return [n for n in walk(node) if pred(n)]


def find(node, pred):
    for n in walk(node):
        if pred(n):
            return n
    return None


def by_id(node, id_):
    return find(node, lambda n: n.attrs.get("id") == id_)


def by_class(node, cls, tag=None):
    return find_all(node, lambda n: n.has(cls) and (tag is None or n.tag == tag))


def text(node, strip_emoji=False):
    out = []

    def rec(n):
        for c in n.children:
            if isinstance(c, str):
                out.append(c)
            elif c.tag in ("script", "style", "svg"):
                continue
            elif c.tag == "br":
                out.append(" ")
            else:
                rec(c)

    if isinstance(node, str):
        s = node
    else:
        rec(node)
        s = "".join(out)
    if strip_emoji:
        s = EMOJI_RE.sub("", s)
    return re.sub(r"\s+", " ", s).strip()


# ───────────────────────────── URL & Sanitizer ─────────────────────────────
def absurl(u):
    u = (u or "").strip()
    if not u or u == "#" or u.startswith("javascript:"):
        return ""
    if re.match(r"^(https?:|mailto:|tel:|chrome:|coccoc:|edge:|#)", u):
        return u
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return ORIGIN + u
    return ORIGIN + "/" + re.sub(r"^(\./)+", "", u)


ALLOWED_TAGS = {
    "div", "span", "strong", "b", "em", "small", "a", "ul", "ol", "li", "p", "br", "hr",
    "img", "sup", "kbd", "code",
}
DROP_CLASS = re.compile(r"^(fa[a-z\-]*|far|fas|fab|reveal|visible|btn|btn-sm|btn-fc|btn-view|btn-copy|btn-inline|label)$")
SAFE_STYLE_PROPS = {"color", "background", "background-color", "font-weight", "font-style", "text-decoration"}


def clean_style(style):
    keep = []
    for part in (style or "").split(";"):
        if ":" not in part:
            continue
        k, v = part.split(":", 1)
        k = k.strip().lower()
        if k in SAFE_STYLE_PROPS:
            keep.append(f"{k}:{v.strip()}")
    return ";".join(keep)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def esc_attr(s):
    return esc(s).replace('"', "&quot;")


def ser_children(node, strip_emoji=False, skip=None):
    return "".join(ser(c, strip_emoji, skip) for c in node.children)


def ser(n, strip_emoji=False, skip=None):
    if isinstance(n, str):
        s = n
        if strip_emoji:
            s = EMOJI_RE.sub("", s)
        return esc(re.sub(r"\s+", " ", s))
    if skip and skip(n):
        return ""
    t = n.tag
    classes = n.classes
    # Icon FontAwesome -> bỏ
    if t == "i" or t in ("svg", "script", "style", "iframe", "input", "path", "line", "polyline", "polygon", "circle"):
        return ""
    # Nút xem ảnh minh hoạ
    if "btn-view" in classes:
        target = n.attrs.get("data-target", "")
        label = text(n, strip_emoji).lstrip("* ").strip()
        return f'<button type="button" class="rich-gallery" data-gallery="{esc_attr(target)}">{esc(label)}</button>'
    # Nút copy
    if "btn-copy" in classes:
        val = n.attrs.get("data-copy", "")
        return f'<button type="button" class="rich-copy" data-copy="{esc_attr(val)}">Sao chép</button>'
    # Span/anchor có data-href (mở iframe / copy địa chỉ trình duyệt)
    if "data-href" in n.attrs:
        href = n.attrs["data-href"]
        label = text(n, strip_emoji)
        if re.match(r"^(chrome|coccoc|edge):", href):
            return f'<button type="button" class="rich-copy rich-copy--inline" data-copy="{esc_attr(href)}">{esc(label)}</button>'
        return f'<a href="{esc_attr(absurl(href))}" target="_blank" rel="noopener noreferrer">{esc(label)}</a>'
    if t not in ALLOWED_TAGS:
        return ser_children(n, strip_emoji, skip)
    attrs = []
    if t == "a":
        href = absurl(n.attrs.get("href", ""))
        if not href:
            return ser_children(n, strip_emoji, skip)
        attrs.append(f'href="{esc_attr(href)}"')
        if not href.startswith("#"):
            attrs.append('target="_blank" rel="noopener noreferrer"')
    if t == "img":
        src = absurl(n.attrs.get("src", ""))
        attrs.append(f'src="{esc_attr(src)}" alt="{esc_attr(n.attrs.get("alt", ""))}" loading="lazy"')
    keep_classes = [c for c in classes if not DROP_CLASS.match(c)]
    if keep_classes:
        attrs.append(f'class="{" ".join(keep_classes)}"')
    if n.attrs.get("id"):
        attrs.append(f'id="{esc_attr(n.attrs["id"])}"')
    style = clean_style(n.attrs.get("style"))
    if style:
        attrs.append(f'style="{esc_attr(style)}"')
    attr_s = (" " + " ".join(attrs)) if attrs else ""
    if t in VOID:
        return f"<{t}{attr_s}/>"
    inner = ser_children(n, strip_emoji, skip)
    # Bỏ các span/div rỗng không có ý nghĩa trang trí
    if not inner.strip() and t in ("span", "div", "p", "strong") and not keep_classes:
        return ""
    return f"<{t}{attr_s}>{inner}</{t}>"


def tidy(html):
    html = re.sub(r"<li>\s*Đóng iFrame\s*</li>", "", html)
    html = re.sub(r"(<br/>\s*){3,}", "<br/><br/>", html)
    html = re.sub(r"^(\s|<br/>)+|(\s|<br/>)+$", "", html)
    return re.sub(r"\s{2,}", " ", html).strip()


# ───────────────────────────── Extractors ─────────────────────────────
def extract_notifications(root):
    overlay = by_id(root, "notifOverlay")
    items = []
    for item in by_class(overlay, "notif-item"):
        icon_box = find(item, lambda n: n.has("notif-icon"))
        tone = next((c for c in icon_box.classes if c in ("blue", "red", "orange")), "blue") if icon_box else "blue"
        title = text(find(item, lambda n: n.has("notif-title")), True)
        time_ = text(find(item, lambda n: n.has("notif-time")))
        body_node = find(item, lambda n: n.has("notif-body"))
        body = tidy(ser_children(
            body_node, True,
            skip=lambda n: n.has("notif-title") or n.has("notif-time"),
        ))
        body = re.sub(r'<span class="h5px"></span>', "<br/>", body)
        items.append({
            "id": f"notif-{len(items) + 1}",
            "tone": tone,
            "unread": item.has("unread"),
            "title": title,
            "date": time_,
            "bodyHtml": tidy(body),
        })
    return items


def extract_ticker(root):
    holder = by_id(root, "tickerText")
    out = []
    for c in holder.children:
        if isinstance(c, Node) and c.tag == "span":
            s = text(c, True).lstrip("; ").strip()
            if s:
                out.append(s)
    return out


def extract_errors(root):
    wrap = by_id(root, "cac-loi-thuong-gap")
    tabs = []
    for b in by_class(wrap, "error-tab-btn", "button"):
        label = re.sub(r"\s*\(\d+\)\s*$", "", text(b))
        tabs.append({"id": b.attrs["data-category"], "label": label})
    groups = []
    n = 0
    for block in by_class(wrap, "error-category-block"):
        heading = text(find(block, lambda x: x.has("error-category-heading")))
        gid = block.attrs.get("data-group")
        items = []
        for card in by_class(block, "error-item-card"):
            n += 1
            title_span = find(find(card, lambda x: x.has("error-name")), lambda x: x.tag == "span" and not x.has("err-index"))
            title = re.sub(r"^Lỗi:\s*", "", text(title_span))
            badge = text(find(card, lambda x: x.has("error-badge-tag")))
            cause = find(card, lambda x: x.has("error-cause-box"))
            sol = find(card, lambda x: x.has("error-solution-box"))
            first_strong = lambda x: x.tag == "strong" and x.parent in (cause, sol) and \
                find(x, lambda y: y.tag == "i") is not None
            cause_html = tidy(ser_children(cause, False, skip=first_strong))
            cause_html = re.sub(r"^(<br/>|\s)+", "", cause_html)
            sol_html = tidy(ser_children(sol, False, skip=lambda x: first_strong(x) or x.has("error-action-btns")))
            actions = []
            btns = find(sol, lambda x: x.has("error-action-btns"))
            if btns:
                for a in find_all(btns, lambda x: x.tag == "a"):
                    label = text(a)
                    if a.has("btn-view"):
                        actions.append({"type": "gallery", "label": label, "target": a.attrs.get("data-target", "")})
                    else:
                        kind = "download" if "download" in a.attrs else "link"
                        actions.append({"type": kind, "label": label, "href": absurl(a.attrs.get("href", ""))})
            items.append({
                "id": f"err-{n}",
                "index": n,
                "category": gid,
                "badge": badge,
                "title": title,
                "causeHtml": cause_html,
                "solutionHtml": sol_html,
                "actions": actions,
            })
        groups.append({"id": gid, "title": re.sub(r"^\d+\.\s*", "", heading), "items": items})
    return {"tabs": tabs, "groups": groups}


def extract_notes(root):
    wrap = by_id(root, "ghi-chu")
    panels = by_class(wrap, "info-panel")
    sections = []
    important = []
    for p in panels:
        h5 = find(p, lambda x: x.tag == "h5" and x.parent is p)
        if h5 is None:
            continue
        title = re.sub(r"^\d+\.\s*", "", text(h5))
        num_m = re.match(r"^(\d+)\.", text(h5))
        imp = find(p, lambda x: x.has("important-notes-panel"))
        if imp is not None:
            ol = find(imp, lambda x: x.has("important-notes-list"))
            for li in [c for c in ol.children if isinstance(c, Node) and c.tag == "li"]:
                num = text(find(li, lambda x: x.has("note-num")))
                content = find(li, lambda x: x.has("note-content"))
                important.append({"num": int(num), "html": tidy(ser_children(content))})
        html = tidy(ser_children(
            p, False,
            skip=lambda x: x is h5 or x.has("important-notes-panel") or x.tag == "iframe" or x.has("iframe-box"),
        ))
        # bỏ <li> chỉ chứa link "Đóng iFrame" (nút điều khiển iframe của site gốc)
        html = re.sub(r"<li>\s*<a [^>]*>Đóng iFrame</a>\s*</li>", "", html)
        sections.append({
            "id": f"ghi-chu-{num_m.group(1) if num_m else len(sections) + 1}",
            "order": int(num_m.group(1)) if num_m else len(sections) + 1,
            "title": title,
            "html": html,
        })
    return {"sections": sections, "important": important}


def extract_software(root):
    wrap = by_id(root, "phan-mem-ky-so")
    items = []
    for card in by_class(wrap, "software-card"):
        img = find(card, lambda x: x.tag == "img")
        name = text(find(card, lambda x: x.has("sw-name")))
        desc = text(find(card, lambda x: x.has("sw-desc")))
        dl = find(card, lambda x: x.tag == "a" and x.has("dl"))
        vw = find(card, lambda x: x.tag == "a" and x.has("vw"))
        guide = absurl(vw.attrs.get("href", "")) if vw else ""
        items.append({
            "id": f"sw-{len(items) + 1}",
            "name": name,
            "description": desc,
            "logo": absurl(img.attrs["src"]) if img else "",
            "downloadHref": absurl(dl.attrs.get("href", "")) if dl else "",
            "guideHref": guide,
            "guideLabel": text(vw) if vw else "Hướng dẫn",
        })
    return items


def extract_videos(root):
    wrap = by_id(root, "huong-dan")
    player = by_id(wrap, "mainVideoFrame")
    inner = find(wrap, lambda x: x.has("video-list-inner"))
    groups = []
    cur = None
    for c in inner.children:
        if not isinstance(c, Node):
            continue
        if c.has("video-list-label"):
            cur = {"title": text(c), "items": []}
            groups.append(cur)
        elif c.has("video-item"):
            src = c.attrs["data-video-src"]
            m = re.search(r"/embed/([\w\-]+)", src)
            title = text(find(c, lambda x: x.tag == "p"))
            start = re.search(r"[?&]start=(\d+)", src)
            cur["items"].append({
                "id": m.group(1),
                "title": title,
                "start": int(start.group(1)) if start else None,
            })
    return {"defaultPlaylist": player.attrs["src"], "groups": groups}


def extract_docs(root):
    wrap = by_id(root, "huong-dan")
    items = []
    for card in by_class(wrap, "file-card"):
        icon = find(card, lambda x: x.has("fc-icon"))
        icon_kind = next((c.replace("fa-file-", "") for c in icon.classes if c.startswith("fa-file-")), "pdf")
        name_node = find(card, lambda x: x.has("fc-name"))
        badge = find(name_node, lambda x: x.has("badge") or x.has("badge-new"))
        is_new = badge is not None
        name = text(name_node, False)
        if is_new:
            name = re.sub(r"\s*Mới\s*$", "", name).strip()
        date = re.sub(r"^Cập nhật:\s*", "", text(find(card, lambda x: x.has("fc-date"))))
        a = find(card, lambda x: x.tag == "a")
        doc = {
            "id": f"doc-{len(items) + 1}",
            "name": name,
            "kind": icon_kind,
            "updated": date,
            "isNew": is_new or bool(re.search(r"\bMới\b", text(card))),
        }
        if a.has("btn-view"):
            doc["gallery"] = a.attrs.get("data-target", "")
        else:
            doc["href"] = absurl(a.attrs.get("href", ""))
        items.append(doc)
    return items


def extract_image_map(full_text):
    m = re.search(r"const imageMap = \{(.*?)\n\s*\};", full_text, re.S)
    out = {}
    for key, arr in re.findall(r"'([^']+)':\s*\[(.*?)\]", m.group(1), re.S):
        vals = [v.strip().strip('"').strip("'") for v in arr.replace("\n", " ").split(",") if v.strip()]
        out[key] = vals
    return out


def main():
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("src/features/portal/data/dongthap-content.json")
    full = src.read_text(encoding="utf-8")
    b = full.find("<body>")
    e = full.find('<script src="https://code.jquery.com')
    body = full[b:e]
    builder = Builder()
    builder.feed(body)
    root = builder.root

    data = {
        "origin": ORIGIN,
        "ticker": extract_ticker(root),
        "notifications": extract_notifications(root),
        "errors": extract_errors(root),
        "notes": extract_notes(root),
        "software": extract_software(root),
        "videos": extract_videos(root),
        "docs": extract_docs(root),
        "imageMap": extract_image_map(full),
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    err_n = sum(len(g["items"]) for g in data["errors"]["groups"])
    vid_n = sum(len(g["items"]) for g in data["videos"]["groups"])
    print(
        f"ticker={len(data['ticker'])} notif={len(data['notifications'])} errors={err_n} "
        f"notes={len(data['notes']['sections'])}+{len(data['notes']['important'])} software={len(data['software'])} "
        f"videos={vid_n} docs={len(data['docs'])} gallery={len(data['imageMap'])} -> {out}"
    )


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
