/* ============================================================================
   Better Tap CRM — app logic (role-gated dashboard)
   Security is enforced server-side by Supabase Row-Level Security.
   This file only decides what to SHOW; the database decides what you can READ.
   ============================================================================ */
(function () {
  'use strict';

  var cfg = window.BT_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('PASTE') === 0) {
    document.getElementById('boot').innerHTML =
      '<div><b>CRM not configured.</b><br>Add your Supabase URL + anon key in <code>assets/js/config.js</code>.</div>';
    return;
  }
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  /* ---------- role model ---------- */
  var ROLE_LABEL = {
    ceo: 'CEO / Owner',
    operations: 'Head of Operations',
    customer_service_sales: 'Customer Service / Sales',
    installer: 'Installations & Repairs'
  };
  // which sections each role can open
  var ACCESS = {
    ceo:                    ['overview','jobs','customers','sales','support','inventory','reports','team'],
    operations:             ['overview','jobs','inventory','reports'],
    customer_service_sales: ['overview','customers','sales','support','jobs'],
    installer:              ['overview','jobs']
  };

  var ICON = {
    overview:'M3 12l9-9 9 9M5 10v10h14V10',
    jobs:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87',
    sales:'M3 3v18h18M7 14l4-4 3 3 5-6',
    support:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    inventory:'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    reports:'M3 3v18h18M9 17V9M13 17V5M17 17v-6',
    team:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
  };
  var TITLES = {
    overview:['Overview','Your snapshot for today'],
    jobs:['Installations & Repairs','Scheduled jobs and their status'],
    customers:['Customers','Customer directory & accounts'],
    sales:['Sales & Leads','Pipeline and opportunities'],
    support:['Support','Customer service inbox & tickets'],
    inventory:['Inventory & Orders','Stock, fulfilment and suppliers'],
    reports:['Reports','Performance dashboards'],
    team:['Team','Manage people and assign roles']
  };
  var NAV_LABEL = {
    overview:'Overview', jobs:'Installs & Repairs', customers:'Customers', sales:'Sales & Leads',
    support:'Support', inventory:'Inventory & Orders', reports:'Reports', team:'Team'
  };

  var me = null; // {id,email,full_name,role}
  var el = function (id){ return document.getElementById(id); };
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  /* ---------- boot ---------- */
  sb.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { window.location.href = 'index.html'; return; }
    return sb.from('profiles').select('id,email,full_name,role,active').eq('id', session.user.id).single()
      .then(function (r) {
        if (r.error || !r.data) {
          el('boot').innerHTML = '<div><b>Profile not found.</b><br>' +
            'Your login worked but no profile row exists. Make sure the database setup (supabase-schema.sql) was run.</div>';
          return;
        }
        me = r.data;
        if (me.active === false) {
          el('boot').innerHTML = '<div><b>Account disabled.</b><br>Ask the CEO to re-activate your account.</div>';
          return;
        }
        startApp();
      });
  }).catch(function(err){
    el('boot').innerHTML = '<div><b>Could not load workspace.</b><br>'+esc(err.message||'')+'</div>';
  });

  function startApp(){
    el('boot').style.display = 'none';
    el('app').style.display = '';
    el('uName').textContent = me.full_name || me.email;
    el('uRole').textContent = ROLE_LABEL[me.role] || me.role;

    el('signout').addEventListener('click', function(){
      sb.auth.signOut().then(function(){ window.location.href = 'index.html'; });
    });
    el('menuBtn').addEventListener('click', function(){ el('side').classList.toggle('open'); });

    // build nav from this role's access list
    var nav = el('nav'); nav.innerHTML = '';
    ACCESS[me.role].forEach(function (key) {
      var b = document.createElement('button');
      b.setAttribute('data-sec', key);
      b.innerHTML = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="'+ICON[key]+'"/></svg>' +
        '<span>'+NAV_LABEL[key]+'</span>';
      b.addEventListener('click', function(){ openSection(key); el('side').classList.remove('open'); });
      nav.appendChild(b);
    });

    openSection('overview');
  }

  function openSection(key){
    if (ACCESS[me.role].indexOf(key) === -1) key = 'overview';
    document.querySelectorAll('#nav button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-sec') === key);
    });
    el('secTitle').textContent = TITLES[key][0];
    el('secSub').textContent = TITLES[key][1];
    var c = el('content'); c.innerHTML = '<div class="center-state"><div class="spinner"></div></div>';
    ({
      overview:renderOverview, jobs:renderJobs, customers:renderCustomers, sales:renderSales,
      support:renderSupport, inventory:renderInventory, reports:renderReports, team:renderTeam
    }[key] || renderOverview)(c);
  }

  /* ---------- helpers ---------- */
  function kpi(label, value, hint){
    return '<div class="card kpi"><div class="label">'+esc(label)+'</div>' +
      '<div class="value">'+esc(value)+'</div>'+(hint?'<div class="hint">'+esc(hint)+'</div>':'')+'</div>';
  }
  function ph(title, body){
    return '<div class="placeholder"><b>'+esc(title)+'</b>'+esc(body||'')+'</div>';
  }
  function fmtDate(s){ if(!s) return '—'; var d=new Date(s); return isNaN(d)?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }

  /* ---------- OVERVIEW ---------- */
  function renderOverview(c){
    var hi = 'Welcome back, ' + esc((me.full_name||me.email).split(' ')[0]) + '.';
    if (me.role === 'installer'){
      return loadJobs(function(jobs){
        var today = jobs.filter(function(j){ return j.status!=='done' && j.status!=='cancelled'; });
        c.innerHTML = '<p class="sub" style="margin-bottom:18px">'+hi+' Here are your jobs.</p>' +
          '<div class="grid kpis">' +
            kpi('Open jobs', today.length, 'assigned to you') +
            kpi('Completed', jobs.filter(function(j){return j.status==='done';}).length, 'all time') +
          '</div><div style="height:18px"></div>' + jobsTable(jobs, true, false);
      });
    }
    if (me.role === 'operations'){
      return loadJobs(function(jobs){
        c.innerHTML = '<p class="sub" style="margin-bottom:18px">'+hi+'</p><div class="grid kpis">' +
          kpi('Scheduled jobs', jobs.filter(function(j){return j.status==='scheduled';}).length) +
          kpi('In progress', jobs.filter(function(j){return j.status==='in_progress';}).length) +
          kpi('Completed', jobs.filter(function(j){return j.status==='done';}).length) +
        '</div><div style="height:22px"></div>' +
        ph('Inventory & orders', 'Live stock and Shopify orders will appear here once that data source is connected.');
      });
    }
    if (me.role === 'customer_service_sales'){
      c.innerHTML = '<p class="sub" style="margin-bottom:18px">'+hi+'</p><div class="grid kpis">' +
        kpi('Open tickets', '—', 'connect support inbox') +
        kpi('Active leads', '—', 'connect sales pipeline') +
        kpi('Customers', '—', 'connect customer source') +
      '</div><div style="height:22px"></div>' +
      ph('Customers, sales & support', 'These dashboards are ready and will fill in once we connect your data sources (Shopify customers/orders + a support inbox).');
      return;
    }
    // CEO
    return loadJobs(function(jobs){
      c.innerHTML = '<p class="sub" style="margin-bottom:18px">'+hi+' Full company view.</p><div class="grid kpis">' +
        kpi('Revenue (MTD)','—','connect Shopify') +
        kpi('Orders (MTD)','—','connect Shopify') +
        kpi('Open jobs', jobs.filter(function(j){return j.status!=='done'&&j.status!=='cancelled';}).length,'installs & repairs') +
        kpi('Team', '—','see Team page') +
      '</div><div style="height:22px"></div>' +
      '<div class="grid" style="grid-template-columns:1fr 1fr">' +
        ph('Sales & revenue reports','Wire Shopify and these populate automatically.') +
        ph('Operations & support','Inventory, fulfilment and support metrics land here.') +
      '</div>';
    });
  }

  /* ---------- JOBS ---------- */
  function loadJobs(cb){
    sb.from('jobs').select('*').order('scheduled_for', { ascending: true }).then(function(r){
      if (r.error){ el('content').innerHTML = ph('Could not load jobs', r.error.message); return; }
      cb(r.data || []);
    });
  }
  function jobsTable(jobs, installerView, canManage){
    if (!jobs.length) return ph('No jobs yet', installerView ? 'No jobs are assigned to you right now.' : 'No jobs scheduled yet.');
    var rows = jobs.map(function(j){
      var status = installerView
        ? '<select data-job="'+j.id+'" class="js-status">' +
            ['scheduled','in_progress','done'].map(function(s){ return '<option value="'+s+'"'+(j.status===s?' selected':'')+'>'+s.replace('_',' ')+'</option>'; }).join('') +
          '</select>'
        : '<span class="pill '+esc(j.status)+'">'+esc(j.status.replace('_',' '))+'</span>';
      return '<tr>' +
        '<td><b>'+esc(j.customer_name||'—')+'</b><br><span style="color:var(--ink-40);font-size:.82rem">'+esc(j.kind)+'</span></td>' +
        '<td>'+esc(j.address||'—')+(j.phone?'<br><span style="color:var(--ink-60);font-size:.82rem">'+esc(j.phone)+'</span>':'')+'</td>' +
        '<td>'+fmtDate(j.scheduled_for)+'</td>' +
        '<td>'+status+'</td>' +
        (canManage ? '<td><button class="btn sm ghost js-edit" data-job="'+j.id+'">Edit</button></td>' : '') +
        '</tr>';
    }).join('');
    var head = '<tr><th>Customer</th><th>Address</th><th>Scheduled</th><th>Status</th>'+(canManage?'<th></th>':'')+'</tr>';
    var html = '<div class="card" style="padding:6px 6px 2px"><table class="table"><thead>'+head+'</thead><tbody>'+rows+'</tbody></table></div>';
    return html;
  }
  function renderJobs(c){
    var canManage = (me.role === 'ceo' || me.role === 'operations');
    var installerView = (me.role === 'installer');
    loadJobs(function(jobs){
      var bar = canManage ? '<div class="toolbar"><button class="btn sm" id="addJob">+ New job</button></div>' : '';
      c.innerHTML = bar + jobsTable(jobs, installerView, canManage);
      if (canManage){
        el('addJob').addEventListener('click', function(){ jobModal(null); });
        c.querySelectorAll('.js-edit').forEach(function(b){
          b.addEventListener('click', function(){ jobModal(jobs.filter(function(j){return j.id===b.getAttribute('data-job');})[0]); });
        });
      }
      if (installerView){
        c.querySelectorAll('.js-status').forEach(function(sel){
          sel.addEventListener('change', function(){
            sel.disabled = true;
            sb.from('jobs').update({ status: sel.value }).eq('id', sel.getAttribute('data-job')).then(function(r){
              sel.disabled = false;
              if (r.error) alert('Could not update: ' + r.error.message);
            });
          });
        });
      }
    });
  }

  /* job add/edit modal (CEO + Operations) */
  function jobModal(job){
    var isNew = !job; job = job || { kind:'installation', status:'scheduled' };
    el('modalTitle').textContent = isNew ? 'New job' : 'Edit job';
    // installer options
    sb.from('profiles').select('id,full_name,email,role').eq('role','installer').then(function(r){
      var installers = (r.data||[]);
      var opts = '<option value="">— Unassigned —</option>' + installers.map(function(p){
        return '<option value="'+p.id+'"'+(job.assigned_to===p.id?' selected':'')+'>'+esc(p.full_name||p.email)+'</option>'; }).join('');
      var sched = job.scheduled_for ? new Date(job.scheduled_for).toISOString().slice(0,16) : '';
      el('modalBody').innerHTML =
        '<div class="field"><label>Type</label><select id="m_kind"><option value="installation"'+(job.kind==='installation'?' selected':'')+'>Installation</option><option value="repair"'+(job.kind==='repair'?' selected':'')+'>Repair</option></select></div>' +
        '<div class="field"><label>Customer name</label><input id="m_name" value="'+esc(job.customer_name||'')+'"></div>' +
        '<div class="field"><label>Address</label><input id="m_addr" value="'+esc(job.address||'')+'"></div>' +
        '<div class="field"><label>Phone</label><input id="m_phone" value="'+esc(job.phone||'')+'"></div>' +
        '<div class="field"><label>Scheduled for</label><input id="m_sched" type="datetime-local" value="'+sched+'"></div>' +
        '<div class="field"><label>Assign to</label><select id="m_assign">'+opts+'</select></div>' +
        '<div class="field"><label>Status</label><select id="m_status">'+['scheduled','in_progress','done','cancelled'].map(function(s){return '<option value="'+s+'"'+(job.status===s?' selected':'')+'>'+s.replace('_',' ')+'</option>';}).join('')+'</select></div>' +
        '<div class="field"><label>Notes</label><input id="m_notes" value="'+esc(job.notes||'')+'"></div>';
      el('modal').classList.add('show');

      el('modalCancel').onclick = function(){ el('modal').classList.remove('show'); };
      el('modalSave').onclick = function(){
        var payload = {
          kind: el('m_kind').value,
          customer_name: el('m_name').value.trim() || null,
          address: el('m_addr').value.trim() || null,
          phone: el('m_phone').value.trim() || null,
          scheduled_for: el('m_sched').value ? new Date(el('m_sched').value).toISOString() : null,
          assigned_to: el('m_assign').value || null,
          status: el('m_status').value,
          notes: el('m_notes').value.trim() || null
        };
        el('modalSave').disabled = true;
        var q = isNew ? sb.from('jobs').insert(payload) : sb.from('jobs').update(payload).eq('id', job.id);
        q.then(function(r){
          el('modalSave').disabled = false;
          if (r.error){ alert('Could not save: ' + r.error.message); return; }
          el('modal').classList.remove('show');
          openSection('jobs');
        });
      };
    });
  }

  /* ---------- TEAM (CEO only) ---------- */
  function renderTeam(c){
    if (me.role !== 'ceo'){ c.innerHTML = ph('Restricted','Only the CEO can manage the team.'); return; }
    sb.from('profiles').select('id,email,full_name,role,active').order('created_at',{ascending:true}).then(function(r){
      if (r.error){ c.innerHTML = ph('Could not load team', r.error.message); return; }
      var people = r.data||[];
      var rows = people.map(function(p){
        var isSelf = p.id === me.id;
        var roleSel = '<select data-uid="'+p.id+'" class="js-role"'+(isSelf?' disabled':'')+'>' +
          Object.keys(ROLE_LABEL).map(function(k){ return '<option value="'+k+'"'+(p.role===k?' selected':'')+'>'+ROLE_LABEL[k]+'</option>'; }).join('') +
          '</select>';
        return '<tr>' +
          '<td><b>'+esc(p.full_name||'—')+'</b>'+(isSelf?' <span class="role-badge">you</span>':'')+'<br><span style="color:var(--ink-60);font-size:.82rem">'+esc(p.email)+'</span></td>' +
          '<td>'+roleSel+'</td>' +
          '<td>'+(p.active===false?'<span class="pill cancelled">disabled</span>':'<span class="pill done">active</span>')+'</td>' +
          '</tr>';
      }).join('');
      c.innerHTML =
        '<p class="sub" style="margin-bottom:16px">Set each person\'s role. Changes take effect the next time they load the workspace.</p>' +
        '<div class="card" style="padding:6px 6px 2px"><table class="table"><thead><tr><th>Person</th><th>Role</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
      c.querySelectorAll('.js-role').forEach(function(sel){
        var prev = sel.value;
        sel.addEventListener('change', function(){
          sel.disabled = true;
          sb.from('profiles').update({ role: sel.value }).eq('id', sel.getAttribute('data-uid')).then(function(r){
            sel.disabled = false;
            if (r.error){ alert('Could not change role: ' + r.error.message); sel.value = prev; return; }
            prev = sel.value;
          });
        });
      });
    });
  }

  /* ---------- data-dependent sections (honest placeholders) ---------- */
  function renderCustomers(c){
    c.innerHTML = ph('Customer directory', 'Ready to connect. We can pull your customer list from Shopify so Ruchama (CS/Sales) and the CEO see real accounts, orders and contact history here.');
  }
  function renderSales(c){
    c.innerHTML = ph('Sales & leads pipeline', 'Ready to connect. Tell me where leads come from (web form, Shopify, a sheet) and this becomes a live pipeline with stages.');
  }
  function renderSupport(c){
    c.innerHTML = ph('Support inbox & tickets', 'Ready to connect. Point me at the support email/inbox and tickets will appear here with status and assignment.');
  }
  function renderInventory(c){
    c.innerHTML = ph('Inventory & orders', 'Ready to connect. We can sync stock levels and orders from Shopify so Operations sees fulfilment status and low-stock alerts.');
  }
  function renderReports(c){
    var which = me.role === 'operations' ? 'operations' : (me.role === 'customer_service_sales' ? 'CS & sales' : 'company');
    c.innerHTML = ph('Reports — '+which, 'Ready to build. Once the underlying data (Shopify sales/orders + jobs) is flowing, this shows the charts and exports for your role.');
  }
})();
