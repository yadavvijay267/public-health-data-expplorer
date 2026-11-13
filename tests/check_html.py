#!/usr/bin/env python3
"""Automated HTML checks for the Public Health Data Explorer.

Validates that src/index.html is well-formed (matching tags via html.parser),
contains every element id the JavaScript expects, links the stylesheet and
script, and that src/app.js references the disease.sh API and the built-in
fallback data.

Run from the project root::

    python3 tests/check_html.py
"""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_FILE = ROOT / "src" / "index.html"
JS_FILE = ROOT / "src" / "app.js"

REQUIRED_IDS = [
    "dataStatus", "statCases", "statDeaths", "statRecovered", "statActive",
    "statToday", "statCountries", "countrySearch", "countryList", "searchBtn",
    "compareBoxes", "perCapita", "rollingAvg", "downloadBtn", "detailTitle",
    "detailStats", "chartTitle", "chartHint", "trendChart", "chartLegend",
    "topTable",
]

# HTML void elements never have a closing tag.
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class TagChecker(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.ids: set[str] = set()
        self.errors: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)
        for name, value in attrs:
            if name == "id" and value:
                self.ids.add(value)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"Closing </{tag}> with nothing open")
        elif self.stack[-1] != tag:
            self.errors.append(
                f"Mismatched close </{tag}>; expected </{self.stack[-1]}>")
            if tag in self.stack:
                while self.stack and self.stack[-1] != tag:
                    self.stack.pop()
                self.stack.pop()
        else:
            self.stack.pop()


def main() -> int:
    failures: list[str] = []
    html = HTML_FILE.read_text(encoding="utf-8")
    js = JS_FILE.read_text(encoding="utf-8")

    checker = TagChecker()
    checker.feed(html)
    failures.extend(checker.errors)
    if checker.stack:
        failures.append(f"Unclosed tags at end of file: {checker.stack}")

    for element_id in REQUIRED_IDS:
        if element_id not in checker.ids:
            failures.append(f"Missing element id: #{element_id}")

    for needle, what in [
        ('href="styles.css"', "stylesheet link"),
        ('src="app.js"', "script tag"),
        ("<canvas", "chart canvas"),
        ("disease.sh", "disease.sh reference in HTML"),
    ]:
        if needle not in html:
            failures.append(f"HTML is missing its {what}")

    for needle, what in [
        ("disease.sh/v3/covid-19", "disease.sh API base URL"),
        ("FALLBACK_GLOBAL", "built-in fallback global data"),
        ("FALLBACK_COUNTRIES", "built-in fallback country data"),
        ("perCapita", "per-capita toggle handling"),
        ("rollingAverage", "7-day rolling average function"),
        ("downloadBtn", "CSV download handler"),
    ]:
        if needle not in js:
            failures.append(f"app.js is missing its {what}")

    if failures:
        print("FAIL — public-health-data-explorer HTML checks:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print(f"OK — {HTML_FILE.name}: tags balanced, all {len(REQUIRED_IDS)} required "
          f"element ids present, disease.sh API + fallback wired in app.js.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
