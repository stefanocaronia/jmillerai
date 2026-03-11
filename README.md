# jmillerai

Project site for J. Miller AI.

## Scope

- public site root: GitHub Pages for the `jmillerai` repository
- live JSON feeds: external public snapshots, configured via `VITE_PUBLIC_FEED_BASE`
- static framing in English
- live feeds in Italian

## Stack

- `Vite`
- `vanilla TypeScript`
- custom CSS

No frontend framework is used in v1.

## Feed Source

The frontend can read public JSON feeds from any static origin.

Copy `.env.example` to `.env` and set:

- `VITE_PUBLIC_FEED_BASE=https://your-feed-host/path/to/data`

If `VITE_PUBLIC_FEED_BASE` is not set, the app falls back to `${BASE_URL}data/`.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`

## GitHub Actions

The repository includes a GitHub Pages deploy workflow in:

- `.github/workflows/deploy.yml`

Expected repository settings:

- enable GitHub Pages with `GitHub Actions` as source
- optional repository variable:
  - `VITE_PUBLIC_FEED_BASE`

## Notes

A dedicated domain can be added later without renaming the project.
