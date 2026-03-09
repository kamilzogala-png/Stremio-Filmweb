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

function getStoredCatalog(type, id = `filmweb-watchlist-${type}`) {
  const store = readStore();
  const items = Array.isArray(store.catalogs?.[type]) ? store.catalogs[type] : [];

  switch (id) {
    case `filmweb-watchlist-${type}`:
      return items.slice().sort(sortByAddedAtDesc);
    case `filmweb-premieres-${type}`:
      return items.filter(isPremiereItem).sort(sortByAddedAtDesc);
    default:
      return [];
  }
}

function getStoredMeta(type, id) {
  const metas = getStoredCatalog(type, `filmweb-watchlist-${type}`);
  return metas.find((item) => item.id === id) || null;
}

function isPremiereItem(item) {
  const currentYear = new Date().getFullYear();
  return Number(item?.year || 0) >= currentYear || !String(item?.id || '').startsWith('tt');
}

function sortByAddedAtDesc(left, right) {
  return Number(right?.addedAt || 0) - Number(left?.addedAt || 0);
}

module.exports = {
  getStoredCatalog,
  getStoredMeta,
  getStoredProfile
};
