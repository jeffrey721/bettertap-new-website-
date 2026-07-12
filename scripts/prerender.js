#!/usr/bin/env node
/* =================================================================
   Better Tap — Build-time pre-render (writes to dist/)
   ----------------------------------------------------------------
   Runs on every Vercel deploy (via `npm run build`).
   1. Mirrors the source tree into ./dist (source files are never
      modified in place, so the git working tree stays clean).
   2. Queries the Storefront API for the current Better Tap catalog.
   3. Injects real prices + a fully populated Product JSON-LD into
      dist/shop.html and dist/compare.html so crawlers see live data
      with no runtime JS, and users see the correct price on first
      paint (no "Loading…" flash).

   vercel.json sets outputDirectory: "dist" so Vercel serves the
   pre-rendered files.

   The Storefront token is PUBLISHABLE — safe to include here / in env.

   Trigger a rebuild whenever the catalog changes:
     Shopify webhook (products/update, inventory_levels/update)
     -> Vercel Deploy Hook (URL is secret; keep it out of the repo)
   ================================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.resolve(ROOT, 'dist');

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'dqz0fm-jv.myshopify.com';
const API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || '2025-07';
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN || '71b65eca82761a181ff873015953c182';
const ENDPOINT = `https://${DOMAIN}/api/${API_VERSION}/graphql.json`;
const CANONICAL = 'https://drinkbettertap.com';

const MACHINE_HANDLE = 'better-tap-water-bar';
const LEASE_MONTHLY_HANDLE = 'better-tap-lease-monthly';

/* Directories and files never copied to dist/ */
const SKIP_PATHS = new Set([
  'node_modules', '.git', '.github', 'dist', 'scripts',
  '.vercel', '.next', '.DS_Store', 'Thumbs.db',
  '_bg_pages', '_handoff_pages', '_bg_text.txt',
  'package.json', 'package-lock.json', 'yarn.lock'
]);
const SKIP_PREFIXES = ['_preview', '_verify', '_handoff'];

/* ---------- helpers ---------- */
function log(msg)  { process.stdout.write('[prerender] ' + msg + '\n'); }
function warn(msg) { process.stderr.write('[prerender:warn] ' + msg + '\n'); }
function fail(msg) { process.stderr.write('[prerender:fail] ' + msg + '\n'); process.exitCode = 1; }

function shouldSkip(name) {
  if (SKIP_PATHS.has(name)) return true;
  return SKIP_PREFIXES.some(function (p) { return name.startsWith(p); });
}

function copyTree(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (src === ROOT && shouldSkip(entry)) continue;
      copyTree(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

async function storefront(query, variables) {
  if (typeof fetch !== 'function') throw new Error('This script needs Node 18+ (native fetch).');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN
    },
    body: JSON.stringify({ query, variables })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Storefront HTTP ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  if (json.errors) warn('GraphQL errors: ' + JSON.stringify(json.errors).slice(0, 500));
  return json.data;
}

function fmtMoney(price) {
  if (!price) return '';
  const amt = Number(price.amount);
  const cur = price.currencyCode || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: cur,
    minimumFractionDigits: Math.floor(amt) === amt ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amt);
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Replace exactly one match of `re` in `html`. Returns { html, changed }.
 * Logs a warning if the target was not found. Does NOT warn when the
 * replacement is a no-op (i.e. the value is already correct).
 */
function replaceRegex(html, re, replacer, label) {
  if (!re.test(html)) {
    warn(`${label}: target not found — HTML may have changed since prerender was written.`);
    return { html, changed: false };
  }
  const next = html.replace(re, replacer);
  return { html: next, changed: true };
}

/* ---------- queries ---------- */
const Q_MACHINE = `
  query M {
    productByHandle(handle:"${MACHINE_HANDLE}") {
      id handle title descriptionHtml availableForSale
      featuredImage { url altText }
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      variants(first:10) { edges { node {
        id sku title availableForSale
        price { amount currencyCode }
        selectedOptions { name value }
      } } }
    }
  }`;

const Q_LEASE_MONTHLY = `
  query L {
    productByHandle(handle:"${LEASE_MONTHLY_HANDLE}") {
      variants(first:1) { edges { node { id price { amount currencyCode } } } }
    }
  }`;

/* ---------- main ---------- */
(async () => {
  log(`Store: ${DOMAIN}  API: ${API_VERSION}`);
  log(`Source: ${ROOT}`);
  log(`Output: ${DIST}`);

  // 1) Mirror source tree into dist/
  rmrf(DIST);
  copyTree(ROOT, DIST);
  log(`Copied source tree into dist/.`);

  // 2) Fetch catalog
  let machine, leaseMonthly;
  try {
    const d1 = await storefront(Q_MACHINE);
    machine = d1 && d1.productByHandle;
    if (!machine) throw new Error(`Machine product '${MACHINE_HANDLE}' not found`);
  } catch (e) {
    fail('Machine fetch failed: ' + e.message);
    warn('Continuing with placeholder HTML (site still works via runtime JS).');
    return;
  }
  try {
    const d2 = await storefront(Q_LEASE_MONTHLY);
    leaseMonthly = d2 && d2.productByHandle;
  } catch (e) {
    warn('Lease monthly fetch failed (compare.html lease value stays as placeholder): ' + e.message);
  }

  const priceLow  = machine.priceRange.minVariantPrice;
  const priceHigh = machine.priceRange.maxVariantPrice;
  const priceMoney = fmtMoney(priceLow);
  const currency = priceLow.currencyCode;
  const anyAvail = machine.availableForSale;
  const availability = anyAvail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

  log(`Machine: "${machine.title}"  ${priceMoney}  availableForSale=${anyAvail}`);

  /* --- dist/shop.html --- */
  const shopPath = path.join(DIST, 'shop.html');
  if (fs.existsSync(shopPath)) {
    let html = fs.readFileSync(shopPath, 'utf8');

    const r1 = replaceRegex(html, /(<span data-price[^>]*>)([\s\S]*?)(<\/span>)/,
      (_m, open, _inner, close) => open + priceMoney + close,
      '[shop.html] [data-price]');
    html = r1.html;

    const r2 = replaceRegex(html, /(<p class="plan-note" data-price-note>)([\s\S]*?)(<\/p>)/,
      (_m, open, _inner, close) => open + 'One-time payment — <strong>3 years</strong> full service &amp; warranty included.' + close,
      '[shop.html] [data-price-note]');
    html = r2.html;

    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": machine.title,
      "brand": { "@type": "Brand", "name": "Better Tap" },
      "category": "Countertop bottleless water dispenser",
      "description": stripHtml(machine.descriptionHtml ||
        "Better Tap is a countertop water bar that dispenses instant hot, cold and room-temperature filtered water, using a multi-stage MAZE filter plus UV-C treatment.").slice(0, 500),
      "image": (machine.featuredImage && machine.featuredImage.url) || `${CANONICAL}/assets/img/edge-hero.png`,
      "url": `${CANONICAL}/shop.html`,
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": currency,
        "lowPrice": String(priceLow.amount),
        "highPrice": String(priceHigh.amount),
        "offerCount": machine.variants.edges.length,
        "availability": availability,
        "url": `${CANONICAL}/shop.html`
      }
    };
    const jsonLdBlock =
      `<script type="application/ld+json" data-bt-product-jsonld="${MACHINE_HANDLE}">\n` +
      JSON.stringify(productSchema) + '\n</script>';
    const r3 = replaceRegex(html,
      /<script type="application\/ld\+json" data-bt-product-jsonld="better-tap-water-bar">[\s\S]*?<\/script>/,
      jsonLdBlock,
      '[shop.html] Product JSON-LD');
    html = r3.html;

    fs.writeFileSync(shopPath, html, 'utf8');
    log('dist/shop.html: injected price + JSON-LD.');
  } else {
    warn('dist/shop.html not found; skipping.');
  }

  /* --- dist/compare.html --- */
  const cmpPath = path.join(DIST, 'compare.html');
  if (fs.existsSync(cmpPath)) {
    let html = fs.readFileSync(cmpPath, 'utf8');

    const r1 = replaceRegex(html, /(<span data-bt-machine-price>)([\s\S]*?)(<\/span>)/,
      (_m, open, _inner, close) => open + priceMoney + close,
      '[compare.html] [data-bt-machine-price]');
    html = r1.html;

    if (leaseMonthly && leaseMonthly.variants.edges[0]) {
      const lm = leaseMonthly.variants.edges[0].node.price;
      const r2 = replaceRegex(html, /(<span data-bt-lease-monthly>)([\s\S]*?)(<\/span>)/,
        (_m, open, _inner, close) => open + fmtMoney(lm) + close,
        '[compare.html] [data-bt-lease-monthly]');
      html = r2.html;
    }
    fs.writeFileSync(cmpPath, html, 'utf8');
    log('dist/compare.html: injected prices.');
  } else {
    warn('dist/compare.html not found; skipping.');
  }

  log('Done.');
})().catch((err) => {
  fail('Unexpected error: ' + (err && err.stack || err));
});
