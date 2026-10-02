#!/usr/bin/env python3
"""Builds results.html from scripts/results.template.html.

The page copy comes from data/results-copy.csv (local copy of the published
sheet) and data/results-ui.csv; chart values come from
data/results-charts.json. English text and every chart are written into the
HTML so the page is complete even if JavaScript never runs. js/results.js
later re-reads the live sheet and swaps EN/KO through the data-t / data-en /
data-ko attributes this script emits.

Template placeholders:
  {{id}}            English text for a sheet/UI id
  {{num:id}}        a numeric id, formatted (546120 -> 546,120)
  {{value:base}}    base_prefix + base_value + base_suffix spans
  {{stat:base}}     a stat block (value + base_label)
  {{info:id}}       a collapsed "More info" disclosure holding that text
  {{chart:key}}     a chart from results-charts.json
  {{tabs}}          the B2 page list + screen panel
  {{assembly}}      the B2 scroll scene cards (decorative)

Run: python3 scripts/build-results.py
"""
import csv
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "scripts" / "results.template.html"
OUT = ROOT / "results.html"
WEB = "/images/results-web"

NUMERIC = re.compile(r"_(value\d*|views)$")

# B2 list, in the order and grouping set in the brief. Paths match the
# site menu (js/nav-data.js).
GROUPS = [
    ("group_fans", "fans", [
        ("page_official_welcome", "/official-welcome.html", "still", "official-welcome"),
        ("page_partners_map", "/map/", "still", "welcome-partners-map"),
        ("page_stadium_info", "/stadium-info.html", "video", "stadium-info"),
        ("page_essentials_tips", "/essentials-tips.html", "video", "essentials-tips"),
        ("page_transportation_guide", "/transportation-guide.html", "video", "transportation-guide"),
        ("page_pilgrimage", "/pilgrimage.html", "video", "pilgrimage"),
        ("page_chicago_trip_guide", "/chicago-trip-guide.html", "video", "chicago-trip-guide"),
        ("page_fan_event_hub", "/fan-event-hub.html", "video", "fan-event-hub"),
    ]),
    ("group_press", "press", [
        ("page_partner_toolkit", "/partner-toolkit.html", "partners", "logo"),
        ("page_press", "/press.html", "video", "press"),
        ("page_about_contact", "/about-contact.html", "still", "about-contact"),
    ]),
]
VIEWS = {
    "page_fan_event_hub": "page_fan_event_hub_views",
    "page_partners_map": "page_partners_map_views",
    "page_stadium_info": "page_stadium_info_views",
    "page_pilgrimage": "page_pilgrimage_views",
}


def esc(s):
    return html.escape(str(s), quote=True)


def load_copy():
    copy = {}
    for name in ("results-copy.csv", "results-ui.csv"):
        with open(ROOT / "data" / name, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                rid = (row.get("id") or "").strip()
                if rid:
                    copy[rid] = {"en": (row.get("en") or "").strip(), "ko": (row.get("ko") or "").strip()}
    return copy


COPY = load_copy()
CHARTS = json.loads((ROOT / "data" / "results-charts.json").read_text(encoding="utf-8"))


def en(rid):
    if rid not in COPY:
        sys.exit(f"Missing copy id: {rid}")
    return COPY[rid]["en"]


def fmt_num(raw):
    raw = str(raw).strip()
    try:
        n = float(raw)
    except ValueError:
        return raw
    if n.is_integer():
        return f"{int(n):,}"
    return f"{n:,}".rstrip("0").rstrip(".") if "." in raw else raw


def t(rid, tag="span", cls=None):
    c = f' class="{cls}"' if cls else ""
    num = " data-num" if NUMERIC.search(rid) else ""
    text = fmt_num(en(rid)) if num else en(rid)
    return f'<{tag}{c} data-t="{rid}"{num}>{esc(text)}</{tag}>'


def pair(obj, tag="span", cls=None):
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-en="{esc(obj["en"])}" data-ko="{esc(obj["ko"])}">{esc(obj["en"])}</{tag}>'


def value(base):
    parts = []
    if f"{base}_prefix" in COPY:
        parts.append(t(f"{base}_prefix", cls="rs-value__affix"))
    parts.append(t(f"{base}_value", cls="rs-value__num"))
    if f"{base}_suffix" in COPY:
        parts.append(t(f"{base}_suffix", cls="rs-value__affix"))
    return "".join(parts)


def stat(base):
    return (
        f'<div class="rs-stat"><p class="rs-stat__value">{value(base)}</p>'
        f'{t(base + "_label", "p", "rs-stat__label")}</div>'
    )


def info(rid):
    return (
        '<details class="rs-info"><summary class="rs-info__btn">'
        '<svg class="rs-info__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">'
        '<circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.8"/>'
        '<circle cx="12" cy="7.4" r="1.4" fill="currentColor"/>'
        '<rect x="10.9" y="10.2" width="2.2" height="7.6" rx="1.1" fill="currentColor"/></svg>'
        f'{t("info_button", cls="rs-sr")}</summary>'
        f'{t(rid, "p", "rs-info__text")}</details>'
    )


# ---------------------------------------------------------------- charts --

def fmt_chart_value(v, unit):
    if v is None:
        return None
    if unit == "pct_change":
        s = fmt_num(v)
        return f"+{s}%" if v > 0 else f"{s}%"
    return fmt_num(v)


def sr_table(chart, rows):
    body = "".join(
        f"<tr><th scope=\"row\">{pair(label)}</th><td>{cell}</td></tr>" for label, cell in rows
    )
    return (
        f'<table class="rs-sr"><caption>{pair(chart["title"])}</caption>'
        f'<thead><tr><th scope="col">{t("table_item")}</th><th scope="col">{t("table_value")}</th></tr></thead>'
        f"<tbody>{body}</tbody></table>"
    )


def chart_bars(key, chart):
    unit = chart.get("unit")
    items = chart["items"]
    top = max((i["v"] for i in items if i["v"] is not None), default=1) or 1
    rows, table_rows = [], []
    for item in items:
        shown = fmt_chart_value(item["v"], unit)
        if shown is None:
            value_html = pair(item["label"], cls="rs-bar__value rs-bar__value--word")
            cell = pair(item["label"])
            width = 0
        else:
            value_html = f'<span class="rs-bar__value">{esc(shown)}</span>'
            cell = esc(shown)
            width = max(item["v"], 0) / top * 100
        tag = t("pos_label", cls="rs-tag") if item.get("pos") else ""
        if tag:
            cell += f" ({t('pos_label')})"
        rows.append(
            '<div class="rs-bar">'
            f'{pair(item, cls="rs-bar__label")}'
            f'<span class="rs-bar__track"><span class="rs-bar__fill" style="--w:{width:.2f}%"></span></span>'
            f'<span class="rs-bar__end">{value_html}{tag}</span>'
            "</div>"
        )
        table_rows.append((item, cell))
    note = pair(chart["note"], "p", "rs-chart__note") if "note" in chart else ""
    return (
        f'<figure class="rs-chart rs-chart--bars rs-paper" data-chart="{key}">'
        f'{pair(chart["title"], "figcaption", "rs-chart__title")}'
        f'<div class="rs-bars" aria-hidden="true">{"".join(rows)}</div>'
        f"{note}{sr_table(chart, table_rows)}</figure>"
    )


DONUT_COLORS = ["var(--purple-900)", "var(--purple-600)", "var(--gold-500)", "rgba(78, 42, 148, 0.28)"]
STACK_COLORS = ["var(--purple-900)", "var(--purple-600)", "rgba(78, 42, 148, 0.32)", "var(--gold-500)"]


def legend(items, colors, total):
    return "".join(
        '<li class="rs-legend__item">'
        f'<span class="rs-legend__swatch" style="background:{colors[i]}"></span>'
        f'{pair(item, cls="rs-legend__label")}'
        f'<span class="rs-legend__value">{fmt_num(item["v"])}</span></li>'
        for i, item in enumerate(items)
    )


def chart_donut(key, chart):
    items = chart["items"]
    total = sum(i["v"] for i in items)
    r = 42
    circ = 2 * 3.141592653589793 * r
    offset = 0.0
    segs = []
    for i, item in enumerate(items):
        length = item["v"] / total * circ
        segs.append(
            f'<circle cx="60" cy="60" r="{r}" fill="none" stroke="{DONUT_COLORS[i]}" stroke-width="20" '
            f'stroke-dasharray="{length:.3f} {circ - length:.3f}" stroke-dashoffset="{-offset:.3f}"/>'
        )
        offset += length
    n = re.search(r"n=\d+", chart["title"]["en"])
    center = f'<text x="60" y="64" text-anchor="middle" class="rs-donut__center">{esc(n.group(0)) if n else ""}</text>'
    table_rows = [(i, fmt_num(i["v"])) for i in items]
    return (
        f'<figure class="rs-chart rs-chart--donut rs-paper" data-chart="{key}">'
        f'{pair(chart["title"], "figcaption", "rs-chart__title")}'
        '<div class="rs-donut" aria-hidden="true">'
        f'<svg class="rs-donut__svg" viewBox="0 0 120 120" width="180" height="180" focusable="false">'
        f'<g transform="rotate(-90 60 60)">{"".join(segs)}</g>{center}</svg>'
        f'<ul class="rs-legend">{legend(items, DONUT_COLORS, total)}</ul></div>'
        f"{sr_table(chart, table_rows)}</figure>"
    )


def chart_stack(key, chart):
    items = chart["items"]
    total = sum(i["v"] for i in items)
    segs = "".join(
        f'<span class="rs-stack__seg" style="--w:{item["v"] / total * 100:.2f}%;background:{STACK_COLORS[i]}"></span>'
        for i, item in enumerate(items)
    )
    table_rows = [(i, fmt_num(i["v"])) for i in items]
    return (
        f'<figure class="rs-chart rs-chart--stack rs-paper" data-chart="{key}">'
        f'{pair(chart["title"], "figcaption", "rs-chart__title")}'
        '<div class="rs-stack" aria-hidden="true">'
        f'<div class="rs-stack__track"><span class="rs-stack__fill">{segs}</span></div>'
        f'<ul class="rs-legend">{legend(items, STACK_COLORS, total)}</ul></div>'
        f"{sr_table(chart, table_rows)}</figure>"
    )


def chart_map():
    return (
        '<figure class="rs-chart rs-chart--map rs-paper" data-chart="hotels">'
        f'<img class="rs-map__img" src="{WEB}/where-army-stayed.jpg" width="1260" height="798" loading="lazy" '
        f'alt="{esc(en("alt_map"))}" data-t-alt="alt_map">'
        f'{t("map_credit", "figcaption", "rs-chart__credit")}</figure>'
    )


def chart(key):
    if key == "hotels":
        return chart_map()
    c = CHARTS[key]
    if key == "origin":
        return chart_donut(key, c)
    if key == "welcome":
        return chart_stack(key, c)
    return chart_bars(key, c)


# ------------------------------------------------------------------ tabs --

def media_for(media, name):
    if media == "partners":
        return f"{WEB}/logo.png", "", 468, 600
    return f"{WEB}/{name}.jpg", (f"{WEB}/{name}.mp4" if media == "video" else ""), 960, 472


def alt_text(media, page_id):
    tpl = en("alt_video" if media == "video" else "alt_still")
    return tpl.replace("{page}", en(page_id))


def tabs():
    groups = []
    for group_id, slug, pages in GROUPS:
        items = []
        for page_id, href, media, name in pages:
            img, video, w, h = media_for(media, name)
            views = ""
            if page_id in VIEWS:
                views = (
                    f'<span class="rs-tab__views">{t(VIEWS[page_id])} {t("page_views_label")}</span>'
                )
            items.append(
                f'<li class="rs-tabs__item"><a class="rs-tab" href="{href}" data-page="{page_id}" '
                f'data-media="{media}" data-img="{img}" data-video="{video}" data-w="{w}" data-h="{h}">'
                f'{t(page_id, cls="rs-tab__name")}{views}'
                '<span class="rs-tab__progress" aria-hidden="true"></span></a></li>'
            )
        groups.append(
            f'<div class="rs-tabs__group"><h3 class="rs-tabs__heading" id="rs-group-{slug}" data-t="{group_id}">'
            f'{esc(en(group_id))}</h3><ul class="rs-tabs__items" aria-labelledby="rs-group-{slug}">'
            f'{"".join(items)}</ul></div>'
        )
    first_id, first_href, first_media, first_name = GROUPS[0][2][0]
    img, _, w, h = media_for(first_media, first_name)
    return (
        '<div class="rs-tabs" data-rs-tabs>'
        '<div class="rs-tabs__nav">'
        '<button type="button" class="rs-tabs__toggle" data-tabs-toggle hidden>'
        f'{t("autoplay_pause")}</button>'
        f'{"".join(groups)}'
        f'<p class="rs-tabs__period">{t("page_views_label")}, {t("period")}</p>'
        "</div>"
        '<div class="rs-tabs__panel" id="rs-tabs-panel">'
        '<div class="rs-screen rs-paper">'
        f'<div class="rs-screen__media" data-media="{first_media}">'
        f'<img class="rs-screen__img" src="{img}" width="{w}" height="{h}" '
        f'alt="{esc(alt_text(first_media, first_id))}" data-t-alt="alt_still" data-alt-page="{first_id}">'
        '<video class="rs-screen__video" width="960" height="472" muted loop playsinline preload="none" hidden></video>'
        f'{t("partners_only", cls="rs-screen__badge")}'
        "</div>"
        '<p class="rs-screen__caption">'
        f'<span class="rs-screen__name" data-t="{first_id}">{esc(en(first_id))}</span>'
        f'<a class="rs-link rs-screen__link" href="{first_href}">{t("open_page")} <span aria-hidden="true">&rarr;</span></a>'
        "</p></div></div></div>"
    )


def assembly():
    cards = "".join(
        f'<span class="rs-assembly__card" data-t="{page_id}">{esc(en(page_id))}</span>'
        for _, _, pages in GROUPS
        for page_id, *_ in pages
    )
    return (
        '<div class="rs-assembly" data-rs-assembly aria-hidden="true">'
        '<div class="rs-assembly__stage">'
        '<div class="rs-assembly__frame rs-paper">'
        f'<div class="rs-assembly__menu">{cards}</div>'
        '<div class="rs-assembly__screen">'
        f'<img src="{WEB}/official-welcome.jpg" width="960" height="472" alt="" loading="lazy">'
        "</div></div></div></div>"
    )


# ---------------------------------------------------------------- render --

def render(match):
    kind, _, arg = match.group(1).partition(":")
    if not arg:
        if kind == "tabs":
            return tabs()
        if kind == "assembly":
            return assembly()
        return esc(fmt_num(en(kind)) if NUMERIC.search(kind) else en(kind))
    if kind == "num":
        return esc(fmt_num(en(arg)))
    if kind == "value":
        return value(arg)
    if kind == "stat":
        return stat(arg)
    if kind == "info":
        return info(arg)
    if kind == "chart":
        return chart(arg)
    sys.exit(f"Unknown placeholder: {match.group(0)}")


def main():
    src = TEMPLATE.read_text(encoding="utf-8")
    out = re.sub(r"\{\{([a-z0-9_:]+)\}\}", render, src)
    OUT.write_text(out, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({len(out):,} bytes)")


if __name__ == "__main__":
    main()
