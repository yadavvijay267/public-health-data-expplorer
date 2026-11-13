# Public Health Data Explorer

Explore public COVID-19 data by country: compare countries, normalise
per capita, and view 7-day rolling averages — the two features that separate
honest charts from misleading ones. Data comes from the free
[disease.sh](https://disease.sh/) API (no key needed), with a built-in sample
dataset as a fallback so the dashboard works even without network access.

## Features

- **Global stat cards** — total cases, deaths, recovered, active, cases
  today, and countries tracked.
- **Country search** — type a name, see that country's key stats, fatality
  rate, and cases per 100k.
- **Country comparison** — compare up to 3 countries on one trend chart.
- **Per-capita toggle** — switch between raw counts and cases per 100,000
  people.
- **7-day rolling average toggle** — smooths daily noise; raw values are
  still in the downloaded CSV.
- **Peak annotation** — the chart marks the peak of the selected series.
- **Top-10 table** — click any row to load that country.
- **Download filtered data** — export the selected countries as CSV.

## Tech Stack

- Plain HTML, CSS, and JavaScript (no build step, no framework)
- Canvas chart drawn with vanilla JS — no chart library needed
- [disease.sh API](https://disease.sh/docs/) — free, no API key
  (Johns Hopkins University CSSE dataset)

## How to Run

No installation needed. Open the dashboard in a browser:

```bash
# Option 1: open the file directly (sample data is used)
open src/index.html        # macOS
xdg-open src/index.html    # Linux

# Option 2: serve it locally (recommended — enables live API calls)
python3 -m http.server 8000 --directory src
# then visit http://localhost:8000
```

Live data requires internet access. If the API cannot be reached, the page
says so in the status bar and shows the built-in sample dataset instead.

## Tests

```bash
python3 tests/check_html.py
```

This validates the HTML structure (matching tags, required element ids) and
checks that the JS references the disease.sh API and the fallback data.
See [`tests/TESTING.md`](tests/TESTING.md) for the manual checklist.

## Screenshots

See [`screenshots/SCREENSHOTS.md`](screenshots/SCREENSHOTS.md).

## License

MIT — see [LICENSE](LICENSE).
