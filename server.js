const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { getWatchlistCatalog } = require('./src/filmweb');

const manifest = {
  id: 'com.fgame.filmweb.watchlist',
  version: '0.1.0',
  name: 'Filmweb Watchlist',
  description: 'Shows a public Filmweb watchlist in Stremio catalogs.',
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
  ],
  behaviorHints: {
    configurable: true,
    configurationRequired: true
  },
  config: [
    {
      key: 'username',
      title: 'Filmweb profile name',
      type: 'text',
      required: true
    }
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
  const username = ((args.config || {}).username || '').trim();

  if (!username) {
    throw new Error('Filmweb profile name is required.');
  }

  if (args.id !== `filmweb-watchlist-${args.type}`) {
    return { metas: [] };
  }

  const metas = await getWatchlistCatalog({
    username,
    type: args.type
  });

  return { metas };
});

builder.defineMetaHandler(async (args) => {
  const username = ((args.config || {}).username || '').trim();

  if (!username) {
    throw new Error('Filmweb profile name is required.');
  }

  const [prefix, encodedUsername, itemType, itemKey] = String(args.id || '').split(':');

  if (prefix !== 'filmweb' || encodedUsername !== encodeURIComponent(username) || itemType !== args.type || !itemKey) {
    return { meta: null };
  }

  const metas = await getWatchlistCatalog({
    username,
    type: args.type
  });

  const meta = metas.find((entry) => entry.id === args.id) || null;

  return { meta };
});

serveHTTP(builder.getInterface(), {
  port: Number(process.env.PORT) || 7000
});