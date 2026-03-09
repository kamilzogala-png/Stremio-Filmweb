const fs = require('fs');
const path = require('path');
const nameToImdb = require('name-to-imdb');

const BASE_URL = 'https://www.filmweb.pl';
const API_BASE_URL = `${BASE_URL}/api/v1`;
const CINEMETA_URL = 'https://v3-cinemeta.strem.io/meta';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'watchlist.json');
const username = process.env.FILMWEB_USERNAME || '7owca7';
const CONCURRENCY = 8;

const API_TYPE_BY_STREMIO_TYPE = {
  movie: 'film',
  series: 'serial'
};

const MANUAL_IMDB_OVERRIDES = {
  movie: {
    '762774': 'tt5478534'
  },
  series: {}
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
      movie: buildStats(rawCatalogs.movie, catalogs.movie),
      series: buildStats(rawCatalogs.series, catalogs.series)
    }
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Saved Filmweb watchlist for ${username} to ${OUTPUT_PATH}`);
  console.log(`Movies fetched: ${rawCatalogs.movie.length}, matched IMDb: ${payload.stats.movie.matched}`);
  console.log(`Series fetched: ${rawCatalogs.series.length}, matched IMDb: ${payload.stats.series.matched}`);
}

function buildStats(rawItems, enrichedItems) {
  return {
    scraped: rawItems.length,
    matched: enrichedItems.filter((item) => String(item.id || '').startsWith('tt')).length
  };
}

async function fetchWatchlistCatalog(type) {
  const apiType = API_TYPE_BY_STREMIO_TYPE[type];
  const entries = await fetchJson(`${API_BASE_URL}/user/${encodeURIComponent(username)}/want2see/${apiType}`);

  const details = await mapWithConcurrency(entries, CONCURRENCY, async (entry) => {
    const info = await fetchJson(`${API_BASE_URL}/title/${entry.entity}/info`);
    return buildCatalogItem(info, type, entry.timestamp);
  });

  return details.filter(Boolean).sort(sortByAddedAtDesc);
}

function buildCatalogItem(info, type, addedAtTimestamp) {
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
    description: buildFilmwebDescription(info, addedAtTimestamp),
    releaseInfo,
    year: info.year || undefined,
    website: `${BASE_URL}/${websiteType}/${encodeURIComponent(info.title).replace(/%20/g, '+')}-${info.id}`,
    filmwebId: String(info.id),
    originalName: info.originalTitle || undefined,
    addedAt: addedAtTimestamp || undefined,
    addedAtISO: addedAtTimestamp ? new Date(addedAtTimestamp).toISOString() : undefined
  };
}

async function enrichCatalog(items, type) {
  const enriched = [];

  for (const item of items) {
    enriched.push(await enrichItem(item, type));
  }

  return enriched.sort(sortByAddedAtDesc);
}

async function enrichItem(item, type) {
  const overrideId = MANUAL_IMDB_OVERRIDES[type]?.[item.filmwebId];
  if (overrideId) {
    const overrideMeta = await fetchCinemetaMeta(type, overrideId);
    if (overrideMeta) {
      return mergeCinemetaData(item, overrideId, overrideMeta);
    }

    return addMetahubFallback({ ...item, id: overrideId }, overrideId);
  }

  const candidates = [item.originalName, item.name]
    .filter(Boolean)
    .map((value) => value.trim())
    .filter((value, index, array) => array.indexOf(value) === index);

  for (const candidate of candidates) {
    const imdbId = await lookupImdbId({ name: candidate, type, year: item.year });
    if (!imdbId) {
      continue;
    }

    const meta = await fetchCinemetaMeta(type, imdbId);
    if (meta && isYearCompatible(item, meta)) {
      return mergeCinemetaData(item, imdbId, meta);
    }

    if (isYearCompatible(item, { releaseInfo: item.releaseInfo })) {
      return addMetahubFallback({ ...item, id: imdbId }, imdbId);
    }
  }

  return item;
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
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

async function fetchCinemetaMeta(type, imdbId) {
  try {
    const response = await fetch(`${CINEMETA_URL}/${type}/${imdbId}.json`);
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.meta || null;
  } catch (error) {
    return null;
  }
}

function isYearCompatible(item, meta) {
  const metaYear = extractYear(meta.releaseInfo);
  if (item.year && metaYear && Math.abs(item.year - metaYear) > 1) {
    return false;
  }

  return true;
}

function mergeCinemetaData(item, imdbId, meta) {
  return addMetahubFallback({
    ...item,
    id: imdbId,
    poster: meta.poster || item.poster,
    background: meta.background || item.background || meta.poster || item.poster,
    description: meta.description || item.description,
    releaseInfo: meta.releaseInfo || item.releaseInfo,
    genres: meta.genres || undefined,
    imdbRating: meta.imdbRating || undefined,
    runtime: meta.runtime || undefined
  }, imdbId);
}

function addMetahubFallback(item, imdbId) {
  if (!String(imdbId || '').startsWith('tt')) {
    return item;
  }

  return {
    ...item,
    poster: item.poster || `https://images.metahub.space/poster/small/${imdbId}/img`,
    background: item.background || `https://images.metahub.space/background/medium/${imdbId}/img`
  };
}

function normalizePosterPath(posterPath) {
  if (!posterPath) {
    return undefined;
  }

  return `https://fwcdn.pl/fpo${posterPath.replace('.$.jpg', '.10.webp')}`;
}

function buildFilmwebDescription(info, addedAtTimestamp) {
  const parts = [];
  if (info.originalTitle && info.originalTitle !== info.title) {
    parts.push(info.originalTitle);
  }
  if (info.year) {
    parts.push(String(info.year));
  }
  if (addedAtTimestamp) {
    parts.push(`Added ${new Date(addedAtTimestamp).toISOString().slice(0, 10)}`);
  }
  return parts.join(' • ');
}

function extractYear(value) {
  const match = String(value || '').match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function sortByAddedAtDesc(left, right) {
  return Number(right?.addedAt || 0) - Number(left?.addedAt || 0);
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
