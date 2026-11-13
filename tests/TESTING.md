# Testing

## Automated check

```bash
python3 tests/check_html.py
```

Validates the HTML (balanced tags, all element ids the JS needs) and that
`app.js` references the disease.sh API plus the built-in fallback data.

## Manual checklist

Open `src/index.html` in a browser (or serve it: `python3 -m http.server 8000 --directory src`).

- [ ] Status bar says "Live data from disease.sh" (online) or "built-in sample data" (offline) — never blank.
- [ ] Six global stat cards show numbers, not "—".
- [ ] Top-10 table lists countries; clicking a row updates the detail panel and chart.
- [ ] Type "India" in the search box and press "Show country" — the detail panel shows India.
- [ ] Tick two countries in "Compare countries" — the chart draws two lines and the legend names both.
- [ ] Toggle "Per 100k people" — chart values change (small countries rise relative to large ones).
- [ ] Untick "7-day rolling average" — the line gets visibly noisier.
- [ ] Switch the metric radio to Deaths — the chart title and values update.
- [ ] The peak marker (red dot) is visible on the chart.
- [ ] "Download filtered data (CSV)" downloads a CSV with the selected countries.
- [ ] Resize to a phone-width window — cards and controls stack, nothing overflows.
