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
- Works with a normal Node server.

## Project structure

- `server.js` sets up the Stremio manifest and handlers.
- `src/filmweb.js` opens Filmweb and reads the rendered `wantToSee` pages.
- `Dockerfile` packages Node, system Chrome dependencies, and the addon for BeamUp.
- `render.yaml` is left in the repo from the Render attempt.

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

4. Install in Stremio with a configured manifest URL, for example:

```text
http://127.0.0.1:7000/%7B%22username%22%3A%227owca7%22%7D/manifest.json
```

## BeamUp hosting

BeamUp is supported by the Stremio SDK docs. Because this addon needs Chrome for Puppeteer, use the included `Dockerfile` instead of a plain Node buildpack.

1. Install the CLI:

```bash
npm install -g beamup-cli
```

2. In the project folder, run:

```bash
beamup
```

3. On first setup, enter:

- host: `a.baby-beamup.club`
- GitHub username: your GitHub username

4. When BeamUp asks for an app name, use one that contains `docker`, for example:

```text
stremio-filmweb-docker
```

5. After deploy, install the configured manifest URL in Stremio, for example:

```text
https://YOUR-BEAMUP-URL/%7B%22username%22%3A%227owca7%22%7D/manifest.json
```

## Important limitation

Filmweb does not provide a documented public watchlist API for this use case, so this addon reads the rendered profile page in a headless browser. That means it may need updates if Filmweb changes its frontend.
