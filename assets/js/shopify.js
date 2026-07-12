/* =================================================================
   BETTER TAP — Storefront data layer (headless, static-safe)
   ----------------------------------------------------------------
   The ONLY place that talks to Shopify.
   Pinned Storefront API version. Publishable token (browser-safe).
   Exposes on window.BT:
     BT.storefront(query, vars, { cache })
     BT.productByHandle(handle)          BT.productsByTag(tag, first)
     BT.collectionByHandle(handle, first)
     BT.cart.get()  .add(lines)  .update(lines)  .remove(ids)  .reset()
     BT.cart.checkoutUrl()  BT.cart.onChange(fn)
     BT.formatMoney({amount, currencyCode})   BT.numericId(gid)
   The cart drawer + [data-cart-count] + [data-cart-open] are wired
   here so any page that includes this script gets them for free.
   ================================================================= */
(function () {
  'use strict';

  /* ---------- Config (pinned) ---------- */
  var API_VERSION = '2025-07';
  var DOMAIN = 'dqz0fm-jv.myshopify.com';
  var ENDPOINT = 'https://' + DOMAIN + '/api/' + API_VERSION + '/graphql.json';
  var TOKEN = '71b65eca82761a181ff873015953c182'; // publishable Storefront token
  var CART_KEY = 'bt_cart_id';
  var CACHE_TTL_MS = 2 * 60 * 1000;
  var CACHE_PREFIX = 'bt_sf_';

  /* ---------- Tiny cache: in-memory + sessionStorage ---------- */
  var mem = {};
  function cacheGet(key) {
    var v = mem[key];
    var now = Date.now();
    if (v && v.expires > now) return v.value;
    try {
      var raw = sessionStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.expires > now) {
        mem[key] = parsed;
        return parsed.value;
      }
    } catch (e) { /* sessionStorage disabled */ }
    return null;
  }
  function cacheSet(key, value) {
    var record = { value: value, expires: Date.now() + CACHE_TTL_MS };
    mem[key] = record;
    try { sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record)); } catch (e) {}
  }

  /* ---------- storefront(query, vars, {cache}) ----------
     Reads may cache. Mutations pass cache:false. Throws on network/HTTP
     errors; returns data. userErrors are surfaced by callers. */
  function storefront(query, vars, opts) {
    opts = opts || {};
    var key = null;
    if (opts.cache) {
      key = (opts.cacheKey || (query.replace(/\s+/g, ' ') + '|' + JSON.stringify(vars || {}))).slice(0, 400);
      var hit = cacheGet(key);
      if (hit) return Promise.resolve(hit);
    }
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Shopify-Storefront-Access-Token': TOKEN
      },
      body: JSON.stringify({ query: query, variables: vars || {} })
    }).then(function (r) {
      if (!r.ok) throw new Error('Storefront HTTP ' + r.status);
      return r.json();
    }).then(function (json) {
      if (json.errors && json.errors.length) {
        // Surface top-level GraphQL errors; some (like access_denied for one
        // field) still ship data — callers can decide.
        console.warn('[BT.storefront] GraphQL errors:', json.errors);
      }
      if (opts.cache && json.data) cacheSet(key, json.data);
      return json.data;
    });
  }

  /* ---------- Catalog reads ---------- */
  var Q_PRODUCT_BY_HANDLE = [
    'query P($handle:String!) {',
    '  productByHandle(handle:$handle) {',
    '    id handle title descriptionHtml productType tags availableForSale',
    '    featuredImage { url altText width height }',
    '    images(first:10) { edges { node { url altText width height } } }',
    '    options { id name values }',
    '    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }',
    '    variants(first:50) { edges { node {',
    '      id title sku availableForSale',
    '      price { amount currencyCode }',
    '      compareAtPrice { amount currencyCode }',
    '      selectedOptions { name value }',
    '      image { url altText width height }',
    '    } } }',
    '    sellingPlanGroups(first:5) { edges { node {',
    '      name appName',
    '      sellingPlans(first:10) { edges { node { id name recurringDeliveries } } }',
    '    } } }',
    '  }',
    '}'
  ].join('\n');

  function productByHandle(handle) {
    return storefront(Q_PRODUCT_BY_HANDLE, { handle: handle }, { cache: true, cacheKey: 'p:' + handle })
      .then(function (d) { return flattenProduct(d && d.productByHandle); });
  }

  var Q_COLLECTION_BY_HANDLE = [
    'query C($handle:String!, $first:Int!) {',
    '  collectionByHandle(handle:$handle) {',
    '    id handle title descriptionHtml',
    '    products(first:$first) { edges { node {',
    '      id handle title tags availableForSale',
    '      featuredImage { url altText width height }',
    '      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }',
    '      variants(first:10) { edges { node {',
    '        id title sku availableForSale price { amount currencyCode } compareAtPrice { amount currencyCode }',
    '        selectedOptions { name value }',
    '      } } }',
    '    } } }',
    '  }',
    '}'
  ].join('\n');

  function collectionByHandle(handle, first) {
    return storefront(Q_COLLECTION_BY_HANDLE, { handle: handle, first: first || 20 }, { cache: true, cacheKey: 'c:' + handle + ':' + (first || 20) })
      .then(function (d) {
        var col = d && d.collectionByHandle;
        if (!col) return null;
        col.products = (col.products.edges || []).map(function (e) { return flattenProduct(e.node); });
        return col;
      });
  }

  var Q_PRODUCTS_BY_QUERY = [
    'query PQ($query:String!, $first:Int!) {',
    '  products(first:$first, query:$query) { edges { node {',
    '    id handle title tags availableForSale',
    '    featuredImage { url altText width height }',
    '    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }',
    '    variants(first:10) { edges { node {',
    '      id title sku availableForSale price { amount currencyCode } compareAtPrice { amount currencyCode }',
    '      selectedOptions { name value }',
    '    } } }',
    '  } } }',
    '}'
  ].join('\n');

  function productsByTag(tag, first) {
    var q = 'tag:' + JSON.stringify(tag).replace(/^"|"$/g, '');
    return storefront(Q_PRODUCTS_BY_QUERY, { query: q, first: first || 20 }, { cache: true, cacheKey: 'q:' + q + ':' + (first || 20) })
      .then(function (d) {
        var arr = (d && d.products && d.products.edges) || [];
        return arr.map(function (e) { return flattenProduct(e.node); });
      });
  }

  function productsByQuery(query, first) {
    return storefront(Q_PRODUCTS_BY_QUERY, { query: query, first: first || 20 }, { cache: true, cacheKey: 'q:' + query + ':' + (first || 20) })
      .then(function (d) {
        var arr = (d && d.products && d.products.edges) || [];
        return arr.map(function (e) { return flattenProduct(e.node); });
      });
  }

  /* Flatten Shopify edges into plain arrays and pick a default variant. */
  function flattenProduct(p) {
    if (!p) return null;
    var out = {
      id: p.id, handle: p.handle, title: p.title,
      descriptionHtml: p.descriptionHtml || '',
      productType: p.productType, tags: p.tags || [],
      availableForSale: !!p.availableForSale,
      featuredImage: p.featuredImage || null,
      images: (p.images && p.images.edges || []).map(function (e) { return e.node; }),
      options: p.options || [],
      priceRange: p.priceRange || null,
      variants: (p.variants && p.variants.edges || []).map(function (e) { return e.node; }),
      sellingPlans: []
    };
    if (p.sellingPlanGroups && p.sellingPlanGroups.edges) {
      p.sellingPlanGroups.edges.forEach(function (ge) {
        var g = ge.node;
        (g.sellingPlans.edges || []).forEach(function (spe) {
          out.sellingPlans.push({ id: spe.node.id, name: spe.node.name, recurring: !!spe.node.recurringDeliveries, group: g.name });
        });
      });
    }
    return out;
  }

  /* Pick the first available variant matching a set of option selections
     e.g. variantFor(product, { Color: 'White' }) — case-insensitive. */
  function variantFor(product, selections) {
    if (!product || !product.variants) return null;
    var keys = Object.keys(selections || {});
    if (!keys.length) return product.variants[0] || null;
    var target = keys.reduce(function (acc, k) { acc[k.toLowerCase()] = String(selections[k]).toLowerCase(); return acc; }, {});
    var match = product.variants.filter(function (v) {
      return v.selectedOptions.every(function (o) {
        var want = target[o.name.toLowerCase()];
        return want === undefined || want === String(o.value).toLowerCase();
      });
    });
    return match[0] || null;
  }

  /* ---------- Cart API ---------- */
  var Q_CART = [
    'fragment CartFields on Cart {',
    '  id checkoutUrl createdAt updatedAt totalQuantity',
    '  cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } totalTaxAmount { amount currencyCode } }',
    '  lines(first:50) { edges { node {',
    '    id quantity',
    '    cost { totalAmount { amount currencyCode } amountPerQuantity { amount currencyCode } }',
    '    sellingPlanAllocation { sellingPlan { id name } }',
    '    merchandise { ... on ProductVariant {',
    '      id title sku availableForSale image { url altText }',
    '      price { amount currencyCode }',
    '      product { handle title }',
    '      selectedOptions { name value }',
    '    } }',
    '  } } }',
    '}'
  ].join('\n');

  var M_CART_CREATE = 'mutation CC($lines:[CartLineInput!]) { cartCreate(input:{lines:$lines}) { cart { ...CartFields } userErrors { field message code } } }\n' + Q_CART;
  var M_CART_ADD    = 'mutation CA($cartId:ID!, $lines:[CartLineInput!]!) { cartLinesAdd(cartId:$cartId, lines:$lines) { cart { ...CartFields } userErrors { field message code } } }\n' + Q_CART;
  var M_CART_UPD    = 'mutation CU($cartId:ID!, $lines:[CartLineUpdateInput!]!) { cartLinesUpdate(cartId:$cartId, lines:$lines) { cart { ...CartFields } userErrors { field message code } } }\n' + Q_CART;
  var M_CART_RM     = 'mutation CR($cartId:ID!, $lineIds:[ID!]!) { cartLinesRemove(cartId:$cartId, lineIds:$lineIds) { cart { ...CartFields } userErrors { field message code } } }\n' + Q_CART;
  var Q_CART_GET    = 'query CG($cartId:ID!) { cart(id:$cartId) { ...CartFields } }\n' + Q_CART;

  var cartState = null;
  var cartListeners = [];
  function fireChange() { cartListeners.forEach(function (fn) { try { fn(cartState); } catch (e) {} }); renderCount(); }

  function loadStoredCartId() {
    try { return localStorage.getItem(CART_KEY) || null; } catch (e) { return null; }
  }
  function saveCartId(id) {
    try { if (id) localStorage.setItem(CART_KEY, id); else localStorage.removeItem(CART_KEY); } catch (e) {}
  }

  function normalizeCart(c) {
    if (!c) return null;
    var lines = (c.lines && c.lines.edges || []).map(function (e) {
      var l = e.node;
      var m = l.merchandise || {};
      return {
        id: l.id,
        quantity: l.quantity,
        totalAmount: l.cost && l.cost.totalAmount,
        merchandise: {
          id: m.id, title: m.title, sku: m.sku,
          availableForSale: m.availableForSale,
          image: m.image, price: m.price,
          product: m.product,
          selectedOptions: m.selectedOptions || []
        },
        sellingPlan: l.sellingPlanAllocation && l.sellingPlanAllocation.sellingPlan || null
      };
    });
    return {
      id: c.id, checkoutUrl: c.checkoutUrl,
      totalQuantity: c.totalQuantity || 0,
      cost: c.cost || null,
      lines: lines
    };
  }

  function handleCartMutation(payload, mutationName) {
    if (!payload) throw new Error('Empty cart response');
    var envelope = payload[mutationName] || payload;
    var errors = (envelope && envelope.userErrors) || [];
    if (errors.length) console.warn('[BT.cart] userErrors', errors);
    var cart = envelope && envelope.cart;
    if (!cart) throw new Error('No cart returned (' + mutationName + ')');
    cartState = normalizeCart(cart);
    saveCartId(cartState.id);
    fireChange();
    return cartState;
  }

  function cartCreate(lines) {
    return storefront(M_CART_CREATE, { lines: lines || [] }, { cache: false })
      .then(function (d) { return handleCartMutation(d, 'cartCreate'); });
  }
  function cartAdd(lines) {
    return ensureCart().then(function (c) {
      return storefront(M_CART_ADD, { cartId: c.id, lines: lines }, { cache: false })
        .then(function (d) { return handleCartMutation(d, 'cartLinesAdd'); });
    });
  }
  function cartUpdate(lines) {
    return ensureCart().then(function (c) {
      return storefront(M_CART_UPD, { cartId: c.id, lines: lines }, { cache: false })
        .then(function (d) { return handleCartMutation(d, 'cartLinesUpdate'); });
    });
  }
  function cartRemove(lineIds) {
    return ensureCart().then(function (c) {
      return storefront(M_CART_RM, { cartId: c.id, lineIds: lineIds }, { cache: false })
        .then(function (d) { return handleCartMutation(d, 'cartLinesRemove'); });
    });
  }
  function cartFetch(id) {
    return storefront(Q_CART_GET, { cartId: id }, { cache: false })
      .then(function (d) { return d && d.cart ? normalizeCart(d.cart) : null; });
  }
  function ensureCart() {
    if (cartState && cartState.checkoutUrl) return Promise.resolve(cartState);
    var stored = loadStoredCartId();
    if (stored) {
      return cartFetch(stored).then(function (c) {
        if (c && c.checkoutUrl) { cartState = c; fireChange(); return c; }
        saveCartId(null);
        return cartCreate([]);
      }).catch(function () { saveCartId(null); return cartCreate([]); });
    }
    return cartCreate([]);
  }
  function cartReset() { saveCartId(null); cartState = null; fireChange(); return cartCreate([]); }

  function onChange(fn) {
    cartListeners.push(fn);
    // Fire once with current state (even if null → 0).
    try { fn(cartState); } catch (e) {}
    return function off() { cartListeners = cartListeners.filter(function (x) { return x !== fn; }); };
  }

  /* ---------- Helpers ---------- */
  function numericId(gid) { return String(gid || '').split('/').pop(); }
  function formatMoney(m) {
    if (!m) return '';
    var currency = m.currencyCode || 'USD';
    var amt = Number(m.amount || 0);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency', currency: currency,
        minimumFractionDigits: Math.floor(amt) === amt ? 0 : 2,
        maximumFractionDigits: 2
      }).format(amt);
    } catch (e) { return '$' + amt.toFixed(2); }
  }

  /* ---------- Cart count badge auto-hydrate ---------- */
  function renderCount() {
    var n = (cartState && cartState.totalQuantity) || 0;
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(n);
      if (el.parentElement) el.parentElement.style.display = n ? '' : '';
    });
  }

  /* ---------- Cart drawer (self-mounts) ---------- */
  var drawer = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    injectStyles();
    drawer = document.createElement('div');
    drawer.className = 'bt-cart';
    drawer.innerHTML =
      '<div class="bt-cart__scrim" data-cart-close></div>' +
      '<aside class="bt-cart__panel" role="dialog" aria-label="Cart">' +
        '<header class="bt-cart__head"><strong>Your cart</strong>' +
        '<button class="bt-cart__x" data-cart-close aria-label="Close">×</button></header>' +
        '<div class="bt-cart__items" data-cart-items></div>' +
        '<footer class="bt-cart__foot">' +
          '<div class="bt-cart__sub"><span>Subtotal</span><span data-cart-sub>—</span></div>' +
          '<a class="btn btn--primary btn--lg btn--block" data-cart-checkout href="#">Checkout →</a>' +
          '<p class="bt-cart__note">Taxes &amp; shipping calculated at checkout.</p>' +
        '</footer>' +
      '</aside>';
    document.body.appendChild(drawer);
    drawer.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-cart-close')) closeDrawer();
    });
    drawer.querySelector('[data-cart-checkout]').addEventListener('click', function (e) {
      e.preventDefault();
      if (cartState && cartState.checkoutUrl) window.location.href = cartState.checkoutUrl;
    });
    renderDrawer();
    return drawer;
  }
  function renderDrawer() {
    if (!drawer) return;
    var items = (cartState && cartState.lines) || [];
    var box = drawer.querySelector('[data-cart-items]');
    if (!items.length) {
      box.innerHTML = '<p class="bt-cart__empty">Your cart is empty.</p>';
    } else {
      box.innerHTML = items.map(function (l) {
        var m = l.merchandise || {};
        var img = m.image ? '<img src="' + m.image.url + '" alt="">' : '<span class="bt-cart__ph"></span>';
        var opts = (m.selectedOptions || []).map(function (o) { return o.value; }).join(' · ');
        var planName = l.sellingPlan ? ' · ' + l.sellingPlan.name : '';
        var line = l.totalAmount ? formatMoney(l.totalAmount) : formatMoney(m.price);
        return '<div class="bt-cart__row" data-id="' + l.id + '">' + img +
          '<div class="bt-cart__meta"><strong>' + escapeHTML(m.product && m.product.title || m.title) + '</strong>' +
          '<small>' + escapeHTML(opts + planName) + '</small>' +
          '<div class="bt-cart__qty"><button data-q="-">−</button><span>' + l.quantity + '</span><button data-q="+">+</button>' +
          '<button class="bt-cart__rm" data-q="x">Remove</button></div></div>' +
          '<span class="bt-cart__price">' + line + '</span></div>';
      }).join('');
      box.querySelectorAll('[data-q]').forEach(function (b) {
        b.addEventListener('click', function () {
          var row = b.closest('[data-id]');
          var id = row.getAttribute('data-id');
          var line = ((cartState && cartState.lines) || []).filter(function (x) { return x.id === id; })[0];
          if (!line) return;
          var op = b.getAttribute('data-q');
          if (op === 'x') cartRemove([id]);
          else cartUpdate([{ id: id, quantity: Math.max(0, line.quantity + (op === '+' ? 1 : -1)) }]);
        });
      });
    }
    var sub = drawer.querySelector('[data-cart-sub]');
    var subtotal = cartState && cartState.cost && cartState.cost.subtotalAmount;
    sub.textContent = subtotal ? formatMoney(subtotal) : '—';
    var checkoutBtn = drawer.querySelector('[data-cart-checkout]');
    if (cartState && cartState.checkoutUrl) {
      checkoutBtn.setAttribute('href', cartState.checkoutUrl);
      checkoutBtn.classList.remove('is-disabled');
    } else {
      checkoutBtn.setAttribute('href', '#');
      checkoutBtn.classList.add('is-disabled');
    }
  }
  function openDrawer() { ensureDrawer(); drawer.classList.add('open'); document.body.classList.add('bt-cart-open'); renderDrawer(); }
  function closeDrawer() { if (drawer) drawer.classList.remove('open'); document.body.classList.remove('bt-cart-open'); }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Styles (matches existing brand tokens) ---------- */
  function injectStyles() {
    if (document.getElementById('bt-cart-css')) return;
    var css = document.createElement('style'); css.id = 'bt-cart-css';
    css.textContent =
      '.bt-cart{position:fixed;inset:0;z-index:1000;visibility:hidden;}' +
      '.bt-cart.open{visibility:visible;}' +
      '.bt-cart__scrim{position:absolute;inset:0;background:rgba(10,16,32,.5);opacity:0;transition:.3s;}' +
      '.bt-cart.open .bt-cart__scrim{opacity:1;}' +
      '.bt-cart__panel{position:absolute;top:0;right:0;height:100%;width:min(420px,92vw);background:#fff;display:flex;flex-direction:column;transform:translateX(100%);transition:.32s cubic-bezier(.4,0,.2,1);box-shadow:-10px 0 40px rgba(10,16,32,.18);}' +
      '.bt-cart.open .bt-cart__panel{transform:none;}' +
      '.bt-cart__head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eef0f4;font-size:18px;}' +
      '.bt-cart__x{font-size:26px;line-height:1;background:none;border:0;cursor:pointer;color:#141937;}' +
      '.bt-cart__items{flex:1;overflow:auto;padding:8px 20px;}' +
      '.bt-cart__empty{color:#6b7280;padding:40px 0;text-align:center;}' +
      '.bt-cart__row{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:start;padding:16px 0;border-bottom:1px solid #f1f2f6;}' +
      '.bt-cart__row img,.bt-cart__ph{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f4f4f4;display:block;}' +
      '.bt-cart__meta strong{display:block;font-size:14px;color:#141937;}' +
      '.bt-cart__meta small{color:#8a90a0;}' +
      '.bt-cart__qty{display:flex;align-items:center;gap:8px;margin-top:8px;}' +
      '.bt-cart__qty button{width:26px;height:26px;border:1px solid #d8dbe4;border-radius:7px;background:#fff;cursor:pointer;font-size:15px;}' +
      '.bt-cart__rm{width:auto!important;border:0!important;color:#009CA7;font-size:12px;margin-left:4px;}' +
      '.bt-cart__price{font-weight:600;color:#141937;font-variant-numeric:tabular-nums;}' +
      '.bt-cart__foot{padding:18px 20px;border-top:1px solid #eef0f4;}' +
      '.bt-cart__sub{display:flex;justify-content:space-between;font-weight:700;color:#141937;margin-bottom:12px;font-variant-numeric:tabular-nums;}' +
      '.bt-cart__note{color:#8a90a0;font-size:12px;text-align:center;margin-top:8px;}' +
      '.is-disabled{pointer-events:none;opacity:.5;}' +
      'body.bt-cart-open{overflow:hidden;}';
    document.head.appendChild(css);
  }

  /* ---------- Auto-wire [data-cart-open] on any page ---------- */
  function wireGlobal() {
    document.addEventListener('click', function (e) {
      var opener = e.target && e.target.closest && e.target.closest('[data-cart-open]');
      if (opener) { e.preventDefault(); openDrawer(); return; }
    });
    // Hydrate the badge from a stored cart if any (no forced create).
    var stored = loadStoredCartId();
    if (stored) {
      cartFetch(stored).then(function (c) {
        if (c && c.checkoutUrl) { cartState = c; fireChange(); }
        else { saveCartId(null); renderCount(); }
      }).catch(function () { renderCount(); });
    } else {
      renderCount();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireGlobal);
  else wireGlobal();

  /* ---------- Public API ---------- */
  window.BT = window.BT || {};
  window.BT.config = { apiVersion: API_VERSION, domain: DOMAIN, endpoint: ENDPOINT };
  window.BT.storefront = storefront;
  window.BT.productByHandle = productByHandle;
  window.BT.collectionByHandle = collectionByHandle;
  window.BT.productsByTag = productsByTag;
  window.BT.productsByQuery = productsByQuery;
  window.BT.variantFor = variantFor;
  window.BT.formatMoney = formatMoney;
  window.BT.numericId = numericId;
  window.BT.cart = {
    get: function () { return cartState; },
    ensure: ensureCart,
    fetch: function () { var id = loadStoredCartId(); return id ? cartFetch(id) : Promise.resolve(null); },
    add: cartAdd,
    update: cartUpdate,
    remove: cartRemove,
    reset: cartReset,
    checkoutUrl: function () { return cartState && cartState.checkoutUrl; },
    onChange: onChange,
    open: openDrawer,
    close: closeDrawer
  };
  console.info('[BT] Storefront data layer loaded (' + API_VERSION + ').');
})();
