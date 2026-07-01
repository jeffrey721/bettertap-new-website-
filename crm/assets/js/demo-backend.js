/* ============================================================================
   Better Tap CRM — self-contained field-service backend (no external service)
   ----------------------------------------------------------------------------
   Exposes the SAME interface the CRM expects from Supabase
   (window.supabase.createClient -> { auth, from }), backed by localStorage.
   Query builder mirrors: select / insert / update / delete / eq / in / order /
   single / limit — as a thenable so `await q` runs it.

   ⚠️ Front-end DEMO store, NOT real security. For production, set real Supabase
   values in config.js and swap the <script> (see SUPABASE-SETUP.md).

   Demo logins (all password: bettertap):
     jeffrey@drinkbettertap.com  — CEO / Owner
     ruchama@drinkbettertap.com  — Customer Service + Sales
     dana.cs@drinkbettertap.com  — Customer Service
     noa@drinkbettertap.com      — Sales
     tali@drinkbettertap.com     — Marketing
     eli@drinkbettertap.com      — Operations
     morry@drinkbettertap.com    — Installer (North NJ)
     ari@drinkbettertap.com      — Installer (Central NJ)
   ============================================================================ */
(function () {
  'use strict';

  var LS = window.localStorage;
  var OWNER_EMAILS = ['jeffrey@drinkbettertap.com', 'jeffrey@yjctrade.com'];

  function uid() { return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function now() { return new Date().toISOString(); }
  function load(key, def) { try { var v = JSON.parse(LS.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function save(key, val) { LS.setItem(key, JSON.stringify(val)); }
  function dayISO(offsetDays) { return new Date(Date.now() + offsetDays * 86400000).toISOString(); }
  function addMonths(iso, months) { var d = new Date(iso); d.setMonth(d.getMonth() + months); return d.toISOString(); }

  /* ---------- table -> storage key ---------- */
  var KEYS = {
    profiles: 'bt_profiles', customers: 'bt_customers', machines: 'bt_machines',
    orders: 'bt_orders', jobs: 'bt_jobs_v2', cases: 'bt_cases',
    interactions: 'bt_interactions', tasks: 'bt_tasks', parts: 'bt_parts', campaigns: 'bt_campaigns'
  };
  function keyFor(table) { return KEYS[table] || ('bt_' + table); }

  /* ---------- one-time seed (all collections) ---------- */
  (function seed() {
    if (LS.getItem('bt_seed_v3')) return;

    /* --- team --- */
    var P = {
      ceo: 'owner-1', ruchama: 'p-ruchama', cs: 'p-cs', sales: 'p-noa',
      mkt: 'p-tali', ops: 'p-eli', morry: 'p-morry', ari: 'p-ari'
    };
    save('bt_profiles', [
      { id: P.ceo,     email: 'jeffrey@drinkbettertap.com', full_name: 'Jeffrey Cohen', role: 'ceo',                    region: 'HQ',          phone: '+1 (973) 555-0100', active: true, created_at: dayISO(-400) },
      { id: P.ruchama, email: 'ruchama@drinkbettertap.com', full_name: 'Ruchama Adler', role: 'customer_service_sales', region: 'HQ',          phone: '+1 (973) 555-0111', active: true, created_at: dayISO(-300) },
      { id: P.cs,      email: 'dana.cs@drinkbettertap.com', full_name: 'Dana Gold',      role: 'customer_service',      region: 'HQ',          phone: '+1 (973) 555-0112', active: true, created_at: dayISO(-120) },
      { id: P.sales,   email: 'noa@drinkbettertap.com',     full_name: 'Noa Katz',       role: 'sales',                 region: 'HQ',          phone: '+1 (973) 555-0113', active: true, created_at: dayISO(-200) },
      { id: P.mkt,     email: 'tali@drinkbettertap.com',    full_name: 'Tali Shaw',      role: 'marketing',             region: 'HQ',          phone: '+1 (973) 555-0114', active: true, created_at: dayISO(-180) },
      { id: P.ops,     email: 'eli@drinkbettertap.com',     full_name: 'Eli Ron',        role: 'operations',            region: 'HQ',          phone: '+1 (973) 555-0115', active: true, created_at: dayISO(-260) },
      { id: P.morry,   email: 'morry@drinkbettertap.com',   full_name: 'Morry Weiss',    role: 'installer',             region: 'North NJ',   phone: '+1 (201) 555-0120', active: true, created_at: dayISO(-250) },
      { id: P.ari,     email: 'ari@drinkbettertap.com',     full_name: 'Ari Stern',      role: 'installer',             region: 'Central NJ', phone: '+1 (908) 555-0121', active: true, created_at: dayISO(-240) }
    ]);
    var creds = {};
    ['jeffrey@drinkbettertap.com','ruchama@drinkbettertap.com','dana.cs@drinkbettertap.com','noa@drinkbettertap.com','tali@drinkbettertap.com','eli@drinkbettertap.com','morry@drinkbettertap.com','ari@drinkbettertap.com']
      .forEach(function (e, i) { creds[e] = { id: [P.ceo,P.ruchama,P.cs,P.sales,P.mkt,P.ops,P.morry,P.ari][i], password: 'bettertap' }; });
    save('bt_creds', creds);

    /* --- customers --- */
    var C = { levin:'c-levin', cohen:'c-cohen', bar:'c-bar', reed:'c-reed', klein:'c-klein', weiss:'c-weiss' };
    save('bt_customers', [
      { id: C.levin, name: 'Dana Levin', emails: ['dana.levin@example.com'], phones: ['+1 (973) 555-0142'], install_address: '34 Main St, West Orange, NJ 07052', billing_address: '34 Main St, West Orange, NJ 07052', type: 'customer', lead_source: 'Instagram', utm_campaign: 'ig_spring_launch', status: 'active', tags: ['vip'], owner_id: P.ruchama, marketing_opt_in: true, notes: 'Prefers texts over calls.', created_at: dayISO(-70) },
      { id: C.cohen, name: 'Avi Cohen', emails: ['avi.cohen@example.com'], phones: ['+1 (201) 555-0178'], install_address: '210 Engle St, Englewood, NJ 07631', billing_address: '210 Engle St, Englewood, NJ 07631', type: 'customer', lead_source: 'Google', utm_campaign: 'g_search_brand', status: 'active', tags: [], owner_id: P.sales, marketing_opt_in: false, notes: '', created_at: dayISO(-205) },
      { id: C.bar, name: 'Maya Bar', emails: ['maya.bar@example.com'], phones: ['+1 (201) 555-0155'], install_address: '55 Cedar Ln, Teaneck, NJ 07666', billing_address: '55 Cedar Ln, Teaneck, NJ 07666', type: 'customer', lead_source: 'Referral', utm_campaign: '', status: 'active', tags: ['referral'], owner_id: P.ruchama, marketing_opt_in: true, notes: '', created_at: dayISO(-32) },
      { id: C.klein, name: 'Sarah Klein', emails: ['sarah.klein@example.com'], phones: ['+1 (973) 555-0190'], install_address: '8 Oak Ridge Rd, Livingston, NJ 07039', billing_address: '8 Oak Ridge Rd, Livingston, NJ 07039', type: 'customer', lead_source: 'Web', utm_campaign: '', status: 'active', tags: [], owner_id: P.ruchama, marketing_opt_in: true, notes: 'Filter due soon — proactive outreach.', created_at: dayISO(-172) },
      { id: C.reed, name: 'Josh Reed', emails: ['josh.reed@example.com'], phones: ['+1 (973) 555-0201'], install_address: '19 Valley Rd, Montclair, NJ 07042', billing_address: '', type: 'prospect', lead_source: 'Facebook Ad', utm_campaign: 'fb_retarget', status: 'new', tags: ['hot-lead'], owner_id: P.sales, marketing_opt_in: true, notes: 'Wants black unit, asked about lease.', created_at: dayISO(-6) },
      { id: C.weiss, name: 'Daniel Weiss', emails: ['daniel.weiss@example.com'], phones: ['+1 (201) 555-0233'], install_address: '2 Bergen Blvd, Fort Lee, NJ 07024', billing_address: '', type: 'prospect', lead_source: 'TikTok', utm_campaign: 'tt_demo', status: 'new', tags: [], owner_id: P.sales, marketing_opt_in: false, notes: '', created_at: dayISO(-2) }
    ]);

    /* --- machines (installed assets) --- */
    var M = { levin:'m-levin', cohen:'m-cohen', bar:'m-bar', klein:'m-klein' };
    function machine(id, cust, color, installOffset, serial, loc) {
      var install = dayISO(installOffset);
      return { id: id, customer_id: cust, model: 'Water Bar WDC-E-032 Edge', color: color, serial_number: serial,
        install_date: install, warranty_until: addMonths(install, 36),
        filter_last_replaced: install, filter_due: addMonths(install, 6),
        uv_last_replaced: install, uv_due: addMonths(install, 12),
        location_in_home: loc, ownership: 'owned', status: 'active', notes: '' };
    }
    save('bt_machines', [
      machine(M.levin, C.levin, 'white', -60,  'BT-EDGE-2026-004821', 'Kitchen counter'),
      machine(M.cohen, C.cohen, 'black', -205, 'BT-EDGE-2025-003190', 'Kitchen'),   // filter overdue
      machine(M.bar,   C.bar,   'white', -30,  'BT-EDGE-2026-005044', 'Island'),
      machine(M.klein, C.klein, 'black', -172, 'BT-EDGE-2025-003655', 'Pantry')     // filter due soon
    ]);

    /* --- orders (deals) --- */
    save('bt_orders', [
      { id: uid(), customer_id: C.levin, plan: 'cash_1280',    amount_total: 1280, amount_paid: 1280, balance: 0,   payment_status: 'paid',    payment_method: 'Visa •4242', color_requested: 'white', special_notes: '', stage: 'installed', rep_id: P.ruchama, shopify_order_id: 'BT-10428', order_date: dayISO(-62) },
      { id: uid(), customer_id: C.cohen, plan: 'installments', amount_total: 1280, amount_paid: 640,  balance: 640, payment_status: 'partial', payment_method: 'Mastercard •8210', color_requested: 'black', special_notes: '6-pay plan', stage: 'installed', rep_id: P.sales, shopify_order_id: 'BT-10390', order_date: dayISO(-207) },
      { id: uid(), customer_id: C.bar,   plan: 'cash_1280',    amount_total: 1280, amount_paid: 1280, balance: 0,   payment_status: 'paid',    payment_method: 'Amex •1007', color_requested: 'white', special_notes: '', stage: 'installed', rep_id: P.ruchama, shopify_order_id: 'BT-10515', order_date: dayISO(-33) },
      { id: uid(), customer_id: C.klein, plan: 'lease',        amount_total: 0,    amount_paid: 25,   balance: 25,  payment_status: 'subscription', payment_method: 'Visa •9931', color_requested: 'black', special_notes: '$25/mo lease', stage: 'installed', rep_id: P.ruchama, shopify_order_id: 'BT-10360', order_date: dayISO(-174) },
      { id: uid(), customer_id: C.reed,  plan: 'lease',        amount_total: 0,    amount_paid: 0,    balance: 0,   payment_status: 'quote', payment_method: '', color_requested: 'black', special_notes: 'Quote sent — lease $25/mo', stage: 'quote', rep_id: P.sales, shopify_order_id: '', order_date: dayISO(-3) },
      { id: uid(), customer_id: C.weiss, plan: 'cash_1280',    amount_total: 1280, amount_paid: 0,    balance: 1280, payment_status: 'quote', payment_method: '', color_requested: 'white', special_notes: 'New lead', stage: 'qualified', rep_id: P.sales, shopify_order_id: '', order_date: dayISO(-1) }
    ]);

    /* --- cases (support tickets) --- */
    var CS = { c1:'case-1', c2:'case-2', c3:'case-3' };
    save('bt_cases', [
      { id: CS.c1, customer_id: C.levin, machine_id: M.levin, channel: 'call', direction: 'inbound', subject: 'Filter indicator is red', category: 'consumable', priority: 'P3_normal', status: 'resolved', assigned_to: P.ruchama, opened_at: dayISO(-4), resolved_at: dayISO(-4), sla_due: dayISO(-3), resolution: 'Offered filter replacement; shipped MAZE TE + self-replace guide.', resolution_type: 'consumable', linked_job_id: null, ts_path: ['Filter indicator red'], notes: '' },
      { id: CS.c2, customer_id: C.cohen, machine_id: M.cohen, channel: 'call', direction: 'inbound', subject: 'Leaking from connector', category: 'leak', priority: 'P2_high', status: 'open', assigned_to: P.cs, opened_at: dayISO(-1), resolved_at: null, sla_due: dayISO(1), resolution: '', resolution_type: 'dispatch', linked_job_id: null, ts_path: ['Leak on counter / connector','Constant / leaking connector'], notes: 'Dispatch created.' },
      { id: CS.c3, customer_id: C.bar, machine_id: M.bar, channel: 'chat', direction: 'inbound', subject: 'No hot water', category: 'setting', priority: 'P4_low', status: 'resolved', assigned_to: P.cs, opened_at: dayISO(-2), resolved_at: dayISO(-2), sla_due: dayISO(-1), resolution: "Child Lock was on ('CH'); walked through bypass. Resolved.", resolution_type: 'self_resolved', linked_job_id: null, ts_path: ['No hot / boiling water',"Display shows 'CH' / beeps — Yes",'Child Lock bypass'], notes: '' }
    ]);

    /* --- jobs (work orders) --- */
    save('bt_jobs_v2', [
      { id: uid(), customer_id: C.reed,  machine_id: null,    kind: 'installation',      status: 'scheduled',   priority: 'P3_normal', scheduled_for: dayISO(1),  time_window: '9:00–11:00 AM', assigned_to: P.morry, address: '19 Valley Rd, Montclair, NJ 07042', route_order: 1, color: 'black', special_notes: 'New install — lease unit.', items_to_bring: ['Water Bar (black)','MAZE TE filter','UV-C lamp','Connectors'], amount_to_collect: 0, amount_collected: 0, parts_used: [], duration_min: null, checklist: [], photos: [], signature: null, sla_due: dayISO(1), source_case_id: null, created_at: dayISO(-3) },
      { id: uid(), customer_id: C.weiss, machine_id: null,    kind: 'installation',      status: 'unscheduled', priority: 'P3_normal', scheduled_for: null,       time_window: '', assigned_to: null, address: '2 Bergen Blvd, Fort Lee, NJ 07024', route_order: null, color: 'white', special_notes: 'Awaiting deposit.', items_to_bring: ['Water Bar (white)','MAZE TE filter','UV-C lamp','Connectors'], amount_to_collect: 1280, amount_collected: 0, parts_used: [], duration_min: null, checklist: [], photos: [], signature: null, sla_due: dayISO(3), source_case_id: null, created_at: dayISO(-1) },
      { id: uid(), customer_id: C.cohen, machine_id: M.cohen, kind: 'repair',            status: 'scheduled',   priority: 'P2_high',   scheduled_for: dayISO(1),  time_window: '1:00–3:00 PM', assigned_to: P.morry, address: '210 Engle St, Englewood, NJ 07631', route_order: 2, color: 'black', special_notes: 'Leaking connector — from support case.', items_to_bring: ['Connectors','Sealant'], amount_to_collect: 0, amount_collected: 0, parts_used: [], duration_min: null, checklist: [], photos: [], signature: null, sla_due: dayISO(1), source_case_id: CS.c2, created_at: dayISO(-1) },
      { id: uid(), customer_id: C.klein, machine_id: M.klein, kind: 'filter_replacement', status: 'scheduled',   priority: 'P3_normal', scheduled_for: dayISO(2),  time_window: '10:00–12:00 PM', assigned_to: P.ari, address: '8 Oak Ridge Rd, Livingston, NJ 07039', route_order: 1, color: 'black', special_notes: 'Filter due — bring MAZE TE.', items_to_bring: ['MAZE TE filter'], amount_to_collect: 55, amount_collected: 0, parts_used: [], duration_min: null, checklist: [], photos: [], signature: null, sla_due: dayISO(2), source_case_id: null, created_at: dayISO(-2) },
      { id: uid(), customer_id: C.levin, machine_id: M.levin, kind: 'installation',      status: 'done',        priority: 'P3_normal', scheduled_for: dayISO(-60),time_window: '9:00–11:00 AM', assigned_to: P.morry, address: '34 Main St, West Orange, NJ 07052', route_order: 1, color: 'white', special_notes: '', items_to_bring: [], amount_to_collect: 0, amount_collected: 1280, duration_min: 95, parts_used: ['Water Bar (white)','MAZE TE filter','UV-C lamp'], checklist: [], photos: [], signature: 'Dana Levin', sla_due: dayISO(-60), source_case_id: null, created_at: dayISO(-62) }
    ]);

    /* --- interactions (activity log) --- */
    save('bt_interactions', [
      { id: uid(), customer_id: C.levin, case_id: CS.c1, type: 'call',  direction: 'inbound',  agent_id: P.ruchama, timestamp: dayISO(-4), duration_sec: 240, subject: 'Filter red light', body: 'Customer called about red filter light. Offered replacement.', outcome: 'consumable' },
      { id: uid(), customer_id: C.cohen, case_id: CS.c2, type: 'call',  direction: 'inbound',  agent_id: P.cs, timestamp: dayISO(-1), duration_sec: 380, subject: 'Leak', body: 'Constant leak at connector. Booked a repair visit.', outcome: 'dispatch' },
      { id: uid(), customer_id: C.bar,   case_id: CS.c3, type: 'chat',  direction: 'inbound',  agent_id: P.cs, timestamp: dayISO(-2), duration_sec: 0, subject: 'No hot water', body: 'Child lock on. Walked through bypass.', outcome: 'self_resolved' },
      { id: uid(), customer_id: C.reed,  case_id: null,  type: 'email', direction: 'outbound', agent_id: P.sales, timestamp: dayISO(-3), duration_sec: 0, subject: 'Your BetterTap quote', body: 'Sent lease quote — $25/mo, black unit.', outcome: 'quote_sent' }
    ]);

    /* --- tasks (follow-ups / proactive outreach) --- */
    save('bt_tasks', [
      { id: uid(), related_type: 'customer', related_id: C.cohen, title: 'Filter overdue — call Avi Cohen to replace MAZE filter', due_date: dayISO(-5), assignee_id: P.ruchama, status: 'open', created_at: dayISO(-5) },
      { id: uid(), related_type: 'customer', related_id: C.klein, title: 'Filter due soon — proactive outreach to Sarah Klein', due_date: dayISO(8),  assignee_id: P.ruchama, status: 'open', created_at: dayISO(-1) },
      { id: uid(), related_type: 'case',     related_id: CS.c2,   title: 'Follow up after connector repair (Avi Cohen)', due_date: dayISO(2), assignee_id: P.cs, status: 'open', created_at: dayISO(-1) }
    ]);

    /* --- parts (inventory) --- */
    save('bt_parts', [
      { id: uid(), sku: 'MAZE-TE',    name: 'MAZE TE filter',        qty_on_hand: 48, reorder_level: 20, cost: 22, price: 55,  location: 'Warehouse A' },
      { id: uid(), sku: 'UVC-11W',    name: 'UV-C lamp 11W',         qty_on_hand: 14, reorder_level: 15, cost: 18, price: 40,  location: 'Warehouse A' },
      { id: uid(), sku: 'EDGE-WHITE', name: 'Water Bar Edge (white)', qty_on_hand: 9,  reorder_level: 6,  cost: 720, price: 1280, location: 'Warehouse A' },
      { id: uid(), sku: 'EDGE-BLACK', name: 'Water Bar Edge (black)', qty_on_hand: 4,  reorder_level: 6,  cost: 720, price: 1280, location: 'Warehouse A' },
      { id: uid(), sku: 'CONN-KIT',   name: 'Connector kit',         qty_on_hand: 60, reorder_level: 25, cost: 6,  price: 0,   location: 'Warehouse A' }
    ]);

    /* --- campaigns (marketing) --- */
    save('bt_campaigns', [
      { id: uid(), name: 'IG Spring Launch',   channel: 'Instagram',   spend: 4200, leads: 88, conversions: 21, start: dayISO(-90), end: dayISO(-30) },
      { id: uid(), name: 'Google Brand',       channel: 'Google Ads',  spend: 2600, leads: 54, conversions: 18, start: dayISO(-120), end: dayISO(0) },
      { id: uid(), name: 'FB Retargeting',     channel: 'Facebook',    spend: 1800, leads: 40, conversions: 9,  start: dayISO(-60), end: dayISO(0) },
      { id: uid(), name: 'TikTok Demo',        channel: 'TikTok',      spend: 1500, leads: 33, conversions: 5,  start: dayISO(-45), end: dayISO(0) }
    ]);

    save('bt_seed_v3', '1');
  })();

  /* ---------- session ---------- */
  function sessionGet() { return load('bt_session', null); }
  function sessionSet(s) { if (s) save('bt_session', s); else LS.removeItem('bt_session'); }

  /* ---------- auth (mirrors supabase.auth) ---------- */
  var auth = {
    getSession: function () { return Promise.resolve({ data: { session: sessionGet() }, error: null }); },
    signInWithPassword: function (args) {
      var email = String(args.email || '').trim().toLowerCase();
      var creds = load('bt_creds', {});
      var rec = creds[email];
      if (!rec || rec.password !== args.password) {
        return Promise.resolve({ data: {}, error: { message: 'Invalid email or password.' } });
      }
      var session = { user: { id: rec.id, email: email } };
      sessionSet(session);
      return Promise.resolve({ data: { session: session, user: session.user }, error: null });
    },
    signUp: function (args) {
      var email = String(args.email || '').trim().toLowerCase();
      var creds = load('bt_creds', {});
      if (creds[email]) {
        return Promise.resolve({ data: {}, error: { message: 'An account with this email already exists — sign in instead.' } });
      }
      var profiles = load('bt_profiles', []);
      var id = uid();
      var role = OWNER_EMAILS.indexOf(email) !== -1 ? 'ceo' : 'customer_service';
      var fullName = (args.options && args.options.data && args.options.data.full_name) || '';
      profiles.push({ id: id, email: email, full_name: fullName, role: role, region: '', phone: '', active: true, created_at: now() });
      save('bt_profiles', profiles);
      creds[email] = { id: id, password: args.password };
      save('bt_creds', creds);
      var session = { user: { id: id, email: email } };
      sessionSet(session);
      return Promise.resolve({ data: { user: session.user, session: session }, error: null });
    },
    signOut: function () { sessionSet(null); return Promise.resolve({ error: null }); }
  };

  /* ---------- query builder (mirrors supabase.from(table)...) ---------- */
  function Query(table) {
    this.table = table; this._filters = []; this._in = []; this._single = false;
    this._op = 'select'; this._payload = null; this._order = null; this._limit = null;
  }
  Query.prototype.select = function () { this._op = this._op === 'select' ? 'select' : this._op; return this; };
  Query.prototype.insert = function (payload) { this._op = 'insert'; this._payload = payload; return this; };
  Query.prototype.update = function (payload) { this._op = 'update'; this._payload = payload; return this; };
  Query.prototype.delete = function () { this._op = 'delete'; return this; };
  Query.prototype.eq = function (col, val) { this._filters.push([col, val]); return this; };
  Query.prototype.in = function (col, vals) { this._in.push([col, vals || []]); return this; };
  Query.prototype.order = function (col, opts) { this._order = [col, (opts && opts.ascending === false) ? -1 : 1]; return this; };
  Query.prototype.single = function () { this._single = true; return this; };
  Query.prototype.limit = function (n) { this._limit = n; return this; };

  Query.prototype._run = function () {
    var key = keyFor(this.table);
    var rows = load(key, []);
    var self = this;
    function matches(r) {
      return self._filters.every(function (f) { return r[f[0]] === f[1]; }) &&
             self._in.every(function (f) { return f[1].indexOf(r[f[0]]) !== -1; });
    }

    if (this._op === 'insert') {
      var p = this._payload, arr = Array.isArray(p) ? p : [p];
      arr.forEach(function (item) { if (!item.id) item.id = uid(); if (!item.created_at) item.created_at = now(); rows.push(item); });
      save(key, rows);
      return { data: arr, error: null };
    }
    if (this._op === 'update') {
      var updated = [];
      rows.forEach(function (r) { if (matches(r)) { for (var k in self._payload) { r[k] = self._payload[k]; } updated.push(r); } });
      save(key, rows);
      return { data: updated, error: null };
    }
    if (this._op === 'delete') {
      var kept = [], removed = [];
      rows.forEach(function (r) { if (matches(r)) removed.push(r); else kept.push(r); });
      save(key, kept);
      return { data: removed, error: null };
    }
    // select
    var res = rows.filter(matches);
    if (this._order) {
      var c = this._order[0], dir = this._order[1];
      res = res.slice().sort(function (a, b) {
        var av = a[c], bv = b[c];
        if (av == null) return 1; if (bv == null) return -1;
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      });
    }
    if (this._limit != null) res = res.slice(0, this._limit);
    if (this._single) {
      return res.length ? { data: res[0], error: null } : { data: null, error: { message: 'No rows found' } };
    }
    return { data: res, error: null };
  };
  // thenable so `await`/`.then()` on the builder executes the query
  Query.prototype.then = function (onFulfilled, onRejected) {
    var result;
    try { result = this._run(); } catch (e) { result = { data: null, error: { message: e.message } }; }
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };

  /* ---------- expose the Supabase-compatible client ---------- */
  window.supabase = {
    createClient: function () {
      return { auth: auth, from: function (table) { return new Query(table); } };
    }
  };
})();
