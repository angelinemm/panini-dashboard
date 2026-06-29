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

Copy each snapshot into that directory using its date as the filename:

```text
public/snapshots/2026-06-16.csv
```

Vite discovers the files and generates `snapshots.json` automatically. It also
checks the filename, CSV header and column count, sticker numbers, and `On a`
values. An invalid snapshot stops the development server or production build
with an error identifying the file and row.

The real collection files are intentionally ignored by Git:

```text
public/snapshots/*.csv
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

- `On a`: `TRUE` when the sticker is collected
- `Doubles`: packet number(s) where duplicate copies were received, for example `28` or `10, 28`
- `Type`: sticker type, such as `Coureur`, `Coureuse`, `Maillot`, `Logo`, `Equipe`, or `Vélo`
- `Equipe`: team name
- `Fav?`: any non-empty value marks a favourite
- `Top 3`: use `1`, `2`, or `3` for personal favourite-card ranking

## Chases

Private chase data can live in:

```text
public/chases.json
```

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
