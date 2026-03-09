const fs = require('fs');
const path = require('path');
const nameToImdb = require('name-to-imdb');

const BASE_URL = 'https://www.filmweb.pl';
const API_BASE_URL = `${BASE_URL}/api/v1`;
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'watchlist.json');
const username = process.env.FILMWEB_USERNAME || '7owca7';
const CONCURRENCY = 8;

const API_TYPE_BY_STREMIO_TYPE = {
  movie: 'film',
  series: 'serial'
};

async function main() {
  const rawCatalogs = {
    movie: await fetchWatchlistCatalog('movie'),
    series: await fetchWatchlistCatalog('series')
  };

  const catalogs = {
    movie: await enrichCatalog(rawCatalogs.movie, 'movie'),
    series: await enrichCatalog(rawCatalogs.series, 'series')
  };

  const payload = {
    username,
    updatedAt: new Date().toISOString(),
    catalogs,
    stats: {
      movie: {
        scraped: rawCatalogs.movie.length,
        matched: catalogs.movie.filter((item) => String(item.id || '').startsWith('tt')).length
      },
      series: {
        scraped: rawCatalogs.series.length,
        matched: catalogs.series.filter((item) => String(item.id || '').startsWith('tt')).length
      }
    }
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Saved Filmweb watchlist for ${username} to ${OUTPUT_PATH}`);
  console.log(`Movies fetched: ${rawCatalogs.movie.length}, matched IMDb: ${payload.stats.movie.matched}`);
  console.log(`Series fetched: ${rawCatalogs.series.length}, matched IMDb: ${payload.stats.series.matched}`);
}

async function fetchWatchlistCatalog(type) {
  const apiType = API_TYPE_BY_STREMIO_TYPE[type];
  const entries = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(username)}/want2see/${apiType}`);

  const details = await mapWithConcurrency(entries, CONCURRENCY, async (entry) => {
    const info = await fetchJson(`${API_BASE_URL}/title/${entry.entity}/info`);
    return buildCatalogItem(info, type);
  });

  return details.filter(Boolean);
}

function buildCatalogItem(info, type) {
  if (!info?.id || !info?.title) {
    return null;
  }

  const poster = normalizePosterPath(info.posterPath);
  const releaseInfo = info.year ? String(info.year) : undefined;
  const websiteType = type === 'movie' ? 'film' : 'serial';

  return {
    id: `filmweb:${username}:${type}:${info.id}`,
    type,
    name: info.title,
    poster,
    posterShape: type === 'series' ? 'regular' : 'poster',
    background: poster,
    description: buildDescription(info),
    releaseInfo,
    year: info.year || undefined,
    website: `${BASE_URL}/${websiteType}/${encodeURIComponent(info.title).replace(/%20/g, '+')}-${info.id}`,
    filmwebId: String(info.id),
    originalName: info.originalTitle || undefined
  };
}

async function enrichCatalog(items, type) {
  const enriched = [];

  for (const item of items) {
    const imdbId = await resolveImdbId(item, type);
    enriched.push({
      ...item,
      id: imdbId || item.id
    });
  }

  return enriched;
}

async function resolveImdbId(item, type) {
  const candidates = [item.originalName, item.name]
    .filter(Boolean)
    .map((value) => value.trim())
    .filter((value, index, array) => array.indexOf(value) === index);

  for (const candidate of candidates) {
    const imdbId = await lookupImdbId({ name: candidate, type, year: item.year });
    if (imdbId) {
      return imdbId;
    }
  }

  return null;
}

function lookupImdbId(query) {
  return new Promise((resolve) => {
    nameToImdb(query, (error, imdbId) => {
      if (error) {
        resolve(null);
        return;
      }

      resolve(imdbId || null);
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Filmweb request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

function normalizePosterPath(posterPath) {
  if (!posterPath) {
    return undefined;
  }

  return `https://fwcdn.pl/fpo${posterPath.replace('.$.jpg', '.10.webp')}`;
}

function buildDescription(info) {
  const parts = [];
  if (info.originalTitle && info.originalTitle !== info.title) {
    parts.push(info.originalTitle);
  }
  if (info.year) {
    parts.push(String(info.year));
  }
  return parts.join(' • ');
}

async function mapWithConcurrency(items, concurrency, iteratee) {
  const results = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await iteratee(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
