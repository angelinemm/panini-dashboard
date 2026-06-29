<p>
  <img src="public/favicon.svg" alt="" width="42" height="42" />
</p>

# Panini Tour de France Dashboard

A small React dashboard for tracking Panini Tour de France sticker collections
from 2020 onward.

The app reads dated CSV snapshots, picks the latest snapshot for the main dashboard, and uses all snapshots to show collection progress over time.

## Features

- Overall collection progress
- Year-by-year album navigation and coming-soon states
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

## Albums

Albums are explicitly listed in `albums.config.json`, so every configured year
appears in the dashboard even when it has no data. An album without snapshots
shows the coming-soon illustration.

Each entry provides its display details and private data locations:

```json
{
  "id": "tdf-2025",
  "year": 2025,
  "title": "Tour de France 2025",
  "snapshotsDirectory": "albums/tdf-2025/snapshots",
  "chases": "/albums/tdf-2025/chases.json"
}
```

The selected album is stored in the URL, for example `/?album=tdf-2025`.

## Snapshot Data

The existing 2026 snapshots continue to live in:

```text
public/snapshots/
```

Copy each snapshot into that directory using its date as the filename:

```text
public/snapshots/2026-06-16.csv
```

Older albums use their configured directory:

```text
public/albums/tdf-2025/snapshots/2025-07-12.csv
```

Vite enriches the explicit album list with discovered snapshots and generates
`albums.json` automatically. It also
checks the filename, CSV header and column count, sticker numbers, and `On a`
values. An invalid snapshot stops the development server or production build
with an error identifying the file and row.

The real collection files are intentionally ignored by Git:

```text
public/snapshots/*.csv
public/albums/*/snapshots/*.csv
```

If there are no private snapshots, Vite generates the index from the committed
demo data:

```text
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

- `Number`: a sticker identifier; both numeric values and special identifiers such as `T01` are supported
- `On a`: `TRUE` when the sticker is collected
- `Doubles`: packet number(s) where duplicate copies were received, for example `28` or `10, 28`
- `Type`: sticker type, such as `Coureur`, `Coureuse`, `Maillot`, `Logo`, `Equipe`, or `Vélo`
- `Equipe`: team name
- `Fav?`: any non-empty value marks a favourite
- `Top 3`: use `1`, `2`, or `3` for personal favourite-card ranking

When a special sticker first appears in a newer snapshot, the dashboard also
adds it as uncollected to every older snapshot where it was absent. This repairs
historical totals after a spreadsheet export omitted non-numeric identifiers,
without inventing packet, duplicate, favourite, or ranking history.

## Chases

Private chase data can live in:

```text
public/chases.json
```

For older albums, use the album-specific path from `albums.config.json`, such
as `public/albums/tdf-2025/chases.json`.

That file is ignored by Git. Use `public/chases.example.json` as a template:

```json
{
  "stickers": [
    { "number": 145, "note": "Movistar rider" }
  ],
  "teams": ["MOVISTAR TEAM"]
}
```

The dashboard uses the latest snapshot to show whether chased stickers are collected and how followed teams are progressing.

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
