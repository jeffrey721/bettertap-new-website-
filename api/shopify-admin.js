/* =================================================================
   Better Tap — Server-side Shopify Admin API proxy
   ----------------------------------------------------------------
   Vercel serverless function. THE ONLY place the Admin API token is
   ever read; it lives in `process.env.SHOPIFY_ADMIN_TOKEN` and is
   never returned to callers or exposed in any client bundle.

   Guardrails
   - Admin token: read from env only. NEVER hardcode. NEVER commit.
   - Auth: every request must present `x-bt-auth: <shared secret>`
     matching `process.env.BT_ADMIN_SHARED_SECRET`. Otherwise 401.
   - Actions: strict whitelist. Requests referencing anything else
     (arbitrary GraphQL, unknown action) get 400. This limits blast
     radius even if the shared secret leaks.
   - CORS: same-origin by default (no ACAO header). If you need to
     call this from a different origin, tighten the check below.

   Whitelisted actions
     updateVariantPrice   { variantId, price[, compareAtPrice] }
       -> productVariantsBulkUpdate
     setInventory         { inventoryItemId, locationId, quantity }
       -> inventorySetQuantities
     updateProduct        { productId, title?, descriptionHtml?, tags?, status? }
       -> productUpdate
     getOrder             { orderId }
       -> order(id: ...)

   Required env vars (Vercel -> Project -> Settings -> Environment Variables)
     SHOPIFY_STORE_DOMAIN         dqz0fm-jv.myshopify.com
     SHOPIFY_ADMIN_TOKEN          shpat_...           (SECRET; scopes below)
     SHOPIFY_ADMIN_API_VERSION    2025-07             (optional; default 2025-07)
     BT_ADMIN_SHARED_SECRET       long random string  (SECRET)

   Required Admin API scopes for the custom app
     write_products, write_inventory, read_orders
     (add more only when adding new whitelisted actions)
   ================================================================= */
'use strict';

const ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || '2025-07';

/* ---------- helpers ---------- */
function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 200000) req.destroy(); });
    req.on('end',  () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function timingSafeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function admin(query, variables) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!domain) throw new Error('Missing SHOPIFY_STORE_DOMAIN env var');
  if (!token)  throw new Error('Missing SHOPIFY_ADMIN_TOKEN env var');
  const url = `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Shopify-Access-Token': token
    },
    body: JSON.stringify({ query, variables })
  });
  const text = await res.text();
  let payload;
  try { payload = JSON.parse(text); } catch (e) { payload = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Admin HTTP ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

/* ---------- action registry (whitelist) ---------- */
const ACTIONS = {
  /* Bulk price update. Accepts one variant per call; extend to arrays if needed. */
  updateVariantPrice: async ({ variantId, price, compareAtPrice, productId }) => {
    assertGid(variantId, 'variantId', 'ProductVariant');
    assertNumString(price, 'price');
    if (compareAtPrice != null) assertNumString(compareAtPrice, 'compareAtPrice');
    if (!productId) throw badReq('productId is required (productVariantsBulkUpdate needs the parent product).');
    assertGid(productId, 'productId', 'Product');
    const variant = { id: variantId, price: String(price) };
    if (compareAtPrice != null) variant.compareAtPrice = String(compareAtPrice);
    const query = `
      mutation UpdatePrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id price compareAtPrice }
          userErrors { field message }
        }
      }`;
    const data = await admin(query, { productId, variants: [variant] });
    return { data };
  },

  /* Set absolute inventory at a given location for a given inventory item. */
  setInventory: async ({ inventoryItemId, locationId, quantity, reason }) => {
    assertGid(inventoryItemId, 'inventoryItemId', 'InventoryItem');
    assertGid(locationId, 'locationId', 'Location');
    if (!Number.isFinite(Number(quantity))) throw badReq('quantity must be a number');
    const query = `
      mutation SetInv($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup { createdAt reason }
          userErrors { field message }
        }
      }`;
    const input = {
      name: 'available',
      reason: reason || 'correction',
      ignoreCompareQuantity: true,
      quantities: [
        { inventoryItemId, locationId, quantity: Math.floor(Number(quantity)) }
      ]
    };
    const data = await admin(query, { input });
    return { data };
  },

  /* Update product-level fields (title, description, tags, status). */
  updateProduct: async ({ productId, title, descriptionHtml, tags, status }) => {
    assertGid(productId, 'productId', 'Product');
    const input = { id: productId };
    if (title != null)           input.title = String(title);
    if (descriptionHtml != null) input.descriptionHtml = String(descriptionHtml);
    if (tags != null)            input.tags = Array.isArray(tags) ? tags.map(String) : [String(tags)];
    if (status != null) {
      const s = String(status).toUpperCase();
      if (!['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(s)) throw badReq('status must be ACTIVE, ARCHIVED or DRAFT');
      input.status = s;
    }
    if (Object.keys(input).length === 1) throw badReq('At least one updatable field is required');
    const query = `
      mutation UpdProd($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id title status tags }
          userErrors { field message }
        }
      }`;
    const data = await admin(query, { input });
    return { data };
  },

  /* Read a single order by id. */
  getOrder: async ({ orderId }) => {
    assertGid(orderId, 'orderId', 'Order');
    const query = `
      query GetOrder($id: ID!) {
        order(id: $id) {
          id name email phone createdAt updatedAt processedAt
          displayFinancialStatus displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { id email displayName }
          lineItems(first: 50) { edges { node {
            id title quantity sku
            variant { id title price }
          } } }
          shippingAddress { name address1 city province country zip }
        }
      }`;
    const data = await admin(query, { id: orderId });
    return { data };
  }
};

function badReq(msg) { const e = new Error(msg); e.status = 400; return e; }
function assertGid(value, name, resource) {
  if (typeof value !== 'string' || !value.startsWith(`gid://shopify/${resource}/`)) {
    throw badReq(`${name} must be a Shopify GID of shape gid://shopify/${resource}/<numeric-id>`);
  }
}
function assertNumString(value, name) {
  if (value == null || !Number.isFinite(Number(value))) {
    throw badReq(`${name} must be a number or numeric string`);
  }
}

/* ---------- handler ---------- */
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return json(res, 405, { error: 'Method not allowed' });
    }

    const sharedSecret = process.env.BT_ADMIN_SHARED_SECRET;
    if (!sharedSecret) return json(res, 500, { error: 'Server misconfigured: BT_ADMIN_SHARED_SECRET not set' });
    const auth = req.headers['x-bt-auth'];
    if (!auth || !timingSafeEqual(auth, sharedSecret)) return json(res, 401, { error: 'Unauthorized' });

    let body;
    try { body = await readBody(req); } catch (e) { return json(res, 400, { error: e.message }); }
    const action = body && body.action;
    const data   = body && body.data || {};
    if (!action || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
      return json(res, 400, { error: 'Unknown action', allowed: Object.keys(ACTIONS) });
    }

    const result = await ACTIONS[action](data);
    return json(res, 200, { ok: true, action, result });
  } catch (err) {
    const status = err.status || 500;
    // Never leak env vars or stack traces to the client.
    const payload = { error: err.message || 'Internal error' };
    if (err.payload && err.payload.errors) payload.details = err.payload.errors;
    return json(res, status, payload);
  }
};
