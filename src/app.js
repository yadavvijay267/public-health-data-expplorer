/* Public Health Data Explorer — disease.sh (free, no key) with a built-in
   sample-data fallback so the dashboard works even without network access.
   All code here is original; the chart is drawn on a plain <canvas>. */
"use strict";

const API = "https://disease.sh/v3/covid-19";
const COLORS = ["#1f3864", "#2bb3c0", "#e67e22", "#8e44ad", "#27ae60"];
const MAX_COMPARE = 3;

/* Deterministic pseudo-random generator so the fallback data is stable. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildFallbackHistory(seed, base, days = 30) {
  const rand = lcg(seed);
  const timeline = {};
  let value = base;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
    value = Math.max(0, Math.round(value * (1 + (rand() - 0.48) * 0.04)));
    timeline[key] = value;
  }
  return timeline;
}

const FALLBACK_GLOBAL = {
  cases: 704753890, deaths: 7010681, recovered: 675619811,
  active: 22168628, todayCases: 48213, affectedCountries: 231,
};

const FALLBACK_COUNTRIES = [
  { country: "India", cases: 45035393, deaths: 533664, recovered: 44501856, active: 0, todayCases: 124, population: 1417173173, casesPerOneMillion: 31776 },
  { country: "USA", cases: 103802702, deaths: 1123836, recovered: 101786417, active: 892449, todayCases: 8214, population: 334805269, casesPerOneMillion: 310061 },
  { country: "France", cases: 40138560, deaths: 167642, recovered: 39913818, active: 57100, todayCases: 3120, population: 67936860, casesPerOneMillion: 590869 },
  { country: "Germany", cases: 38828995, deaths: 174979, recovered: 38245611, active: 408405, todayCases: 4910, population: 84220184, casesPerOneMillion: 461013 },
  { country: "Brazil", cases: 37763906, deaths: 704659, recovered: 36784158, active: 275089, todayCases: 2733, population: 216422446, casesPerOneMillion: 174493 },
  { country: "Japan", cases: 33803572, deaths: 74694, recovered: 33500000, active: 228878, todayCases: 1930, population: 125124989, casesPerOneMillion: 270158 },
  { country: "South Korea", cases: 34571873, deaths: 35934, recovered: 34400000, active: 135939, todayCases: 2540, population: 51715162, casesPerOneMillion: 668530 },
  { country: "Italy", cases: 26145224, deaths: 192790, recovered: 25700000, active: 252434, todayCases: 1180, population: 58870763, casesPerOneMillion: 444118 },
  { country: "United Kingdom", cases: 24658705, deaths: 232112, recovered: 24000000, active: 426593, todayCases: 980, population: 67736802, casesPerOneMillion: 364040 },
  { country: "Russia", cases: 23281672, deaths: 400593, recovered: 22600000, active: 281079, todayCases: 760, population: 144444372, casesPerOneMillion: 161189 },
];

const state = {
  live: false,
  global: null,
  countries: [],
  history: {},          // country name -> { cases: {date: n}, deaths: {...}, recovered: {...} }
  selected: null,       // country object shown in the detail panel
  compared: [],         // country names in the comparison (max 3)
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("en-US"));

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadData() {
  try {
    const [globalData, countries] = await Promise.all([
      fetchJson(`${API}/all`),
      fetchJson(`${API}/countries?sort=cases`),
    ]);
    state.global = globalData;
    state.countries = countries;
    state.live = true;
    $("dataStatus").textContent = "● Live data from disease.sh (updated " +
      new Date(globalData.updated).toLocaleString() + ")";
  } catch (err) {
    console.warn("Live API unavailable, using built-in sample data:", err);
    state.global = FALLBACK_GLOBAL;
    state.countries = FALLBACK_COUNTRIES.map((c) => ({ ...c }));
    state.live = false;
    $("dataStatus").textContent = "● Showing built-in sample data — the live API could not be reached.";
  }
  renderGlobal();
  renderCountryList();
  renderCompareBoxes();
  renderTopTable();
  selectCountry("India");
}

function renderGlobal() {
  const g = state.global;
  $("statCases").textContent = fmt(g.cases);
  $("statDeaths").textContent = fmt(g.deaths);
  $("statRecovered").textContent = fmt(g.recovered);
  $("statActive").textContent = fmt(g.active);
  $("statToday").textContent = fmt(g.todayCases);
  $("statCountries").textContent = fmt(g.affectedCountries || state.countries.length);
}

function renderCountryList() {
  const list = $("countryList");
  list.innerHTML = "";
  for (const c of state.countries) {
    const opt = document.createElement("option");
    opt.value = c.country;
    list.appendChild(opt);
  }
}

function renderCompareBoxes() {
  const box = $("compareBoxes");
  box.innerHTML = "";
  // Offer the 8 largest countries as quick comparison picks.
  for (const c of state.countries.slice(0, 8)) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = c.country;
    input.addEventListener("change", () => {
      if (input.checked) {
        if (state.compared.length >= MAX_COMPARE) {
          input.checked = false;
          alert(`Compare up to ${MAX_COMPARE} countries at a time.`);
          return;
        }
        state.compared.push(c.country);
      } else {
        state.compared = state.compared.filter((n) => n !== c.country);
      }
      drawChart();
    });
    label.append(input, document.createTextNode(" " + c.country));
    box.appendChild(label);
  }
}

function renderTopTable() {
  const tbody = document.querySelector("#topTable tbody");
  tbody.innerHTML = "";
  state.countries.slice(0, 10).forEach((c, i) => {
    const tr = document.createElement("tr");
    const per100k = c.population ? (c.cases / c.population) * 100000 : null;
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(c.country)}</td>` +
      `<td class="num">${fmt(c.cases)}</td><td class="num">${fmt(c.deaths)}</td>` +
      `<td class="num">${fmt(c.recovered)}</td><td class="num">${fmt(per100k)}</td>`;
    tr.addEventListener("click", () => selectCountry(c.country));
    tbody.appendChild(tr);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function findCountry(name) {
  return state.countries.find((c) => c.country.toLowerCase() === String(name).trim().toLowerCase());
}

async function getHistory(countryName) {
  if (state.history[countryName]) return state.history[countryName];
  try {
    const data = await fetchJson(`${API}/historical/${encodeURIComponent(countryName)}?lastdays=30`);
    state.history[countryName] = data.timeline;
    return data.timeline;
  } catch (err) {
    console.warn("History API unavailable, generating sample trend for", countryName);
    const base = findCountry(countryName);
    const seed = [...countryName].reduce((a, ch) => a + ch.charCodeAt(0), 7);
    const timeline = {
      cases: buildFallbackHistory(seed, (base ? base.cases : 1000000) * 0.98),
      deaths: buildFallbackHistory(seed + 1, (base ? base.deaths : 10000) * 0.98),
      recovered: buildFallbackHistory(seed + 2, (base ? base.recovered : 900000) * 0.98),
    };
    state.history[countryName] = timeline;
    return timeline;
  }
}

function selectCountry(name) {
  const country = findCountry(name);
  if (!country) {
    $("detailTitle").textContent = `No data for “${name}” — try another country.`;
    return;
  }
  state.selected = country;
  $("detailTitle").textContent = country.country;
  const per100k = country.population ? (country.cases / country.population) * 100000 : null;
  const fatality = country.cases ? (country.deaths / country.cases) * 100 : null;
  $("detailStats").innerHTML = [
    ["Total cases", fmt(country.cases)],
    ["Deaths", fmt(country.deaths)],
    ["Recovered", fmt(country.recovered)],
    ["Active", fmt(country.active)],
    ["Cases today", fmt(country.todayCases)],
    ["Cases per 100k", fmt(per100k)],
    ["Case fatality rate", fatality == null ? "—" : fatality.toFixed(2) + "%"],
    ["Population", fmt(country.population)],
  ].map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join("");
  drawChart();
}

/* --- Series math ------------------------------------------------------ */

function dailyFromCumulative(cumulative) {
  const dates = Object.keys(cumulative);
  const values = dates.map((d, i) => (i === 0 ? 0 : Math.max(0, cumulative[d] - cumulative[dates[i - 1]])));
  return { dates, values };
}

function rollingAverage(values, window = 7) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function currentMetric() {
  return document.querySelector('input[name="metric"]:checked').value;
}

/* --- Chart ------------------------------------------------------------ */

async function drawChart() {
  const canvas = $("trendChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const metric = currentMetric();
  const perCapita = $("perCapita").checked;
  const useRolling = $("rollingAvg").checked;

  const names = [];
  if (state.selected) names.push(state.selected.country);
  for (const n of state.compared) if (!names.includes(n)) names.push(n);
  if (!names.length) return;

  const series = [];
  for (const name of names) {
    const timeline = await getHistory(name);
    const country = findCountry(name);
    const { dates, values } = dailyFromCumulative(timeline[metric] || {});
    let shown = useRolling ? rollingAverage(values) : values;
    if (perCapita && country && country.population) {
      shown = shown.map((v) => (v / country.population) * 100000);
    }
    series.push({ name, dates, values: shown });
  }

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);
  const padL = 70, padR = 16, padT = 18, padB = 34;
  const w = canvas.width - padL - padR, h = canvas.height - padT - padB;
  const n = Math.max(...series.map((s) => s.values.length));

  // Gridlines + y labels.
  ctx.strokeStyle = "#e3e9f0"; ctx.fillStyle = "#5b6b7c";
  ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "right";
  for (let g = 0; g <= 4; g++) {
    const y = padT + (h * g) / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + w, y); ctx.stroke();
    ctx.fillText(fmt((max * (4 - g)) / 4), padL - 8, y + 4);
  }
  // X labels (first, middle, last date).
  const dates = series[0].dates;
  ctx.textAlign = "center";
  for (const i of [0, Math.floor(n / 2), n - 1]) {
    if (dates[i]) ctx.fillText(dates[i], padL + (w * i) / Math.max(n - 1, 1), canvas.height - 12);
  }

  let peak = { value: -1, x: 0, y: 0, label: "" };
  series.forEach((s, si) => {
    ctx.strokeStyle = COLORS[si % COLORS.length];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    s.values.forEach((v, i) => {
      const x = padL + (w * i) / Math.max(n - 1, 1);
      const y = padT + h - (h * v) / max;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      if (v > peak.value) peak = { value: v, x, y, label: `${s.name} — peak ${fmt(v)}` };
    });
    ctx.stroke();
  });

  // Peak annotation.
  ctx.fillStyle = "#c0392b";
  ctx.beginPath(); ctx.arc(peak.x, peak.y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Peak: " + peak.label, Math.min(peak.x + 10, canvas.width - 220), Math.max(peak.y - 10, 14));

  const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);
  $("chartTitle").textContent =
    `${metricLabel} — daily new, last 30 days${useRolling ? " (7-day rolling average)" : ""}${perCapita ? " (per 100k)" : ""}`;
  $("chartLegend").innerHTML = series.map((s, i) =>
    `<i style="background:${COLORS[i % COLORS.length]}"></i>${escapeHtml(s.name)}`).join("");
}

/* --- Events ------------------------------------------------------------ */

$("searchBtn").addEventListener("click", () => selectCountry($("countrySearch").value));
$("countrySearch").addEventListener("keydown", (e) => {
  if (e.key === "Enter") selectCountry(e.target.value);
});
document.querySelectorAll('input[name="metric"]').forEach((r) =>
  r.addEventListener("change", drawChart));
$("perCapita").addEventListener("change", drawChart);
$("rollingAvg").addEventListener("change", drawChart);

$("downloadBtn").addEventListener("click", () => {
  const names = state.selected ? [state.selected.country, ...state.compared] : [...state.compared];
  const rows = [["country", "cases", "deaths", "recovered", "active", "cases_today", "cases_per_100k"]];
  for (const name of [...new Set(names)]) {
    const c = findCountry(name);
    if (!c) continue;
    const per100k = c.population ? (c.cases / c.population) * 100000 : "";
    rows.push([c.country, c.cases, c.deaths, c.recovered, c.active ?? "", c.todayCases ?? "",
      Math.round(per100k)]);
  }
  if (rows.length === 1) { alert("Select a country first."); return; }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "public-health-filtered.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

loadData();
