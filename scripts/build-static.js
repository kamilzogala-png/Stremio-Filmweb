const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'watchlist.json');
const OUT_DIR = path.join(__dirname, '..', 'static');
const PAGE_SIZE = 500;

function main() {
  const store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  const username = store.username || 'filmweb-user';
  const updatedAt = store.updatedAt || new Date().toISOString();

  const catalogs = {
    movie: Array.isArray(store.catalogs?.movie) ? store.catalogs.movie : [],
    series: Array.isArray(store.catalogs?.series) ? store.catalogs.series : []
  };

  writeJson(path.join(OUT_DIR, 'manifest.json'), buildManifest(username, updatedAt));

  writeCatalog('movie', 'filmweb-watchlist-movie', catalogs.movie);
  writeCatalog('series', 'filmweb-watchlist-series', catalogs.series);

  writeCatalog('movie', 'filmweb-premieres-movie', catalogs.movie.filter(isPremiereItem));
  writeCatalog('series', 'filmweb-premieres-series', catalogs.series.filter(isPremiereItem));

  // Optional: quick summary for Actions logs
  console.log(
    JSON.stringify(
      {
        updatedAt,
        movie: {
          total: catalogs.movie.length,
          premieres: catalogs.movie.filter(isPremiereItem).length
        },
        series: {
          total: catalogs.series.length,
          premieres: catalogs.series.filter(isPremiereItem).length
        }
      },
      null,
      2
    )
  );
}

function buildManifest(username, updatedAt) {
  return {
    id: 'com.fgame.filmweb.watchlist.static',
    // Keep it strict semver without build metadata to avoid client parser issues/caching quirks.
    version: '0.5.1',
    name: 'Filmweb Watchlist (Static)',
    description: `Static catalogs synced from Filmweb for ${username}. Last sync: ${updatedAt}`,
    resources: ['catalog'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'filmweb:'],
    catalogs: [
      {
        type: 'movie',
        id: 'filmweb-watchlist-movie',
        name: 'Filmweb Watchlist Movies',
        extra: [{ name: 'skip', isRequired: false }]
      },
      {
        type: 'series',
        id: 'filmweb-watchlist-series',
        name: 'Filmweb Watchlist Series',
        extra: [{ name: 'skip', isRequired: false }]
      },
      {
        type: 'movie',
        id: 'filmweb-premieres-movie',
        name: 'Filmweb Premiere Watchlist Movies',
        extra: [{ name: 'skip', isRequired: false }]
      },
      {
        type: 'series',
        id: 'filmweb-premieres-series',
        name: 'Filmweb Premiere Watchlist Series',
        extra: [{ name: 'skip', isRequired: false }]
      }
    ],
    behaviorHints: {
      // Helps clients treat this as a simple catalog source.
      configurable: false
    }
  };
}

function writeCatalog(type, id, items) {
  const safeItems = items.map(toStremioMeta).filter(Boolean);

  // Base (skip=0)
  writeJson(path.join(OUT_DIR, 'catalog', type, `${id}.json`), {
    metas: safeItems.slice(0, PAGE_SIZE)
  });

  // Additional pages: /catalog/:type/:id/skip=100.json
  for (let skip = PAGE_SIZE; skip < safeItems.length; skip += PAGE_SIZE) {
    const page = safeItems.slice(skip, skip + PAGE_SIZE);
    writeJson(path.join(OUT_DIR, 'catalog', type, id, `skip=${skip}.json`), { metas: page });
  }
}

function toStremioMeta(item) {
  if (!item || !item.id || !item.name || !item.type) {
    return null;
  }

  // Stremio ignores unknown keys, but keep the payload lean.
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    poster: item.poster,
    posterShape: item.posterShape,
    background: item.background,
    description: item.description,
    releaseInfo: item.releaseInfo,
    genres: item.genres,
    imdbRating: item.imdbRating,
    runtime: item.runtime
  };
}

function isPremiereItem(item) {
  const currentYear = new Date().getFullYear();
  const year = Number(item?.year || 0);
  const hasImdb = String(item?.id || '').startsWith('tt');

  // Premiers: upcoming releases and also anything without an IMDb id (usually unplayable).
  return year >= currentYear || !hasImdb;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

main();

