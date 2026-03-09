const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'watchlist.json');

function readStore() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function getStoredProfile() {
  const store = readStore();
  return {
    username: store.username || '',
    updatedAt: store.updatedAt || ''
  };
}

function getStoredCatalog(type) {
  const store = readStore();
  return Array.isArray(store.catalogs?.[type]) ? store.catalogs[type] : [];
}

function getStoredMeta(type, id) {
  const metas = getStoredCatalog(type);
  return metas.find((item) => item.id === id) || null;
}

module.exports = {
  getStoredCatalog,
  getStoredMeta,
  getStoredProfile
};
