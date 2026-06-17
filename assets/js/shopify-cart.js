/* =================================================================
   BETTER TAP — Shopify storefront commerce (headless, static-safe)
   Real cart + Shopify-hosted checkout via the JS Buy SDK.
   The Storefront token is PUBLISHABLE — safe to ship in page JS.
   Until DOMAIN/TOKEN are filled, the site keeps its demo behavior.
   ----------------------------------------------------------------
   SETUP (see SHOPIFY-SETUP.md):
   1. Shopify admin → Develop apps → create app → enable Storefront API
      scopes → install → copy the Storefront access token.
   2. Fill SHOPIFY.domain (your *.myshopify.com) and SHOPIFY.token below.
   3. Confirm the variant IDs in PRODUCTS match your store.
   ================================================================= */
(function () {
  'use strict';

  /* ---------- CONFIG — fill these two ---------- */
  var SHOPIFY = {
    domain: 'dqz0fm-jv.myshopify.com',           // ✅ your *.myshopify.com domain (confirmed)
    token:  '71b65eca82761a181ff873015953c182'  // Storefront API public token (publishable)
  };

  /* ---------- Product → variant map (GIDs from your store) ---------- */
  // Machine resolves by selected color swatch; others are single-variant.
  var PRODUCTS = {
    'machine-white': 'gid://shopify/ProductVariant/48528551117049', // Water Bar White  $1,150.52
    'machine-black': 'gid://shopify/ProductVariant/48528551149817', // Water Bar Black  $1,150.52
    'bundle-white':  'gid://shopify/ProductVariant/48528551248121', // Water Bar + 1yr filter White $1,275
    'bundle-black':  'gid://shopify/ProductVariant/48528551280889', // Water Bar + 1yr filter Black $1,275
    'filter':        'gid://shopify/ProductVariant/48538309886201', // MAZE Water Filter $89
    'uv':            'gid://shopify/ProductVariant/48538309918969', // UV Lamp $59
    'bundle-fu':     'gid://shopify/ProductVariant/48538309951737', // Filter + UV Bundle $129
    'filter-sub':    'gid://shopify/ProductVariant/48528551215353', // MAZE Filter Subscription (annual) $140
    'reservation':   'gid://shopify/ProductVariant/48528551313657', // Reservation Deposit $99
    'install':       'gid://shopify/ProductVariant/48528551510265', // Standard Installation $199
    'sabbath':       'gid://shopify/ProductVariant/48528551575801', // Sabbath Setup $50
    'cabinet':       'gid://shopify/ProductVariant/48528551608569', // Cabinet Mod $199
    'warranty':      'gid://shopify/ProductVariant/48528551641337'  // 5-Year Warranty $199
  };

  /* The legacy Buy SDK checkout API (checkoutCreate) is removed from the current Storefront API,
     so we use robust Shopify CART PERMALINKS → real hosted checkout on the Shopify apex domain.
     (Token is kept above for a future Cart-API in-page drawer.) */
  var ENABLED = false;
  if (!ENABLED) {
    /* Checkout LIVE via Shopify cart permalinks — real hosted checkout, real orders,
       native inventory decrement. drinkbettertap.com stays on Shopify (subdomain split). */
    var STORE = 'dqz0fm-jv.myshopify.com';
    var numId = function (gid) { return String(gid).split('/').pop(); };
    var permalink = function (gid, q) { return 'https://' + STORE + '/cart/' + numId(gid) + ':' + (q || 1); };
    var machineColorP = function () {
      var sw = document.querySelector('[data-swatches] .swatch.active');
      var name = (sw && (sw.getAttribute('data-name') || '')).toLowerCase();
      return name.indexOf('black') !== -1 ? 'black' : 'white';
    };
    var keyFor = function (b) {
      var key = b.getAttribute('data-bt-variant');
      if (key === 'machine') key = 'machine-' + machineColorP();
      if (key === 'bundle') key = 'bundle-' + machineColorP();
      return PRODUCTS[key] || null;
    };
    document.querySelectorAll('[data-buy-now]').forEach(function (b) {
      var go = function () { return permalink(PRODUCTS['machine-' + machineColorP()], 1); };
      b.setAttribute('href', go());
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); window.location.href = go(); }, true);
    });
    document.querySelectorAll('[data-add-cart]').forEach(function (b) {
      b.addEventListener('click', function (e) { var v = keyFor(b); if (!v) return; e.preventDefault(); e.stopImmediatePropagation(); window.location.href = permalink(v, 1); }, true);
    });
    console.info('[BetterTap] Checkout LIVE via Shopify cart permalinks. Add a Storefront token in shopify-cart.js for the in-page cart drawer.');
    return;
  }

  var SDK = 'https://sdks.shopifycdn.com/js-buy-sdk/v2/latest/index.umd.min.js';
  var client, checkout, LS = 'bt_checkout_id';

  /* ---------- helpers ---------- */
  function money(n){ return '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits:2}); }
  function machineColor(){
    var sw = document.querySelector('[data-swatches] .swatch.active');
    var name = (sw && (sw.dataset.name||'')).toLowerCase();
    return name.indexOf('black') !== -1 ? 'black' : 'white';
  }
  function variantFor(btn){
    var key = btn.getAttribute('data-bt-variant');
    if (!key) return null;
    if (key === 'machine') key = 'machine-' + machineColor();
    if (key === 'bundle')  key = 'bundle-'  + machineColor();
    return PRODUCTS[key] || null;
  }

  /* ---------- boot the SDK + restore/create cart ---------- */
  function boot(){
    client = ShopifyBuy.buildClient({ domain: SHOPIFY.domain, storefrontAccessToken: SHOPIFY.token });
    var saved = null; try { saved = localStorage.getItem(LS); } catch(e){}
    var ready = saved
      ? client.checkout.fetch(saved).then(function(c){ return (c && !c.completedAt) ? c : client.checkout.create(); })
      : client.checkout.create();
    ready.then(function(c){
      checkout = c;
      try { localStorage.setItem(LS, c.id); } catch(e){}
      renderCount(); buildDrawer(); wire();
    }).catch(function(err){ console.error('[BetterTap] Shopify init failed', err); });
  }

  /* ---------- cart count badge (reuses existing [data-cart-count]) ---------- */
  function count(){ return (checkout && checkout.lineItems || []).reduce(function(n,l){return n+l.quantity;},0); }
  function renderCount(){
    var el = document.querySelector('[data-cart-count]');
    if (el){ el.textContent = count(); if (el.parentElement) el.parentElement.style.display = count() ? 'grid' : ''; }
  }

  /* ---------- add to cart ---------- */
  function add(variantId, qty){
    if (!variantId) return Promise.resolve();
    return client.checkout.addLineItems(checkout.id, [{ variantId: variantId, quantity: qty||1 }])
      .then(function(c){ checkout = c; renderCount(); drawerRender(); openDrawer(); });
  }

  /* ---------- slide-out drawer ---------- */
  var drawer;
  function buildDrawer(){
    drawer = document.createElement('div');
    drawer.className = 'bt-cart';
    drawer.innerHTML =
      '<div class="bt-cart__scrim" data-cart-close></div>' +
      '<aside class="bt-cart__panel" role="dialog" aria-label="Cart">' +
        '<header class="bt-cart__head"><strong>Your cart</strong>' +
        '<button class="bt-cart__x" data-cart-close aria-label="Close">×</button></header>' +
        '<div class="bt-cart__items" data-cart-items></div>' +
        '<footer class="bt-cart__foot">' +
          '<div class="bt-cart__sub"><span>Subtotal</span><span data-cart-sub>$0.00</span></div>' +
          '<a class="btn btn--primary btn--lg btn--block" data-cart-checkout href="#">Checkout →</a>' +
          '<p class="bt-cart__note">Taxes &amp; shipping calculated at checkout.</p>' +
        '</footer>' +
      '</aside>';
    document.body.appendChild(drawer);
    drawer.addEventListener('click', function(e){
      if (e.target.hasAttribute('data-cart-close')) closeDrawer();
    });
    drawer.querySelector('[data-cart-checkout]').addEventListener('click', function(e){
      e.preventDefault();
      if (checkout && checkout.webUrl) window.location.href = checkout.webUrl;
    });
    injectStyles();
    drawerRender();
  }
  function drawerRender(){
    if (!drawer) return;
    var box = drawer.querySelector('[data-cart-items]');
    var items = (checkout && checkout.lineItems) || [];
    if (!items.length){ box.innerHTML = '<p class="bt-cart__empty">Your cart is empty.</p>'; }
    else {
      box.innerHTML = items.map(function(l){
        var img = l.variant && l.variant.image ? '<img src="'+l.variant.image.src+'" alt="">' : '<span class="bt-cart__ph"></span>';
        return '<div class="bt-cart__row" data-id="'+l.id+'">'+img+
          '<div class="bt-cart__meta"><strong>'+l.title+'</strong>'+
          '<small>'+(l.variant?l.variant.title:'')+'</small>'+
          '<div class="bt-cart__qty"><button data-q="-">−</button><span>'+l.quantity+'</span><button data-q="+">+</button>'+
          '<button class="bt-cart__rm" data-q="x">Remove</button></div></div>'+
          '<span class="bt-cart__price">'+money(l.variant?l.variant.price.amount*l.quantity:0)+'</span></div>';
      }).join('');
      box.querySelectorAll('[data-q]').forEach(function(b){
        b.addEventListener('click', function(){
          var row = b.closest('[data-id]'), id = row.getAttribute('data-id');
          var li = items.filter(function(x){return x.id==id;})[0]; if(!li) return;
          var op = b.getAttribute('data-q');
          if (op==='x') update(id, 0);
          else update(id, Math.max(0, li.quantity + (op==='+'?1:-1)));
        });
      });
    }
    var sub = (checkout && checkout.subtotalPrice) ? checkout.subtotalPrice.amount : 0;
    drawer.querySelector('[data-cart-sub]').textContent = money(sub);
  }
  function update(id, qty){
    var p = qty>0 ? client.checkout.updateLineItems(checkout.id, [{id:id, quantity:qty}])
                  : client.checkout.removeLineItems(checkout.id, [id]);
    p.then(function(c){ checkout=c; renderCount(); drawerRender(); });
  }
  function openDrawer(){ if(drawer) drawer.classList.add('open'); document.body.classList.add('bt-cart-open'); }
  function closeDrawer(){ if(drawer) drawer.classList.remove('open'); document.body.classList.remove('bt-cart-open'); }

  /* ---------- wire existing buttons ---------- */
  function wire(){
    // Add to cart
    document.querySelectorAll('[data-add-cart]').forEach(function(b){
      b.addEventListener('click', function(e){
        var v = variantFor(b); if(!v) return;            // unknown product → leave as-is
        e.preventDefault(); e.stopImmediatePropagation();
        var qEl = document.querySelector('[data-qty] span');
        add(v, qEl ? parseInt(qEl.textContent,10) : 1);
      }, true);
    });
    // Buy now → add then go straight to Shopify hosted checkout
    document.querySelectorAll('[data-buy-now]').forEach(function(b){
      b.addEventListener('click', function(e){
        var v = PRODUCTS['machine-'+machineColor()];
        e.preventDefault(); e.stopImmediatePropagation();
        add(v,1).then(function(){ if(checkout && checkout.webUrl) window.location.href = checkout.webUrl; });
      }, true);
    });
    // Open cart from the persistent buy bar / any [data-cart-open]
    document.querySelectorAll('[data-cart-open]').forEach(function(b){
      b.addEventListener('click', function(e){ e.preventDefault(); drawerRender(); openDrawer(); });
    });
  }

  /* ---------- minimal drawer styles (brand tokens) ---------- */
  function injectStyles(){
    if (document.getElementById('bt-cart-css')) return;
    var css = document.createElement('style'); css.id='bt-cart-css';
    css.textContent =
      '.bt-cart{position:fixed;inset:0;z-index:1000;visibility:hidden;}'+
      '.bt-cart.open{visibility:visible;}'+
      '.bt-cart__scrim{position:absolute;inset:0;background:rgba(10,16,32,.5);opacity:0;transition:.3s;}'+
      '.bt-cart.open .bt-cart__scrim{opacity:1;}'+
      '.bt-cart__panel{position:absolute;top:0;right:0;height:100%;width:min(420px,92vw);background:#fff;display:flex;flex-direction:column;transform:translateX(100%);transition:.32s cubic-bezier(.4,0,.2,1);box-shadow:-10px 0 40px rgba(10,16,32,.18);}'+
      '.bt-cart.open .bt-cart__panel{transform:none;}'+
      '.bt-cart__head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #eef0f4;font-size:18px;}'+
      '.bt-cart__x{font-size:26px;line-height:1;background:none;border:0;cursor:pointer;color:#141937;}'+
      '.bt-cart__items{flex:1;overflow:auto;padding:8px 20px;}'+
      '.bt-cart__empty{color:#6b7280;padding:40px 0;text-align:center;}'+
      '.bt-cart__row{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:start;padding:16px 0;border-bottom:1px solid #f1f2f6;}'+
      '.bt-cart__row img,.bt-cart__ph{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#f4f4f4;display:block;}'+
      '.bt-cart__meta strong{display:block;font-size:14px;color:#141937;}'+
      '.bt-cart__meta small{color:#8a90a0;}'+
      '.bt-cart__qty{display:flex;align-items:center;gap:8px;margin-top:8px;}'+
      '.bt-cart__qty button{width:26px;height:26px;border:1px solid #d8dbe4;border-radius:7px;background:#fff;cursor:pointer;font-size:15px;}'+
      '.bt-cart__rm{width:auto!important;border:0!important;color:#009CA7;font-size:12px;margin-left:4px;}'+
      '.bt-cart__price{font-weight:600;color:#141937;font-variant-numeric:tabular-nums;}'+
      '.bt-cart__foot{padding:18px 20px;border-top:1px solid #eef0f4;}'+
      '.bt-cart__sub{display:flex;justify-content:space-between;font-weight:700;color:#141937;margin-bottom:12px;font-variant-numeric:tabular-nums;}'+
      '.bt-cart__note{color:#8a90a0;font-size:12px;text-align:center;margin-top:8px;}'+
      'body.bt-cart-open{overflow:hi