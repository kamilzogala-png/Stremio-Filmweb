# Filmweb Watchlist Stremio Addon

This project is a Stremio addon built with the official [`stremio-addon-sdk`](https://github.com/Stremio/stremio-addon-sdk). It reads a public Filmweb profile watchlist and exposes it as two Stremio catalogs:

- movies
- series

The user enters a Filmweb profile name on the addon configuration page inside Stremio.

## What this version does

- Uses `manifest.config` so the user can enter a Filmweb profile name.
- Requires configuration before install.
- Opens the public Filmweb watchlist page in a headless browser and extracts rendered cards.
- Splits results into movie and series catalogs.
- Works with a normal Node server, which makes free hosting on Render straightforward.

## Project structure

- `server.js` sets up the Stremio manifest and handlers.
- `src/filmweb.js` opens Filmweb and reads the rendered `wantToSee` pages.
- `render.yaml` lets you deploy the addon as a free Render web service.

## Local run

1. Install Node.js 18 or newer.
2. Install dependencies:

```bash
npm install
```

3. Start the addon:

```bash
npm start
```

4. Open:

```text
http://127.0.0.1:7000/configure
```

5. Enter a Filmweb profile name and install the addon into Stremio.

## Free hosting on Render

Render still documents a free web service tier as of March 9, 2026, and it provides HTTPS automatically, which Stremio needs for remote addon URLs.

1. Push this repo to GitHub.
2. Create a new Render Web Service from the repo.
3. Let Render detect `render.yaml`, or set these manually:

```text
Build Command: npm install
Start Command: npm start
```

4. After deploy, open:

```text
https://your-service-name.onrender.com/configure
```

5. Enter the Filmweb profile name and install the addon.

The manifest URL will be:

```text
https://your-service-name.onrender.com/manifest.json
```

## Important limitation

Filmweb does not provide a documented public watchlist API for this use case, so this addon reads the rendered profile page in a headless browser. That is more resilient than guessing hidden APIs, but it still may need updates if Filmweb changes its frontend.

If the watchlist is not loading:

- make sure the Filmweb profile is public
- confirm the profile name is correct
- check server logs for scrape errors
- confirm Chromium can start in the hosting environment

## Next improvement I recommend

The best next step is to enrich the scraped items with stable external IDs such as IMDb or TMDB IDs. That would make the catalog integrate better with other Stremio addons that rely on common IDs for streams and metadata.
