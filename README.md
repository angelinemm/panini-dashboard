<p>
  <img src="public/favicon.svg" alt="" width="42" height="42" />
</p>

# Panini Tour de France Dashboard

A small React dashboard for tracking a Panini Tour de France 2026 sticker collection.

The app reads dated CSV snapshots, picks the latest snapshot for the main dashboard, and uses all snapshots to show collection progress over time.

## Features

- Overall collection progress
- Tour de France-inspired visual design
- Snapshot history chart
- Top 3 personal favourite cards
- Men's and women's team standings
- Doubles and remaining-sticker stats
- CSV-driven data with no backend

## Tech Stack

- React
- Vite
- Papa Parse
- CSS

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

## Snapshot Data

Private local snapshots live in:

```text
public/snapshots/
```

The app reads `public/snapshots.json` to find available private snapshots:

```json
[
  { "date": "2026-06-16", "file": "/snapshots/2026-06-16.csv" }
]
```

The real collection files are intentionally ignored by Git:

```text
public/snapshots.json
public/snapshots/*.csv
```

If `public/snapshots.json` is not available, the app falls back to the committed demo data:

```text
public/demo-snapshots.json
public/demo-snapshots/
```

The snapshot with the latest `date` is used for the current dashboard totals. All listed snapshots are used for the history chart.

## CSV Columns

The app expects this column order:

```csv
Number,On a,Doubles,Type,Name,Country,Equipe,Packet,Fav?,Top 3
```

Newer snapshots may include the header row. Older snapshots without headers are also supported, as long as they use the same column order.

Important fields:

- `On a`: `TRUE` when the sticker is collected
- `Doubles`: number of duplicates
- `Type`: sticker type, such as `Coureur`, `Coureuse`, `Maillot`, `Logo`, `Equipe`, or `Vélo`
- `Equipe`: team name
- `Fav?`: any non-empty value marks a favourite
- `Top 3`: use `1`, `2`, or `3` for personal favourite-card ranking

## Team Standings

Men's team standings include:

```text
Coureur, Maillot, Logo, Equipe, Velo, Vélo
```

Women's team standings include:

```text
Coureuse
```

## Notes

This is a static frontend app. It can be hosted anywhere that serves the built files from `dist`.
