#!/usr/bin/env python3
"""
Generate a JSON mapping of kanji -> {en_meaning, jlpt, freq_mainichi_shinbun, link}

Reads `kanji_jlpt.json` and `kanjidamage_listing.html` from the script directory,
parses the HTML for kanji entries and links, and writes `kanjidamage_lookup.json`.
"""
from pathlib import Path
import json
import sys
import re

try:
    from bs4 import BeautifulSoup
except Exception:
    print("This script requires BeautifulSoup. Install with: pip install -r requirements.txt")
    raise


ROOT = Path(__file__).resolve().parent
JSON_IN = ROOT / "inputs" / "kanji_jlpt.json"
HTML_IN = ROOT / "inputs" / "kanjidamage_listing.html"
JSON_OUT = ROOT / "kanjidamage_lookup.json"


def load_kanji_json(path: Path):
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def parse_kanjidamage_html(path: Path):
    """Return a mapping kanji -> {id, en}.

    Assumes the HTML table has columns where the first column is the ID,
    the kanji appears somewhere in the row (typically an <a>), and the
    third column contains the English meaning. If the third column is
    missing, falls back to heuristics.
    """
    mapping = {}
    text = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(text, "html.parser")

    for tr in soup.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue
        # id is first column (index 0)
        id_text = tds[0].get_text(" ", strip=True) if len(tds) >= 1 else ""

        # kanji is in column 3 (index 2)
        kanji = None
        href = ''
        if len(tds) >= 3:
            td_kanji = tds[2]
            a = td_kanji.find("a")
            if a:
                kanji = a.get_text(strip=True)
                href = a.get('href', '')
            else:
                kanji = td_kanji.get_text(strip=True)

        if not kanji:
            continue

        # meaning is in column 4 (index 3)
        meaning = None
        if len(tds) >= 4:
            meaning = tds[3].get_text(" ", strip=True)
        else:
            # fallback: try to find another descriptive cell
            others = [td.get_text(" ", strip=True) for td in tds[1:] if td.get_text(strip=True) and td.get_text(strip=True) not in (kanji, id_text)]
            meaning = others[0] if others else None

        # extract numeric id from href if present: pattern /kanji/<digits>
        extracted_id = None
        if href:
            m = re.search(r"/kanji/(\d+)", href)
            if m:
                extracted_id = m.group(1)

        mapping[kanji] = {"id": extracted_id or id_text or "unknown", "en": meaning}

    return mapping


def concatenate_meanings(meanings):
    if not meanings:
        return ""
    return " / ".join(m.strip() for m in meanings)


def build_output(kanji_data, html_map):
    out = {}
    for k, v in kanji_data.items():
        jlpt = v.get("jlpt")
        freq = v.get("freq_mainichi_shinbun")
        meanings = v.get("meanings") or []
        en_from_json = concatenate_meanings(meanings)

        entry = {
            "en_meaning": en_from_json,
            "jlpt": jlpt,
            "freq_mainichi_shinbun": freq,
            "stroke_count": v.get("stroke_count"),
            "id": "unknown",
        }

        # if HTML listing exists for this kanji, override en and id
        h = html_map.get(k)
        if h:
            entry["id"] = h.get("id") or "unknown"
            # if HTML provided an English string, use that; otherwise keep concatenated json meanings
            if h.get("en"):
                entry["en_meaning"] = h.get("en").strip()

        out[k] = entry
    return out


def main():
    if not JSON_IN.exists():
        print(f"Missing {JSON_IN}. Run this script from the project root.")
        sys.exit(1)
    if not HTML_IN.exists():
        print(f"Warning: {HTML_IN} not found. All links will be 'unknown'.")

    kanji_data = load_kanji_json(JSON_IN)
    html_map = {}
    if HTML_IN.exists():
        html_map = parse_kanjidamage_html(HTML_IN)

    output = build_output(kanji_data, html_map)

    with JSON_OUT.open("w", encoding="utf-8") as fh:
        json.dump(output, fh, ensure_ascii=False, indent=2)

    print(f"Wrote {JSON_OUT}")


if __name__ == "__main__":
    main()
