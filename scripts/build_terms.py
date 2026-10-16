#!/usr/bin/env python3
"""Build data/terms.json from Wikipedia's "List of medical roots, suffixes and prefixes".

Usage:
  python scripts/build_terms.py                    # fetch live page from Wikipedia
  python scripts/build_terms.py --html page.html   # parse a saved copy instead

Every entry in the output is an affix (prefix, suffix or combining root),
never a whole word, so the game can only ever ask about word parts.
"""
import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

PAGE = "List_of_medical_roots,_suffixes_and_prefixes"
API = (
    "https://en.wikipedia.org/w/api.php?action=parse&prop=text&format=json"
    "&formatversion=2&redirects=1&page=" + urllib.parse.quote(PAGE)
)
SOURCE_URL = "https://en.wikipedia.org/wiki/" + PAGE
OUT = Path(__file__).resolve().parent.parent / "data" / "terms.json"

CITATION = re.compile(r"\[\s*(?:\d+|[a-z]|note \d+|citation needed)\s*\]", re.I)
SPACES = re.compile(r"\s+")


def fetch_html():
    req = urllib.request.Request(
        API, headers={"User-Agent": "MedicalTerminologyGame/1.0 (GitHub Pages build)"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)["parse"]["text"]


def clean(text):
    text = CITATION.sub("", SPACES.sub(" ", text))
    text = re.sub(r"\s+([,.;:)\]])", r"\1", text)  # "genitals , x" -> "genitals, x"
    text = re.sub(r"([(\[])\s+", r"\1", text)  # "( alpha" -> "(alpha"
    return SPACES.sub(" ", text).strip()


def table_grid(table):
    """Expand a table into rows of <td>/<th> cells, honouring rowspan/colspan."""
    grid, pending = [], {}  # pending: col -> (cell, rows_left)
    for tr in table.find_all("tr"):
        row, col = [], 0
        cells = tr.find_all(["td", "th"], recursive=False)
        it = iter(cells)
        while True:
            if col in pending:
                cell, left = pending[col]
                row.append(cell)
                pending[col] = (cell, left - 1)
                if left - 1 == 0:
                    del pending[col]
                col += 1
                continue
            cell = next(it, None)
            if cell is None:
                break
            span = int(cell.get("colspan", 1) or 1)
            rspan = int(cell.get("rowspan", 1) or 1)
            for _ in range(span):
                row.append(cell)
                if rspan > 1:
                    pending[col] = (cell, rspan - 1)
                col += 1
        # trailing rowspans past the last real cell
        while col in pending:
            cell, left = pending[col]
            row.append(cell)
            pending[col] = (cell, left - 1)
            if left - 1 == 0:
                del pending[col]
            col += 1
        grid.append(row)
    return grid


def find_columns(header):
    names = [clean(c.get_text(" ")).lower() for c in header]
    def idx(*keys):
        for i, n in enumerate(names):
            if any(k in n for k in keys):
                return i
        return None
    return idx("affix"), idx("meaning"), idx("example")


def split_affixes(text):
    parts = [p.strip(" ,;") for p in re.split(r",|;|\s/\s|\bor\b", text)]
    return [p for p in parts if p]


def is_word_part(affix):
    # Wikipedia marks word parts with hyphens or an optional combining vowel,
    # e.g. "a-", "-ectomy", "cardi(o)-". Anything else would be a whole word.
    return "-" in affix or "(" in affix


def split_examples(cell):
    links = [clean(a.get_text(" ")) for a in cell.find_all("a")]
    words = [w for w in links if w and not CITATION.fullmatch(f"[{w}]")]
    if not words:
        words = [w.strip() for w in re.split(r",|;", clean(cell.get_text(" ")))]
    seen, out = set(), []
    for w in words:
        if w and len(w) < 40 and w.lower() not in seen:
            seen.add(w.lower())
            out.append(w)
    return out


def parse(html):
    soup = BeautifulSoup(html, "html.parser")
    for junk in soup.select("sup.reference, .noprint, .mw-ref, style"):
        junk.decompose()
    terms, seen = [], set()

    def add(affixes, meaning, examples):
        label = ", ".join(affixes)
        key = (label.lower(), meaning.lower())
        if key not in seen:
            seen.add(key)
            terms.append({"affix": label, "meaning": meaning, "examples": examples[:4]})

    for table in soup.select("table.wikitable"):
        grid = table_grid(table)
        if not grid:
            continue
        a_col, m_col, e_col = find_columns(grid[0])
        if a_col is None or m_col is None:
            parse_english_meanings(grid, add)
            continue
        for row in grid[1:]:
            if len(row) <= max(a_col, m_col):
                continue
            if row[a_col].name == "th" and row[m_col].name == "th":
                continue  # repeated header row
            affixes = [a for a in split_affixes(clean(row[a_col].get_text(" "))) if is_word_part(a)]
            meaning = clean(row[m_col].get_text(" "))
            if not affixes or not meaning or len(meaning) > 120:
                continue
            examples = split_examples(row[e_col]) if e_col is not None and e_col < len(row) else []
            add(affixes, meaning, examples)
    return terms


def parse_english_meanings(grid, add):
    """Tables like "Body part | Greek root in English | Latin root in English | ...".

    Column 0 is the English meaning; every column whose header mentions "root"
    holds affixes for it. These tables have no example words.
    """
    names = [clean(c.get_text(" ")).lower() for c in grid[0]]
    root_cols = [i for i, n in enumerate(names) if "root" in n and i > 0]
    if not root_cols:
        return
    for row in grid[1:]:
        if len(row) <= max(root_cols) or row[0].name == "th" and row[1].name == "th":
            continue
        meaning = clean(row[0].get_text(" "))
        if not meaning or len(meaning) > 120:
            continue
        for i in root_cols:
            affixes = [a for a in split_affixes(clean(row[i].get_text(" "))) if is_word_part(a)]
            if affixes:
                add(affixes, meaning, [])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", help="parse this saved HTML file instead of fetching")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--list", action="store_true", help="print every parsed term")
    args = ap.parse_args()

    html = Path(args.html).read_text(encoding="utf-8") if args.html else fetch_html()
    terms = parse(html)
    if len(terms) < 4:
        sys.exit(f"Only parsed {len(terms)} terms - the page layout may have changed.")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"source": SOURCE_URL, "count": len(terms), "terms": terms},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    with_ex = sum(1 for t in terms if t["examples"])
    print(f"Wrote {len(terms)} terms ({with_ex} with examples) to {out}")
    shown = terms if args.list else terms[:: max(1, len(terms) // 12)]
    for t in shown:
        print(f"  {t['affix']} | {t['meaning']} | {', '.join(t['examples'])}")


if __name__ == "__main__":
    main()
