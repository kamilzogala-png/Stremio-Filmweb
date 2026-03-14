const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'watchlist.json');
const OUT_DIR = path.join(__dirname, '..', 'static');

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
    version: `0.5.0+${updatedAt}`,
    name: 'Filmweb Watchlist (Static)',
    description: `Static catalogs synced from Filmweb for ${username}. Last sync: ${updatedAt}`,
    resources: ['catalog'],
    types: ['movie', 'series'],
    idPrefixes: ['tt', 'filmweb:'],
    catalogs: [
      {
        type: 'movie',
        id: 'filmweb-watchlist-movie',
        name: 'Filmweb Watchlist Movies'
      },
      {
        type: 'series',
        id: 'filmweb-watchlist-series',
        name: 'Filmweb Watchlist Series'
      },
      {
        type: 'movie',
        id: 'filmweb-premieres-movie',
        name: 'Filmweb Premiere Watchlist Movies'
      },
      {
        type: 'series',
        id: 'filmweb-premieres-series',
        name: 'Filmweb Premiere Watchlist Series'
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
  const outPath = path.join(OUT_DIR, 'catalog', type, `${id}.json`);
  writeJson(outPath, { metas: safeItems });
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

