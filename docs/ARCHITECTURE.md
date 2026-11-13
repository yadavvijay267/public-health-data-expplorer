# Architecture

## Data flow

```
disease.sh API (free, no key) ──▶ app.js ──▶ stat cards, table, canvas chart
        │  (fetch fails / offline)
        ▼
built-in sample dataset (FALLBACK_*) ──▶ same rendering path
```

## API endpoints used

| Endpoint | Purpose |
| --- | --- |
| `GET /v3/covid-19/all` | Global totals for the stat cards |
| `GET /v3/covid-19/countries?sort=cases` | Per-country totals for the table and search |
| `GET /v3/covid-19/historical/{country}?lastdays=30` | 30-day cumulative timeline per country, converted to daily new cases in JS |

## How the chart works

The API returns *cumulative* totals. `dailyFromCumulative()` differences
them into daily new cases. The 7-day rolling average is a trailing mean
(`rollingAverage()`), and per-capita mode divides by population and
multiplies by 100,000. The chart is drawn on a plain `<canvas>` — axes,
gridlines, one coloured line per compared country, and a red dot marking the
peak of the plotted series.

## Why per-capita and rolling averages matter

Raw case counts make large countries look worse than small ones, and daily
counts jump around with reporting delays. The per-capita toggle and the
rolling-average toggle are the honest-chart defaults: per-capita is off by
default (raw counts are what most people expect first), rolling average is
on.

## Files

- `src/index.html` — page structure, stat cards, controls, chart canvas, table
- `src/styles.css` — all styling (no framework)
- `src/app.js` — data fetching, fallback data, rendering, chart, CSV download
