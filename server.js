const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { getStoredCatalog, getStoredMeta, getStoredProfile } = require('./src/store');

const profile = getStoredProfile();

const manifest = {
  id: 'com.fgame.filmweb.watchlist.synced',
  version: '0.2.0',
  name: 'Filmweb Watchlist Sync',
  description: `Shows the synced public Filmweb watchlist for ${profile.username || 'a Filmweb user'}.`,
  resources: ['catalog', 'meta'],
  types: ['movie', 'series'],
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
    }
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
  if (args.id !== `filmweb-watchlist-${args.type}`) {
    return { metas: [] };
  }

  return {
    metas: getStoredCatalog(args.type)
  };
});

builder.defineMetaHandler(async (args) => {
  return {
    meta: getStoredMeta(args.type, args.id)
  };
});

serveHTTP(builder.getInterface(), {
  port: Number(process.env.PORT) || 7000
});
