/* ============================================================================
   Better Tap — Customer Account portal (front-end DEMO logic)
   Renders the signed-in dashboard from the localStorage demo backend
   (account-backend.js). Not real auth / not real data.
   ============================================================================ */
(function () {
  'use strict';
  var API = window.BT_ACCT;
  var el = function (id) { return document.getElementById(id); };
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- config ---- */
  var SITE = 'https://www.drinkbettertap.com';
  var WHATSAPP_URL = 'https://wa.me/15551234567'; // TODO: replace with real BetterTap WhatsApp number
  var SOCIAL = [
    { k: 'instagram', url: 'https://instagram.com/drinkbettertap', path: 'M3 3h18v18H3zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17 6.5h.01' },
    { k: 'tiktok', url: 'https://tiktok.com/@bettertap8', path: 'M16 3c.3 2 1.6 3.6 3.6 3.9V10c-1.4 0-2.7-.4-3.6-1.1V15a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3a2.5 2.5 0 1 0 1.7 2.4V3H16z' },
    { k: 'youtube', url: 'https://youtube.com/@bettertap', path: 'M22 12s0-3-.4-4.3a2.5 2.5 0 0 0-1.8-1.8C18.4 5.5 12 5.5 12 5.5s-6.4 0-7.8.4A2.5 2.5 0 0 0 2.4 7.7C2 9 2 12 2 12s0 3 .4 4.3a2.5 2.5 0 0 0 1.8 1.8c1.4.4 7.8.4 7.8.4s6.4 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8C22 15 22 12 22 12zM10 15V9l5 3-5 3z' },
    { k: 'linkedin', url: 'https://linkedin.com/company/bettertap', path: 'M6.94 8.5H4.5V20h2.44V8.5zM5.72 4.5a1.42 1.42 0 1 0 0 2.83 1.42 1.42 0 0 0 0-2.83zM20 13.6c0-2.6-1.39-3.81-3.24-3.81-1.5 0-2.17.83-2.54 1.41V8.5h-2.44V20h2.44v-6.1c0-.32.02-.64.12-.87.26-.63.85-1.29 1.84-1.29 1.3 0 1.82.99 1.82 2.43V20H20z' },
    { k: 'facebook', url: 'https://www.facebook.com/profile.php?id=61590563500767', path: 'M13 22v-8h3l.5-3H13V9c0-.9.3-1.5 1.6-1.5H17V5c-.3 0-1.3-.1-2.4-.1C12.3 4.9 11 6.3 11 8.7V11H8v3h3v8h2z' },
    { k: 'x', url: 'https://x.com/drinkbettertap', path: 'M17.53 3H20l-5.46 6.24L21 21h-5.1l-4-5.2L7.3 21H4.8l5.84-6.67L4 3h5.23l3.62 4.78L17.53 3z' }
  ];

  /* ---- session gate ---- */
  var session = API.auth.getSession();
  if (!session) { location.replace('index.html'); return; }
  var me = API.getCustomer(session.id);
  if (!me) { API.auth.signOut(); location.replace('index.html'); return; }

  var ICON = {
    profile: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    machine: 'M4 7h16v13H4zM8 7V4h8v3M9 11h6M9 15h6',
    orders: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    subscription: 'M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16',
    addresses: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    accessories: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
    service: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    guides: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z'
  };
  var SECTIONS = [
    { key: 'profile', label: 'Profile' },
    { key: 'machine', label: 'My BetterTap' },
    { key: 'orders', label: 'Orders' },
    { key: 'subscription', label: 'Subscription & Filters' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'accessories', label: 'Accessories' },
    { key: 'service', label: 'Service requests' },
    { key: 'guides', label: 'Guides' }
  ];

  /* ---- toast + lightbox ---- */
  var toastTimer;
  function toast(msg) {
    var t = el('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  var lb;
  function lightbox(src) {
    if (!lb) {
      lb = document.createElement('div'); lb.className = 'lightbox';
      lb.innerHTML = '<button class="close" aria-label="Close">&times;</button><img alt="">';
      document.body.appendChild(lb);
      lb.addEventListener('click', function () { lb.classList.remove('open'); });
    }
    lb.querySelector('img').src = src; lb.classList.add('open');
  }

  /* ---- appbar / user menu ---- */
  function initials(name) {
    var p = (name || me.email).trim().split(/\s+/);
    var a = (p[0] || '')[0] || '', b = p[1] ? p[1][0] : '';
    return (a + b).toUpperCase();
  }
  function renderUser() {
    el('avatarInitials').textContent = initials(me.full_name) || me.email[0].toUpperCase();
    el('avatarName').textContent = (me.full_name || me.email).split(' ')[0];
    el('menuName').textContent = me.full_name || '—';
    el('menuEmail').textContent = me.email;
  }
  el('avatarBtn').addEventListener('click', function (e) { e.stopPropagation(); el('userMenu').classList.toggle('open'); });
  document.addEventListener('click', function () { el('userMenu').classList.remove('open'); });
  el('signoutBtn').addEventListener('click', function () { API.auth.signOut(); location.replace('index.html'); });

  /* ---- nav + panes ---- */
  function buildNav() {
    var side = el('sidenav'), tabs = el('mobileTabs'), content = el('content');
    side.innerHTML = ''; tabs.innerHTML = ''; content.innerHTML = '';
    SECTIONS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'navlink'; b.setAttribute('data-sec', s.key);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICON[s.key] + '"/></svg><span>' + s.label + '</span>';
      b.addEventListener('click', function () { show(s.key); });
      side.appendChild(b);
      var t = document.createElement('button');
      t.setAttribute('data-sec', s.key); t.textContent = s.label;
      t.addEventListener('click', function () { show(s.key); });
      tabs.appendChild(t);
      var pane = document.createElement('section');
      pane.className = 'section-pane'; pane.id = 'pane-' + s.key; pane.setAttribute('data-pane', s.key);
      content.appendChild(pane);
    });
  }
  var RENDER = {};
  function show(key) {
    document.querySelectorAll('.section-pane').forEach(function (p) { p.classList.toggle('active', p.getAttribute('data-pane') === key); });
    document.querySelectorAll('[data-sec]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-sec') === key); });
    if (RENDER[key]) RENDER[key]();
    window.scrollTo(0, 0);
  }

  /* ---- helpers ---- */
  function fullAddress(a) {
    if (!a || !a.line1) return null;
    var l2 = a.line2 ? a.line2 + ', ' : '';
    return a.line1 + ', ' + l2 + a.city + ', ' + a.state + ' ' + a.zip;
  }
  function spec(k, v) { return '<div class="spec"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div></div>'; }
  function barcodeSVG(text) {
    var bars = '', x = 0, h = 64; text = String(text || '');
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      for (var b = 0; b < 4; b++) {
        var bw = ((c >> b) & 1) ? 3 : 1.5;
        if ((c >> (b + 1)) & 1) bars += '<rect x="' + x.toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + h + '" fill="#141937"/>';
        x += bw + 1.6;
      }
    }
    return '<svg viewBox="0 0 ' + x.toFixed(0) + ' ' + h + '" preserveAspectRatio="none">' + bars + '</svg>';
  }

  /* ---- PROFILE (landing) ---- */
  RENDER.profile = function (edit) {
    var addr = fullAddress(me.address);
    var card = me.card ? esc(me.card.brand) + ' •••• ' + esc(me.card.last4) + ' &nbsp;<span style="color:var(--ink-40);font-weight:500">exp ' + esc(me.card.exp) + '</span>' : '<span style="color:var(--ink-40)">No card on file</span>';
    var household = (me.household != null && me.household !== '') ? esc(me.household) + (me.household == 1 ? ' person' : ' people') : '<span style="color:var(--ink-40)">Not set</span>';
    var pane = el('pane-profile');
    if (edit === true) {
      pane.innerHTML =
        '<div class="page-head"><h1>Edit profile</h1><p>Update your personal details.</p></div>' +
        '<div class="card" style="max-width:620px">' +
          '<div class="field"><label for="f_name">Full name</label><input id="f_name" value="' + esc(me.full_name) + '"></div>' +
          '<div class="field"><label for="f_phone">Phone</label><input id="f_phone" value="' + esc(me.phone) + '"></div>' +
          '<div class="field"><label for="f_house">Number of people living in the house</label><input id="f_house" type="number" min="1" max="20" value="' + esc(me.household == null ? '' : me.household) + '"></div>' +
          '<div class="grid grid-2">' +
            '<div class="field"><label for="f_cbrand">Card brand</label><input id="f_cbrand" placeholder="Visa" value="' + esc(me.card ? me.card.brand : '') + '"></div>' +
            '<div class="field"><label for="f_clast">Card (last 4)</label><input id="f_clast" maxlength="4" placeholder="4242" value="' + esc(me.card ? me.card.last4 : '') + '"></div>' +
          '</div>' +
          '<div class="field" style="max-width:200px"><label for="f_cexp">Card expiry</label><input id="f_cexp" placeholder="08/27" value="' + esc(me.card ? me.card.exp : '') + '"></div>' +
          '<div style="display:flex;gap:10px;margin-top:8px"><button class="btn btn--primary" id="saveProfile">Save changes</button><button class="btn btn--ghost" id="cancelProfile">Cancel</button></div>' +
        '</div>';
      el('saveProfile').addEventListener('click', function () {
        me.full_name = el('f_name').value.trim();
        me.phone = el('f_phone').value.trim();
        var h = el('f_house').value.trim(); me.household = h === '' ? null : parseInt(h, 10);
        var brand = el('f_cbrand').value.trim(), last = el('f_clast').value.trim(), exp = el('f_cexp').value.trim();
        me.card = (brand || last) ? { brand: brand || 'Card', last4: last, exp: exp } : null;
        API.saveCustomer(me); renderUser(); toast('Profile updated'); RENDER.profile();
      });
      el('cancelProfile').addEventListener('click', function () { RENDER.profile(); });
      return;
    }
    pane.innerHTML =
      '<div class="page-head"><h1>Hi, ' + esc((me.full_name || 'there').split(' ')[0]) + '.</h1><p>Here’s your Better Tap profile.</p></div>' +
      '<div class="card">' +
        '<div class="card-head"><h2>Profile</h2><button class="btn btn--ghost btn--sm" id="editProfile">Edit</button></div>' +
        '<div class="specs">' +
          spec('Full name', esc(me.full_name) || '<span style="color:var(--ink-40)">Not set</span>') +
          spec('Email address', esc(me.email)) +
          spec('Full address', addr ? esc(addr) : '<span style="color:var(--ink-40)">No address on file</span>') +
          spec('Card on file', card) +
          spec('People living in the house', household) +
        '</div>' +
      '</div>';
    el('editProfile').addEventListener('click', function () { RENDER.profile(true); });
  };

  /* ---- MY BETTERTAP (machine) ---- */
  RENDER.machine = function () {
    var pane = el('pane-machine');
    var m = me.machine;
    if (!m) { pane.innerHTML = '<div class="page-head"><h1>My BetterTap</h1></div><div class="card"><p class="empty">No registered machine yet.</p></div>'; return; }
    var gallery = (m.install_images || []).map(function (src) {
      return '<button data-full="' + esc(src) + '"><img src="' + esc(src) + '" alt="Installation photo" loading="lazy"></button>';
    }).join('');
    pane.innerHTML =
      '<div class="page-head"><h1>My BetterTap</h1><p>Your machine, install details and service dates.</p></div>' +
      '<div class="card">' +
        '<div class="machine">' +
          '<div class="machine__photo"><img src="' + esc(m.photo) + '" alt="' + esc(m.model) + '"></div>' +
          '<div>' +
            '<div class="specs">' +
              spec('Model', esc(m.model) + ' <span style="color:var(--ink-40);font-weight:500">(' + esc(m.model_no) + ')</span>') +
              spec('Color', esc(m.color)) +
              spec('Installation date', esc(m.install_date)) +
              spec('Filter installation date', esc(m.filter_install_date)) +
              spec('Next filter swap', '<span style="color:var(--blue-600)">' + esc(m.filter_swap_date) + '</span>') +
              spec('Next UV lamp switch', '<span style="color:var(--blue-600)">' + esc(m.uv_swap_date) + '</span>') +
            '</div>' +
            '<div class="barcode-box">' + barcodeSVG(m.serial) + '<span class="sn">' + esc(m.serial) + '</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-head"><h2>Installation photos</h2></div>' +
        '<div class="gallery">' + (gallery || '<p class="empty">No photos.</p>') + '</div>' +
        '<div class="caption"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg> Taken by your installer on ' + esc(m.install_date) + '.</div>' +
      '</div>';
    pane.querySelectorAll('.gallery button').forEach(function (b) {
      b.addEventListener('click', function () { lightbox(b.getAttribute('data-full')); });
    });
  };

  /* ---- ORDERS ---- */
  function statusPill(s) {
    var map = { Delivered: 'pill--ok', Shipped: 'pill--info', Processing: 'pill--warn', Open: 'pill--warn', Resolved: 'pill--ok', Cancelled: 'pill--neutral' };
    return '<span class="pill ' + (map[s] || 'pill--neutral') + '">' + esc(s) + '</span>';
  }
  RENDER.orders = function () {
    var pane = el('pane-orders');
    var head = '<div class="page-head"><h1>Orders</h1><p>Your order history and status.</p></div>';
    if (!me.orders || !me.orders.length) {
      pane.innerHTML = head + '<div class="card"><p class="empty">No orders yet. <a class="link" href="' + SITE + '/shop.html">Shop BetterTap →</a></p></div>'; return;
    }
    var rows = me.orders.map(function (o) {
      return '<tr><td><span class="subj">#' + esc(o.id) + '</span><div class="meta">' + esc(o.date) + '</div></td>' +
        '<td>' + esc(o.item) + '<div class="meta">Qty ' + esc(o.qty) + '</div></td><td>' + esc(o.total) + '</td><td>' + statusPill(o.status) + '</td>' +
        '<td>' + (o.tracking ? '<a class="link" href="#" data-track="' + esc(o.tracking) + '">Track</a>' : '<span class="meta">—</span>') + '</td></tr>';
    }).join('');
    pane.innerHTML = head + '<div class="card" style="padding:14px 10px 4px"><table class="table"><thead><tr><th>Order</th><th>Item</th><th>Total</th><th>Status</th><th>Tracking</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    pane.querySelectorAll('[data-track]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toast('Tracking: ' + a.getAttribute('data-track')); }); });
  };

  /* ---- SUBSCRIPTION ---- */
  RENDER.subscription = function () {
    var pane = el('pane-subscription');
    var head = '<div class="page-head"><h1>Subscription &amp; Filters</h1><p>Manage your MAZE filter plan and reminders.</p></div>';
    var s = me.subscription;
    if (!s) { pane.innerHTML = head + '<div class="card"><p class="empty">No active filter subscription. <a class="link" href="' + SITE + '/shop.html#refills">Set one up →</a></p></div>'; return; }
    var paused = s.status === 'paused';
    pane.innerHTML = head +
      '<div class="card"><div class="card-head"><div><h2>' + esc(s.plan) + '</h2><p class="card-sub">' + esc(s.cadence) + '</p></div>' +
        (paused ? '<span class="pill pill--warn">Paused</span>' : '<span class="pill pill--ok">Active</span>') + '</div>' +
        '<div class="specs">' + spec('Next filter replacement', '<span style="color:var(--blue-600)">' + esc(s.next_filter) + '</span>') + spec('Cadence', esc(s.cadence)) + '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px"><button class="btn btn--primary btn--sm" id="reorder">Reorder filter now</button>' +
        '<button class="btn btn--ghost btn--sm" id="togglePause">' + (paused ? 'Resume subscription' : 'Pause subscription') + '</button></div></div>' +
      '<div class="card"><div class="card-head"><h2>Reminders</h2></div>' +
        '<div class="toggle-row"><div><div class="tt">Email me before a replacement is due</div><div class="td">A reminder ahead of your next filter or UV lamp date.</div></div>' +
        '<label class="switch"><input type="checkbox" id="remEmail"' + (s.remind_email === false ? '' : ' checked') + '><span class="slider"></span></label></div></div>';
    el('reorder').addEventListener('click', function () { toast('MAZE filter added to your cart (demo)'); });
    el('togglePause').addEventListener('click', function () { me.subscription.status = paused ? 'active' : 'paused'; API.saveCustomer(me); toast(paused ? 'Subscription resumed' : 'Subscription paused'); RENDER.subscription(); });
    el('remEmail').addEventListener('change', function () { me.subscription.remind_email = this.checked; API.saveCustomer(me); toast(this.checked ? 'Reminders on' : 'Reminders off'); });
  };

  /* ---- ADDRESSES ---- */
  RENDER.addresses = function () {
    var pane = el('pane-addresses');
    var a = me.address || { line1: '', line2: '', city: '', state: '', zip: '' };
    pane.innerHTML =
      '<div class="page-head"><h1>Addresses</h1><p>Where we ship your system and filters.</p></div>' +
      '<div class="card" style="max-width:620px"><div class="card-head"><h2>Shipping address</h2></div>' +
        '<div class="field"><label for="a_l1">Street address</label><input id="a_l1" value="' + esc(a.line1) + '"></div>' +
        '<div class="field"><label for="a_l2">Apt, suite (optional)</label><input id="a_l2" value="' + esc(a.line2 || '') + '"></div>' +
        '<div class="grid grid-3"><div class="field"><label for="a_city">City</label><input id="a_city" value="' + esc(a.city) + '"></div>' +
        '<div class="field"><label for="a_state">State</label><input id="a_state" maxlength="2" value="' + esc(a.state) + '"></div>' +
        '<div class="field"><label for="a_zip">ZIP</label><input id="a_zip" value="' + esc(a.zip) + '"></div></div>' +
        '<button class="btn btn--primary" id="saveAddr">Save address</button></div>';
    el('saveAddr').addEventListener('click', function () {
      me.address = { line1: el('a_l1').value.trim(), line2: el('a_l2').value.trim(), city: el('a_city').value.trim(), state: el('a_state').value.trim().toUpperCase(), zip: el('a_zip').value.trim() };
      API.saveCustomer(me); toast('Address saved');
    });
  };

  /* ---- ACCESSORIES ---- */
  RENDER.accessories = function () {
    var pane = el('pane-accessories');
    var items = [
      { name: 'MAZE Water Filter', price: '$55', img: '../assets/img/maze-side.png', desc: 'Replacement cartridge. Recommended every 6 months.' },
      { name: 'UV Light', price: '$40', img: '../assets/img/uv-poster.jpg', desc: 'Replacement UV-C lamp. Recommended once a year.' },
      { name: 'Filter + UV Bundle', price: '$80', img: '../assets/img/maze-uv-bundle.webp', desc: 'A MAZE filter and a UV lamp together — save when you bundle.' }
    ];
    var cards = items.map(function (it) {
      return '<div class="doc-card"><div class="machine__photo" style="aspect-ratio:4/3;border-radius:var(--radius-sm)"><img src="' + esc(it.img) + '" alt="' + esc(it.name) + '" style="width:100%;height:100%;object-fit:contain;padding:10px;background:#fff"></div>' +
        '<h3>' + esc(it.name) + '</h3><p>' + esc(it.desc) + '</p>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px"><span style="font-family:var(--display);font-weight:700;font-size:1.3rem;color:var(--navy)">' + esc(it.price) + '</span>' +
        '<button class="btn btn--primary btn--sm" data-buy="' + esc(it.name) + '">Add to cart</button></div></div>';
    }).join('');
    pane.innerHTML = '<div class="page-head"><h1>Accessories</h1><p>Genuine BetterTap replacements and add-ons.</p></div>' +
      '<div class="grid grid-3">' + cards + '</div>';
    pane.querySelectorAll('[data-buy]').forEach(function (b) { b.addEventListener('click', function () { toast(b.getAttribute('data-buy') + ' added to cart (demo)'); }); });
  };

  /* ---- SERVICE REQUESTS ---- */
  RENDER.service = function () {
    var pane = el('pane-service');
    var tickets = me.tickets || [];
    var rows = tickets.length ? tickets.map(function (t) {
      return '<tr><td><span class="subj">' + esc(t.subject) + '</span><div class="meta">#' + esc(t.id) + ' · ' + esc(t.date) + '</div></td><td>' + esc(t.message) + '</td><td>' + statusPill(t.status) + '</td></tr>';
    }).join('') : '';
    var social = SOCIAL.map(function (s) {
      return '<a class="share-btn share-btn--' + s.k + '" href="' + s.url + '" target="_blank" rel="noopener" aria-label="' + s.k + '"><svg viewBox="0 0 24 24" fill="currentColor"><path d="' + s.path + '"/></svg></a>';
    }).join('');
    pane.innerHTML =
      '<div class="page-head"><h1>Service requests</h1><p>Open a ticket, chat with us, or reach out on your favorite channel.</p></div>' +
      '<div class="grid grid-2">' +
        '<div class="card"><div class="card-head"><h2>Open a ticket</h2></div>' +
          '<div class="field"><label for="t_subj">Subject</label><input id="t_subj" placeholder="e.g. Filter light is blinking"></div>' +
          '<div class="field"><label for="t_msg">Message</label><textarea id="t_msg" placeholder="Tell us what’s going on…"></textarea></div>' +
          '<button class="btn btn--primary" id="submitTicket">Submit request</button></div>' +
        '<div class="card" style="display:flex;flex-direction:column"><div class="card-head"><h2>Live chat</h2></div>' +
          '<div id="chatLog" style="flex:1;min-height:170px;max-height:230px;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px;margin-bottom:12px"></div>' +
          '<div style="display:flex;gap:8px"><input id="chatInput" class="" placeholder="Type a message…" style="flex:1;padding:11px 13px;border:1.5px solid var(--line);border-radius:var(--radius-sm)"><button class="btn btn--primary btn--sm" id="chatSend">Send</button></div></div>' +
      '</div>' +
      '<div class="card"><div class="card-head"><h2>Other ways to reach us</h2></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
          '<a class="btn btn--primary btn--sm" href="' + WHATSAPP_URL + '" target="_blank" rel="noopener">Chat on WhatsApp</a>' +
          '<a class="btn btn--ghost btn--sm" href="' + SITE + '/contact.html">Contact page</a>' +
        '</div>' +
        '<div class="share-row"><span class="share-row__label">Follow us</span>' + social + '</div>' +
      '</div>' +
      '<div class="card" style="padding:14px 10px 4px"><div class="card-head" style="padding:10px 12px 0"><h2>Your service requests</h2></div>' +
        (rows ? '<table class="table"><thead><tr><th>Subject</th><th>Message</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<p class="empty">No service requests yet.</p>') + '</div>';

    el('submitTicket').addEventListener('click', function () {
      var subj = el('t_subj').value.trim(), msg = el('t_msg').value.trim();
      if (!subj || !msg) { toast('Add a subject and message'); return; }
      me.tickets = me.tickets || [];
      me.tickets.unshift({ id: 'SR-' + Math.floor(3100 + Math.random() * 8900), subject: subj, message: msg, date: 'Just now', status: 'Open' });
      API.saveCustomer(me); toast('Request submitted'); RENDER.service();
    });
    // demo chat
    var log = el('chatLog');
    function bubble(who, text) {
      var b = document.createElement('div');
      var mine = who === 'me';
      b.style.cssText = 'max-width:80%;padding:9px 13px;border-radius:14px;font-size:14px;' + (mine
        ? 'align-self:flex-end;background:var(--blue);color:#fff;border-bottom-right-radius:4px'
        : 'align-self:flex-start;background:var(--grey);color:var(--navy);border-bottom-left-radius:4px');
      b.textContent = text; log.appendChild(b); log.scrollTop = log.scrollHeight;
    }
    bubble('bot', 'Hi! 👋 This is BetterTap support (demo). How can we help?');
    function send() {
      var v = el('chatInput').value.trim(); if (!v) return;
      bubble('me', v); el('chatInput').value = '';
      setTimeout(function () { bubble('bot', 'Thanks — a BetterTap specialist will follow up shortly. For anything urgent, open a ticket or message us on WhatsApp.'); }, 600);
    }
    el('chatSend').addEventListener('click', send);
    el('chatInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  };

  /* ---- GUIDES ---- */
  RENDER.guides = function () {
    var pane = el('pane-guides');
    var guides = [
      { title: 'Installing your BetterTap', img: '../assets/img/family-counter.jpg', url: SITE + '/guides.html' },
      { title: 'Swapping the MAZE filter', img: '../assets/img/filter-stages.jpg', url: SITE + '/guides.html#filter' },
      { title: 'Changing the UV lamp', img: '../assets/img/uv-poster.jpg', url: SITE + '/guides.html#uv-lamp' },
      { title: 'Cleaning & daily care', img: '../assets/img/dispense.jpg', url: SITE + '/guides.html' }
    ];
    var cards = guides.map(function (g) {
      return '<a class="doc-card" href="' + g.url + '" target="_blank" rel="noopener" style="text-decoration:none">' +
        '<div class="machine__photo" style="aspect-ratio:16/10;border-radius:var(--radius-sm)"><img src="' + esc(g.img) + '" alt="' + esc(g.title) + '" style="width:100%;height:100%;object-fit:cover"></div>' +
        '<h3>' + esc(g.title) + '</h3><span class="open">Read guide →</span></a>';
    }).join('');
    pane.innerHTML =
      '<div class="page-head"><h1>Guides</h1><p>How-to videos and step-by-step guides for your BetterTap.</p></div>' +
      '<div class="card"><div class="card-head"><h2>Watch: filter &amp; UV care</h2></div>' +
        '<video controls preload="metadata" poster="../assets/img/uv-poster.jpg" style="width:100%;border-radius:var(--radius-sm);background:#000">' +
        '<source src="../assets/video/uv-filter.mp4" type="video/mp4"></video></div>' +
      '<div class="grid grid-2" style="margin-top:20px">' + cards + '</div>';
  };

  /* ---- boot ---- */
  renderUser();
  buildNav();
  show('profile'); // land on profile first
})();
