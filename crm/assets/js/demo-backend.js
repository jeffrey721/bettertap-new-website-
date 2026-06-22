/* ============================================================================
   Better Tap CRM — self-contained backend (no external service required)
   ----------------------------------------------------------------------------
   This file exposes the SAME interface the CRM expects from Supabase
   (window.supabase.createClient -> { auth, from }), backed by the browser's
   localStorage. It lets the admin login + workspace work immediately with no
   server setup.

   ⚠️ This is a front-end demo store, NOT real security. Anyone with browser
   access can create a local account. For production multi-user auth, set real
   Supabase values in config.js and switch the <script> back to the Supabase CDN
   in index.html and app.html (see SUPABASE-SETUP.md).

   Default owner login (seeded):
     email:    jeffrey@drinkbettertap.com
     password: bettertap
   ============================================================================ */
(function () {
  'use strict';

  var LS = window.localStorage;
  var OWNER_EMAILS = ['jeffrey@drinkbettertap.com', 'jeffrey@yjctrade.com'];

  function uid() { return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function now() { return new Date().toISOString(); }
  function load(key, def) { try { var v = JSON.parse(LS.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function save(key, val) { LS.setItem(key, JSON.stringify(val)); }

  /* ---------- one-time seed ---------- */
  (function seed() {
    if (!LS.getItem('bt_profiles')) {
      var ownerId = 'owner-1';
      save('bt_profiles', [
        { id: ownerId, email: 'jeffrey@drinkbettertap.com', full_name: 'Jeffrey (Owner)', role: 'ceo', active: true, created_at: now() }
      ]);
      save('bt_creds', { 'jeffrey@drinkbettertap.com': { id: ownerId, password: 'bettertap' } });
    }
    if (!LS.getItem('bt_jobs')) {
      var t = Date.now(), day = 86400000;
      save('bt_jobs', [
        { id: uid(), kind: 'installation', customer_name: 'Dana Levin', address: '12 Hayarkon St, Tel Aviv', phone: '+972 50-123-4567', scheduled_for: new Date(t + day).toISOString(), assigned_to: null, status: 'scheduled', notes: '', created_at: now() },
        { id: uid(), kind: 'repair', customer_name: 'Avi Cohen', address: '4 Rothschild Blvd, Tel Aviv', phone: '+972 52-987-6543', scheduled_for: new Date(t + 2 * day).toISOString(), assigned_to: null, status: 'in_progress', notes: 'Leaking connector', created_at: now() },
        { id: uid(), kind: 'installation', customer_name: 'Maya Bar', address: '9 Dizengoff St, Tel Aviv', phone: '', scheduled_for: new Date(t - day).toISOString(), assigned_to: null, status: 'done', notes: '', created_at: now() }
      ]);
    }
  })();

  /* ---------- session ---------- */
  function sessionGet() { return load('bt_session', null); }
  function sessionSet(s) { if (s) save('bt_session', s); else LS.removeItem('bt_session'); }

  /* ---------- auth (mirrors supabase.auth) ---------- */
  var auth = {
    getSession: function () {
      return Promise.resolve({ data: { session: sessionGet() }, error: null });
    },
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
      var role = OWNER_EMAILS.indexOf(email) !== -1 ? 'ceo' : 'customer_service_sales';
      var fullName = (args.options && args.options.data && args.options.data.full_name) || '';
      profiles.push({ id: id, email: email, full_name: fullName, role: role, active: true, created_at: now() });
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
  function keyFor(table) { return table === 'profiles' ? 'bt_profiles' : 'bt_jobs'; }

  function Query(table) {
    this.table = table;
    this._filters = [];
    this._single = false;
    this._op = 'select';
    this._payload = null;
    this._order = null;
  }
  Query.prototype.select = function () { this._op = 'select'; return this; };
  Query.prototype.insert = function (payload) { this._op = 'insert'; this._payload = payload; return this; };
  Query.prototype.update = function (payload) { this._op = 'update'; this._payload = payload; return this; };
  Query.prototype.eq = function (col, val) { this._filters.push([col, val]); return this; };
  Query.prototype.order = function (col, opts) { this._order = [col, (opts && opts.ascending === false) ? -1 : 1]; return this; };
  Query.prototype.single = function () { this._single = true; return this; };

  Query.prototype._run = function () {
    var key = keyFor(this.table);
    var rows = load(key, []);
    var self = this;
    function matches(r) { return self._filters.every(function (f) { return r[f[0]] === f[1]; }); }

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
