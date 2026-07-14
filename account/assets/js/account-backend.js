/* ============================================================================
   Better Tap — Customer Account portal: self-contained demo backend
   ----------------------------------------------------------------------------
   Browser-localStorage store mirroring a simple customer-account API
   (auth + profile + orders + subscription). Lets the login + dashboard work
   with no server.

   ⚠️ Front-end DEMO only — NOT real security and NOT real customer data.
   Real accounts/orders live on Shopify. Do not store real PII here.

   Seeded demo login:  you@drinkbettertap.com  /  bettertap
   ============================================================================ */
(function () {
  'use strict';
  var LS = window.localStorage;
  var SEED_EMAIL = 'you@drinkbettertap.com';
  var SEED_PW = 'bettertap';

  function uid() { return 'c_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function now() { return new Date().toISOString(); }
  function load(k, d) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { LS.setItem(k, JSON.stringify(v)); }

  /* ---------- one-time seed ---------- */
  (function seed() {
    if (!LS.getItem('bt_acct_customers_v2')) {
      var id = 'cust-1';
      save('bt_acct_customers_v2', [{
        id: id,
        full_name: 'Jordan Bennett',
        email: SEED_EMAIL,
        phone: '+1 (973) 555-0142',
        address: { line1: '34 Main St', line2: '', city: 'West Orange', state: 'NJ', zip: '07052' },
        card: { brand: 'Visa', last4: '4242', exp: '08/27' },
        household: 4,
        subscription: { plan: 'MAZE Filter Plan', status: 'active', cadence: 'Recommended every 6 months', next_filter: 'December 10, 2026' },
        orders: [
          { id: 'BT-10593', date: 'June 20, 2026', item: 'MAZE Water Filter', qty: 1, total: '$89.00', status: 'Shipped', tracking: '1Z999AA10123456784' },
          { id: 'BT-10428', date: 'May 2, 2026', item: 'BetterTap Edge — Matte Black', qty: 1, total: '$1,280.00', status: 'Delivered', tracking: '1Z999AA10120000001' }
        ],
        machine: {
          model: 'BetterTap Edge', model_no: 'WDC-E-032', color: 'Matte Black',
          serial: 'BT-EDGE-2026-004821',
          photo: '../assets/img/gallery-edge-black-front.webp',
          install_date: 'May 8, 2026',
          install_images: ['../assets/img/lifestyle-kitchen.jpg', '../assets/img/family-counter.jpg', '../assets/img/dispense.jpg'],
          filter_install_date: 'May 8, 2026',
          filter_swap_date: 'November 8, 2026',
          uv_swap_date: 'May 8, 2027'
        },
        tickets: [
          { id: 'SR-3001', subject: 'Question about filter indicator', message: 'The filter light is blinking amber — is that normal?', date: 'June 18, 2026', status: 'Resolved' }
        ],
        created_at: now()
      }]);
      save('bt_acct_creds_v2', {});
      var creds = {}; creds[SEED_EMAIL] = { id: id, password: SEED_PW };
      save('bt_acct_creds_v2', creds);
    }
  })();

  /* ---------- session ---------- */
  function sessionGet() { return load('bt_acct_session_v1', null); }
  function sessionSet(s) { if (s) save('bt_acct_session_v1', s); else LS.removeItem('bt_acct_session_v1'); }

  /* ---------- auth ---------- */
  var auth = {
    getSession: function () { return sessionGet(); },
    signIn: function (email, password) {
      email = String(email || '').trim().toLowerCase();
      var creds = load('bt_acct_creds_v2', {});
      var rec = creds[email];
      if (!rec || rec.password !== password) return { error: 'Invalid email or password.' };
      sessionSet({ id: rec.id, email: email });
      return { ok: true };
    },
    signUp: function (name, email, password) {
      email = String(email || '').trim().toLowerCase();
      var creds = load('bt_acct_creds_v2', {});
      if (creds[email]) return { error: 'An account with this email already exists — sign in instead.' };
      var custs = load('bt_acct_customers_v2', []);
      var id = uid();
      custs.push({
        id: id, full_name: name || '', email: email, phone: '',
        address: { line1: '', line2: '', city: '', state: '', zip: '' },
        card: null, household: null, subscription: null, orders: [],
        machine: null, tickets: [], created_at: now()
      });
      save('bt_acct_customers_v2', custs);
      creds[email] = { id: id, password: password };
      save('bt_acct_creds_v2', creds);
      sessionSet({ id: id, email: email });
      return { ok: true };
    },
    signOut: function () { sessionSet(null); }
  };

  /* ---------- data ---------- */
  function getCustomer(id) {
    var custs = load('bt_acct_customers_v2', []);
    for (var i = 0; i < custs.length; i++) { if (custs[i].id === id) return custs[i]; }
    return null;
  }
  function saveCustomer(cust) {
    var custs = load('bt_acct_customers_v2', []);
    for (var i = 0; i < custs.length; i++) { if (custs[i].id === cust.id) { custs[i] = cust; break; } }
    save('bt_acct_customers_v2', custs);
  }

  window.BT_ACCT = {
    auth: auth,
    getCustomer: getCustomer,
    saveCustomer: saveCustomer,
    DEMO: { email: SEED_EMAIL, password: SEED_PW }
  };
})();
