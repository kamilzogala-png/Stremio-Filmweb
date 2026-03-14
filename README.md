# Filmweb Watchlist Stremio Addon

This version is built for one Filmweb profile and syncs that profile automatically with GitHub Actions. The hosted addon server only reads `data/watchlist.json`, so it does not need live scraping on the server.

## How it works

- GitHub Actions opens the public Filmweb watchlist pages for `7owca7`.
- The workflow saves movie and series catalogs into `data/watchlist.json`.
- The hosted addon serves that stored JSON to Stremio.

## Files

- `server.js` serves stored Stremio catalogs.
- `src/store.js` reads the synced JSON file.
- `scripts/sync-watchlist.js` scrapes Filmweb and updates `data/watchlist.json`.
- `.github/workflows/sync-watchlist.yml` runs the sync every 6 hours and on manual trigger.

## Recommended hosting: GitHub Pages (no server)

This repo can publish a fully static addon:

- GitHub Actions syncs Filmweb data every hour
- it builds static addon JSON into `static/`
- it deploys `static/` to GitHub Pages

Install URL (GitHub Pages):

```text
https://<GITHUB_USERNAME>.github.io/<REPO_NAME>/manifest.json
```

For your repo:

```text
https://kamilzogala-png.github.io/Stremio-Filmweb/manifest.json
```

## Local run

```bash
npm install
npm start
```

Manifest URL:

```text
http://127.0.0.1:7000/manifest.json
```

## GitHub Actions sync

1. Push this repo to GitHub.
2. Open the repo on GitHub.
3. Open `Actions`.
4. Enable workflows if GitHub asks.
5. Run `Sync Filmweb Watchlist` once manually.
6. Wait for it to finish.
7. Check that `data/watchlist.json` now contains movies and series.

After that, the workflow will run every hour.

## Hosting

Use any simple Node host for the addon server, because the server no longer needs Chrome. Render, Railway, Fly.io, BeamUp, or another plain Node host should be much easier now.

## Stremio install

After the server is deployed, install with:

```text
https://YOUR-HOST/manifest.json
```
