const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = 'https://www.filmweb.pl';
const PAGE_TIMEOUT_MS = 45000;
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'watchlist.json');
const username = process.env.FILMWEB_USERNAME || '7owca7';

const HASH_BY_TYPE = {
  movie: 'film',
  series: 'serial'
};

async function main() {
  const catalogs = {
    movie: await scrapeRenderedWatchlist({ username, type: 'movie', entityName: HASH_BY_TYPE.movie }),
    series: await scrapeRenderedWatchlist({ username, type: 'series', entityName: HASH_BY_TYPE.series })
  };

  const payload = {
    username,
    updatedAt: new Date().toISOString(),
    catalogs
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Saved Filmweb watchlist for ${username} to ${OUTPUT_PATH}`);
  console.log(`Movies: ${catalogs.movie.length}, series: ${catalogs.series.length}`);
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

    const items = await page.evaluate((expectedEntityName, encodedUsername) => {
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
        const itemType = expectedEntityName === 'film' ? 'movie' : 'series';
        const key = `${expectedEntityName}-${id}`;

        cards.push({
          id: `filmweb:${encodedUsername}:${itemType}:${key}`,
          type: itemType,
          name: titleCandidate,
          poster: normalizeUrl(poster),
          posterShape: itemType === 'series' ? 'regular' : 'poster',
          description: buildDescription(yearMatch ? Number(yearMatch[0]) : undefined, blob),
          background: normalizeUrl(poster),
          releaseInfo: yearMatch ? String(yearMatch[0]) : undefined,
          website: normalizeUrl(href)
        });
        seen.add(id);
      }

      return cards;

      function buildDescription(year, description) {
        const parts = [];
        if (year) parts.push(String(year));
        if (description) parts.push(description);
        return parts.join(' • ');
      }

      function normalizeUrl(value) {
        if (!value) return undefined;
        if (value.startsWith('http://') || value.startsWith('https://')) return value;
        if (value.startsWith('//')) return `https:${value}`;
        if (value.startsWith('/')) return `${location.origin}${value}`;
        return `${location.origin}/${value}`;
      }
    }, entityName, encodeURIComponent(username));

    if (!items.length) {
      throw new Error(`Could not find any ${entityName} watchlist items for Filmweb user "${username}".`);
    }

    return items.filter((item) => item.type === type);
  } finally {
    await browser.close();
  }
}

async function waitForWatchlist(page, entityName) {
  const hrefNeedle = entityName === 'film' ? '/film/' : '/serial/';

  await page.waitForFunction(
    (needle) => {
      const root = document.querySelector('#app') || document.body;
      return root.querySelectorAll(`a[href*="${needle}"]`).length > 0;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
