/* ============================================================================
   Better Tap CRM — configuration
   ----------------------------------------------------------------------------
   The CRM currently runs in self-contained DEMO mode (see demo-backend.js),
   so these values just need to be non-empty. The login + workspace work with
   no external service.

   To switch to REAL Supabase auth (secure, multi-user, shared data):
     1. Create a project at supabase.com and run crm/supabase-schema.sql.
     2. Paste your Project URL + anon key below.
     3. In index.html and app.html, replace
          <script src="assets/js/demo-backend.js"></script>
        with
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     The anon/public key is SAFE to ship in front-end code. NEVER paste the
     service_role key here.
   ============================================================================ */
window.BT_CONFIG = {
  SUPABASE_URL:      'demo-mode',
  SUPABASE_ANON_KEY: 'demo-mode'
};
