const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { getStoredCatalog, getStoredMeta, getStoredProfile } = require('./src/store');

const profile = getStoredProfile();

const manifest = {
  id: 'com.fgame.filmweb.watchlist.synced',
  version: '0.4.1',
  name: 'Filmweb Watchlist Sync',
  description: `Shows the synced public Filmweb watchlist for ${profile.username || 'a Filmweb user'}.`,
  resources: ['catalog', 'meta'],
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
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
  return {
    metas: getStoredCatalog(args.type, args.id)
  };
});

builder.defineMetaHandler(async (args) => {
  if (!args.id) {
    return { meta: null };
  }

  if (String(args.id).startsWith('tt')) {
    const meta = await fetchCinemetaMeta(args.type, args.id);
    if (meta) {
      return { meta };
    }
  }

  return {
    meta: getStoredMeta(args.type, args.id)
  };
});

async function fetchCinemetaMeta(type, id) {
  try {
    const response = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`);
    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.meta || null;
  } catch (error) {
    console.warn(`Cinemeta lookup failed for ${type}/${id}: ${error.message || error}`);
    return null;
  }
}

serveHTTP(builder.getInterface(), {
  port: Number(process.env.PORT) || 7000
});
