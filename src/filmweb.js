const puppeteer = require('puppeteer');

const BASE_URL = 'https://www.filmweb.pl';
const PAGE_TIMEOUT_MS = 45000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const HASH_BY_TYPE = {
  movie: 'film',
  series: 'serial'
};
const cache = new Map();
const inflight = new Map();

async function getWatchlistCatalog({ username, type }) {
  const entityName = HASH_BY_TYPE[type];

  if (!entityName) {
    return [];
  }

  const cacheKey = `${username}:${type}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.items;
  }

  if (inflight.has(cacheKey)) {
    return inflight.get(cacheKey);
  }

  const task = scrapeRenderedWatchlist({ username, type, entityName })
    .then((items) => {
      cache.set(cacheKey, {
        createdAt: Date.now(),
        items
      });
      inflight.delete(cacheKey);
      return items;
    })
    .catch((error) => {
      inflight.delete(cacheKey);
      throw error;
    });

  inflight.set(cacheKey, task);
  return task;
}

async function scrapeRenderedWatchlist({ username, type, entityName }) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36');
    await page.setViewport({ width: 1440, height: 2200 });

    const url = `${BASE_URL}/user/${encodeURIComponent(username)}#/wantToSee/${entityName}`;
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TIMEOUT_MS
    });

    await waitForWatchlist(page, entityName);
    await expandWatchlist(page, entityName);

    const items = await page.evaluate((expectedEntityName) => {
      const hrefNeedle = expectedEntityName === 'film' ? '/film/' : '/serial/';
      const cards = [];
      const seen = new Set();

      const root = document.querySelector('#app') || document.body;
      const anchors = Array.from(root.querySelectorAll(`a[href*="${hrefNeedle}"]`));

      const textOf = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
      const cleanTitle = (value) =>
        (value || '')
          .replace(/\(\d{4}\)/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

      const extractId = (href) => {
        const match = String(href || '').match(/-(\d{3,})\b/) || String(href || '').match(/\b(\d{3,})\b/);
        return match ? match[1] : null;
      };

      for (const anchor of anchors) {
        const href = anchor.getAttribute('href') || '';
        const id = extractId(href);
        if (!id || seen.has(id)) {
          continue;
        }

        const container = anchor.closest('article, li, [class*="preview"], [class*="poster"], [class*="card"], [class*="item"], [class*="tile"]') || anchor.parentElement;
        const image = container?.querySelector('img') || anchor.querySelector('img');
        const titleCandidate = cleanTitle(
          anchor.getAttribute('title') ||
          image?.getAttribute('alt') ||
          textOf(container?.querySelector('h2, h3, h4, strong')) ||
          textOf(anchor) ||
          textOf(container)
        );

        if (!titleCandidate || titleCandidate.length < 2) {
          continue;
        }

        const blob = textOf(container);
        const yearMatch = blob.match(/\b(19|20)\d{2}\b/);
        const poster = image?.getAttribute('src') || image?.getAttribute('data-src') || image?.getAttribute('srcset')?.split(' ')[0] || null;

        cards.push({
          key: `${expectedEntityName}-${id}`,
          id,
          type: expectedEntityName === 'film' ? 'movie' : 'series',
          title: titleCandidate,
          year: yearMatch ? Number(yearMatch[0]) : undefined,
          poster,
          href,
          description: blob
        });
        seen.add(id);
      }

      return cards;
    }, entityName);

    if (!items.length) {
      throw new Error(`Could not find any ${entityName} watchlist items for Filmweb user "${username}".`);
    }

    return items
      .filter((item) => item.type === type)
      .map((item) => toMeta(item, username));
  } finally {
    await browser.close();
  }
}

async function waitForWatchlist(page, entityName) {
  const hrefNeedle = entityName === 'film' ? '/film/' : '/serial/';

  await page.waitForFunction(
    (needle) => {
      const root = document.querySelector('#app') || document.body;
      const links = root.querySelectorAll(`a[href*="${needle}"]`);
      return links.length > 0;
    },
    { timeout: PAGE_TIMEOUT_MS },
    hrefNeedle
  );
}

async function expandWatchlist(page, entityName) {
  const hrefNeedle = entityName === 'film' ? '/film/' : '/serial/';
  let previousCount = -1;
  let stablePasses = 0;

  for (let i = 0; i < 8 && stablePasses < 2; i += 1) {
    const count = await page.evaluate((needle) => {
      const root = document.querySelector('#app') || document.body;
      return root.querySelectorAll(`a[href*="${needle}"]`).length;
    }, hrefNeedle);

    if (count === previousCount) {
      stablePasses += 1;
    } else {
      stablePasses = 0;
      previousCount = count;
    }

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });
    await delay(1200);
  }
}

function toMeta(item, username) {
  const encodedUsername = encodeURIComponent(username);

  return {
    id: `filmweb:${encodedUsername}:${item.type}:${item.key}`,
    type: item.type,
    name: item.title,
    poster: normalizeUrl(item.poster),
    posterShape: item.type === 'series' ? 'regular' : 'poster',
    description: buildDescription(item),
    background: normalizeUrl(item.poster),
    releaseInfo: item.year ? String(item.year) : undefined,
    website: normalizeUrl(item.href)
  };
}

function buildDescription(item) {
  const parts = [];

  if (item.year) {
    parts.push(String(item.year));
  }

  if (item.description) {
    parts.push(item.description);
  }

  return parts.join(' • ');
}

function normalizeUrl(value) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  if (value.startsWith('/')) {
    return `${BASE_URL}${value}`;
  }

  return `${BASE_URL}/${value}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  getWatchlistCatalog
};
