/* ============================================================================
   Better Tap CRM — field-service app logic (role-gated)
   Security is enforced server-side by Supabase RLS. This file decides what to
   SHOW; the database decides what you can READ. Demo mode uses demo-backend.js.
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
  var TS = window.BT_TS || { TREE: {}, OUTCOMES: {}, ROOT: 'root' };

  /* ---------- role model ---------- */
  var ROLE_LABEL = {
    ceo: 'CEO / Owner',
    marketing: 'Marketing',
    sales: 'Sales',
    customer_service: 'Customer Service',
    customer_service_sales: 'Customer Service / Sales',
    operations: 'Head of Operations',
    installer: 'Installations & Repairs'
  };
  var ACCESS = {
    ceo:                    ['overview','console','customers','pipeline','support','dispatch','jobs','inventory','marketing','reports','team'],
    operations:             ['overview','dispatch','jobs','inventory','reports'],
    customer_service:       ['overview','console','support','customers'],
    customer_service_sales: ['overview','console','support','pipeline','customers'],
    sales:                  ['overview','pipeline','customers'],
    marketing:              ['overview','marketing','reports'],
    installer:              ['overview','myday']
  };
  var ICON = {
    overview:'M3 12l9-9 9 9M5 10v10h14V10',
    console:'M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z',
    customers:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87',
    pipeline:'M3 3v18h18M7 14l4-4 3 3 5-6',
    support:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    dispatch:'M9 20l-5-3V4l5 3m0 13 6-3m-6 3V7m6 10 5 3V7l-5-3m0 13V4',
    jobs:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    myday:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    inventory:'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
    marketing:'M3 11l18-5v12L3 14zM11.6 16.8a3 3 0 1 1-5.8-1.6',
    reports:'M3 3v18h18M9 17V9M13 17V5M17 17v-6',
    team:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
  };
  var TITLES = {
    overview:['Overview','Your snapshot for today'],
    console:['Call console','Take a call — guided, step by step'],
    customers:['Customers','Customer 360 — machines, orders, cases & history'],
    pipeline:['Sales & Leads','Pipeline, leads and orders'],
    support:['Support','Cases & omnichannel inbox'],
    dispatch:['Dispatch','Assign & route jobs'],
    jobs:['Jobs','All work orders'],
    myday:['My day','Your route and job cards'],
    inventory:['Inventory','Parts, stock & reorder alerts'],
    marketing:['Marketing','Leads, funnel & campaigns'],
    reports:['Reports','Performance dashboards'],
    team:['Team','Manage people and assign roles']
  };
  var NAV_LABEL = {
    overview:'Overview', console:'Take a call', customers:'Customers', pipeline:'Sales & Leads',
    support:'Support', dispatch:'Dispatch', jobs:'Jobs', myday:'My day',
    inventory:'Inventory', marketing:'Marketing', reports:'Reports', team:'Team'
  };

  var me = null;
  var current360 = null; // customer id when viewing 360
  var el = function (id){ return document.getElementById(id); };
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  /* ---------- formatting helpers ---------- */
  function money(n){ n = Number(n||0); return '$' + n.toLocaleString('en-US'); }
  function fmtDate(s){ if(!s) return '—'; var d=new Date(s); return isNaN(d)?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}); }
  function fmtDay(s){ if(!s) return '—'; var d=new Date(s); return isNaN(d)?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  function daysFromNow(iso){ return Math.round((new Date(iso) - Date.now())/86400000); }
  function dueInfo(iso){
    if(!iso) return { cls:'', txt:'—' };
    var diff = daysFromNow(iso);
    if(diff < 0) return { cls:'cancelled', txt:'overdue '+(-diff)+'d' };
    if(diff <= 30) return { cls:'in_progress', txt:'due in '+diff+'d' };
    return { cls:'done', txt:fmtDay(iso) };
  }
  function badge(cls,txt){ return '<span class="pill '+esc(cls||'')+'">'+esc(txt)+'</span>'; }
  function prioPill(p){ var m={P1_urgent:'cancelled',P2_high:'in_progress',P3_normal:'scheduled',P4_low:''}; return badge(m[p]||'', (p||'').replace(/^P\d_/,'').toUpperCase()); }

  function fetchMany(tables){
    return Promise.all(tables.map(function(t){ return sb.from(t).select('*').then(function(r){ return r.data||[]; }); }))
      .then(function(arrs){ var o={}; tables.forEach(function(t,i){ o[t]=arrs[i]; }); return o; });
  }
  function byId(arr, id){ for(var i=0;i<arr.length;i++){ if(arr[i].id===id) return arr[i]; } return null; }

  /* ---------- toast ---------- */
  var toastEl, toastTimer;
  function toast(msg){
    if(!toastEl){ toastEl=document.createElement('div'); toastEl.className='toast'; document.body.appendChild(toastEl); }
    toastEl.textContent=msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer=setTimeout(function(){ toastEl.classList.remove('show'); },2400);
  }
  /* ---------- modal ---------- */
  function openModal(title, html, onSave, saveLabel){
    el('modalTitle').textContent=title; el('modalBody').innerHTML=html;
    el('modalSave').textContent=saveLabel||'Save';
    el('modal').classList.add('show');
    el('modalCancel').onclick=function(){ el('modal').classList.remove('show'); };
    el('modalSave').onclick=function(){ onSave(function(){ el('modal').classList.remove('show'); }); };
  }

  /* ---------- boot ---------- */
  sb.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (!session) { window.location.href = 'index.html'; return; }
    return sb.from('profiles').select('*').eq('id', session.user.id).single().then(function (r) {
      if (r.error || !r.data) {
        el('boot').innerHTML = '<div><b>Profile not found.</b><br>Login worked but no profile row exists. Run supabase-schema.sql.</div>'; return;
      }
      me = r.data;
      if (me.active === false) { el('boot').innerHTML = '<div><b>Account disabled.</b><br>Ask the CEO to re-activate your account.</div>'; return; }
      if (!ACCESS[me.role]) me.role = 'customer_service';
      startApp();
    });
  }).catch(function(err){ el('boot').innerHTML = '<div><b>Could not load workspace.</b><br>'+esc(err.message||'')+'</div>'; });

  function startApp(){
    el('boot').style.display='none'; el('app').style.display='';
    el('uName').textContent = me.full_name || me.email;
    el('uRole').textContent = ROLE_LABEL[me.role] || me.role;
    el('signout').addEventListener('click', function(){ sb.auth.signOut().then(function(){ window.location.href='index.html'; }); });
    el('menuBtn').addEventListener('click', function(){ el('side').classList.toggle('open'); });

    var nav = el('nav'); nav.innerHTML='';
    ACCESS[me.role].forEach(function (key) {
      var b=document.createElement('button'); b.setAttribute('data-sec',key);
      b.innerHTML='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+ICON[key]+'"/></svg><span>'+NAV_LABEL[key]+'</span>';
      b.addEventListener('click', function(){ openSection(key); el('side').classList.remove('open'); });
      nav.appendChild(b);
    });

    injectGlobalSearch();
    ensureDueTasks();
    openSection('overview');
  }

  function openSection(key){
    if (ACCESS[me.role].indexOf(key)===-1) key='overview';
    if (key!=='customers') current360=null;
    document.querySelectorAll('#nav button').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-sec')===key); });
    el('secTitle').textContent=TITLES[key][0]; el('secSub').textContent=TITLES[key][1];
    var c=el('content'); c.innerHTML='<div class="center-state"><div class="spinner"></div></div>';
    ({ overview:renderOverview, console:renderConsole, customers:renderCustomers, pipeline:renderPipeline,
       support:renderSupport, dispatch:renderDispatch, jobs:renderJobs, myday:renderMyDay,
       inventory:renderInventory, marketing:renderMarketing, reports:renderReports, team:renderTeam
    }[key] || renderOverview)(c);
  }
  function goCustomer(id){ current360=id; openSection('customers'); }

  /* ---------- global search (customer by phone / name / email) ---------- */
  function injectGlobalSearch(){
    var head = document.querySelector('.main__head');
    if(!head || document.getElementById('gsearch')) return;
    var wrap = document.createElement('div'); wrap.className='gsearch';
    wrap.innerHTML = '<input id="gsearch" placeholder="Search customers — name, phone or email…" autocomplete="off"><div class="gsearch__res" id="gsearchRes"></div>';
    head.appendChild(wrap);
    var inp=el('gsearch'), res=el('gsearchRes');
    inp.addEventListener('input', function(){
      var q=inp.value.trim().toLowerCase();
      if(q.length<2){ res.innerHTML=''; res.classList.remove('open'); return; }
      sb.from('customers').select('*').then(function(r){
        var hits=(r.data||[]).filter(function(c){
          return (c.name||'').toLowerCase().indexOf(q)!==-1 ||
                 (c.emails||[]).join(' ').toLowerCase().indexOf(q)!==-1 ||
                 (c.phones||[]).join(' ').toLowerCase().indexOf(q)!==-1;
        }).slice(0,8);
        res.innerHTML = hits.length ? hits.map(function(c){
          return '<button data-cid="'+c.id+'"><b>'+esc(c.name)+'</b><span>'+esc((c.phones||[])[0]||'')+' · '+esc((c.emails||[])[0]||'')+'</span></button>';
        }).join('') : '<div class="gsearch__empty">No matches</div>';
        res.classList.add('open');
        res.querySelectorAll('[data-cid]').forEach(function(b){ b.addEventListener('click', function(){
          inp.value=''; res.classList.remove('open'); goCustomer(b.getAttribute('data-cid'));
        }); });
      });
    });
    document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) res.classList.remove('open'); });
  }

  /* ---------- cross-cutting: auto filter/UV due tasks ---------- */
  function ensureDueTasks(){
    if(['ceo','operations','customer_service','customer_service_sales'].indexOf(me.role)===-1) return;
    fetchMany(['machines','tasks','customers']).then(function(db){
      var toAdd=[];
      db.machines.forEach(function(m){
        if(m.status!=='active') return;
        ['filter','uv'].forEach(function(kind){
          var due = kind==='filter'? m.filter_due : m.uv_due;
          if(!due || daysFromNow(due) > 30) return;
          var key = kind+':'+m.id;
          var exists = db.tasks.some(function(t){ return t.auto_key===key ||
            (t.related_id===m.customer_id && new RegExp(kind==='filter'?'filter':'uv','i').test(t.title||'')); });
          if(exists) return;
          var cust = byId(db.customers, m.customer_id);
          toAdd.push({ related_type:'customer', related_id:m.customer_id, auto_key:key,
            title:(kind==='filter'?'Filter':'UV-C lamp')+' due — reach out to '+(cust?cust.name:'customer'),
            due_date:due, assignee_id:null, status:'open' });
        });
      });
      if(toAdd.length) sb.from('tasks').insert(toAdd);
    });
  }

  /* ---------- shared UI helpers ---------- */
  function kpi(label,value,hint){ return '<div class="card kpi"><div class="label">'+esc(label)+'</div><div class="value">'+esc(value)+'</div>'+(hint?'<div class="hint">'+esc(hint)+'</div>':'')+'</div>'; }
  function ph(title,body){ return '<div class="placeholder"><b>'+esc(title)+'</b>'+esc(body||'')+'</div>'; }
  function tableCard(head, rows, style){ return '<div class="card" style="padding:6px 6px 2px'+(style?';'+style:'')+'"><table class="table"><thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div>'; }
  function section(title, body){ return '<h3 class="blk-title">'+esc(title)+'</h3>'+body; }

  /* ============================ OVERVIEW ============================ */
  function renderOverview(c){
    var hi='Welcome back, '+esc((me.full_name||me.email).split(' ')[0])+'.';
    if(me.role==='installer') return renderMyDay(c);

    if(me.role==='sales'){
      return fetchMany(['orders','customers']).then(function(db){
        var open=db.orders.filter(function(o){ return ['lead','qualified','quote'].indexOf(o.stage)!==-1; });
        var pipeVal=open.reduce(function(s,o){ return s+Number(o.amount_total||0); },0);
        c.innerHTML='<p class="sub">'+hi+'</p><div class="grid kpis">'+
          kpi('Open pipeline', open.length, 'leads / quotes')+
          kpi('Pipeline value', money(pipeVal))+
          kpi('Prospects', db.customers.filter(function(x){return x.type==='prospect';}).length)+
          '</div><div style="height:18px"></div><button class="btn" onclick="">Go to pipeline →</button>';
        c.querySelector('button').addEventListener('click', function(){ openSection('pipeline'); });
      });
    }
    if(me.role==='marketing') return renderMarketing(c);

    if(me.role==='customer_service' || me.role==='customer_service_sales'){
      return fetchMany(['cases','tasks']).then(function(db){
        var open=db.cases.filter(function(x){ return x.status==='open'||x.status==='pending'; });
        var overdue=open.filter(function(x){ return x.sla_due && daysFromNow(x.sla_due)<0; });
        var tdue=db.tasks.filter(function(t){ return t.status==='open' && daysFromNow(t.due_date)<=3; });
        c.innerHTML='<p class="sub">'+hi+'</p>'+
          '<div class="cta-row"><button class="btn big" id="ovTakeCall">📞 Take a call</button></div>'+
          '<div class="grid kpis">'+
            kpi('Open cases', open.length, overdue.length?overdue.length+' overdue SLA':'within SLA')+
            kpi('Follow-ups due', tdue.length, 'next 3 days')+
          '</div><div style="height:18px"></div>'+
          section('Follow-ups', taskList(tdue));
        el('ovTakeCall').addEventListener('click', function(){ openSection('console'); });
      });
    }
    if(me.role==='operations'){
      return fetchMany(['jobs','parts','cases']).then(function(db){
        var un=db.jobs.filter(function(j){return j.status==='unscheduled';});
        var low=db.parts.filter(function(p){return p.qty_on_hand<=p.reorder_level;});
        c.innerHTML='<p class="sub">'+hi+'</p><div class="grid kpis">'+
          kpi('Unassigned jobs', un.length,'need scheduling')+
          kpi('Scheduled', db.jobs.filter(function(j){return j.status==='scheduled';}).length)+
          kpi('In progress', db.jobs.filter(function(j){return j.status==='in_progress';}).length)+
          kpi('Low stock', low.length,'below reorder')+
        '</div><div style="height:18px"></div>'+
        section('Needs scheduling', un.length? jobsTable(un,false,false):ph('All caught up','No unassigned jobs.'));
      });
    }
    // CEO
    return fetchMany(['orders','jobs','cases','parts','profiles','customers']).then(function(db){
      var mtd=db.orders.filter(function(o){ return new Date(o.order_date).getMonth()===new Date().getMonth() && new Date(o.order_date).getFullYear()===new Date().getFullYear(); });
      var rev=db.orders.reduce(function(s,o){ return s+Number(o.amount_paid||0); },0);
      var openCases=db.cases.filter(function(x){return x.status==='open'||x.status==='pending';});
      var slaOk=db.cases.length? Math.round(100*db.cases.filter(function(x){ return !x.sla_due || x.status==='resolved'||x.status==='closed' || daysFromNow(x.sla_due)>=0; }).length/db.cases.length):100;
      var pipe=db.orders.filter(function(o){return ['lead','qualified','quote'].indexOf(o.stage)!==-1;}).reduce(function(s,o){return s+Number(o.amount_total||0);},0);
      var low=db.parts.filter(function(p){return p.qty_on_hand<=p.reorder_level;});
      c.innerHTML='<p class="sub">'+hi+' Full company view.</p><div class="grid kpis">'+
        kpi('Revenue (collected)', money(rev), mtd.length+' orders MTD')+
        kpi('Installs', db.jobs.filter(function(j){return j.kind==='installation'&&j.status==='done';}).length,'completed')+
        kpi('Open cases', openCases.length, 'SLA '+slaOk+'%')+
        kpi('Pipeline value', money(pipe))+
        kpi('Team', db.profiles.length,'people')+
        kpi('Inventory alerts', low.length, low.length?'reorder needed':'stock healthy')+
      '</div><div style="height:20px"></div>'+
      '<div class="grid two">'+
        '<div>'+section('Open cases', openCases.length?casesTable(openCases,db.customers):ph('No open cases','All clear.'))+'</div>'+
        '<div>'+section('Low stock', low.length?partsTable(low):ph('Stock healthy','Nothing below reorder level.'))+'</div>'+
      '</div>';
    });
  }

  function taskList(tasks){
    if(!tasks.length) return ph('No follow-ups','Nothing due right now.');
    return '<div class="card" style="padding:6px 6px 2px"><table class="table"><tbody>'+tasks.map(function(t){
      var di=dueInfo(t.due_date);
      return '<tr><td><b>'+esc(t.title)+'</b></td><td style="text-align:right">'+badge(di.cls,di.txt)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  }

  /* ============================ CUSTOMERS + 360 ============================ */
  function renderCustomers(c){
    if(current360) return renderCustomer360(c, current360);
    fetchMany(['customers','profiles']).then(function(db){
      var canAdd = ['ceo','sales','customer_service','customer_service_sales'].indexOf(me.role)!==-1;
      var rows=db.customers.map(function(x){
        var owner=byId(db.profiles,x.owner_id);
        return '<tr class="js-row" data-cid="'+x.id+'" style="cursor:pointer">'+
          '<td><b>'+esc(x.name)+'</b><br><span class="muted">'+esc((x.phones||[])[0]||'')+'</span></td>'+
          '<td>'+esc(x.install_address||'—')+'</td>'+
          '<td>'+badge(x.type==='customer'?'done':'scheduled', x.type)+'</td>'+
          '<td>'+esc(x.lead_source||'—')+'</td>'+
          '<td>'+esc(owner?owner.full_name:'—')+'</td></tr>';
      }).join('');
      c.innerHTML=(canAdd?'<div class="toolbar"><button class="btn sm" id="addCust">+ New customer</button></div>':'')+
        tableCard('<th>Customer</th><th>Address</th><th>Type</th><th>Source</th><th>Owner</th>', rows||'');
      c.querySelectorAll('.js-row').forEach(function(r){ r.addEventListener('click', function(){ goCustomer(r.getAttribute('data-cid')); }); });
      if(canAdd) el('addCust').addEventListener('click', function(){ customerModal(null); });
    });
  }

  function renderCustomer360(c, id){
    fetchMany(['customers','machines','orders','cases','interactions','jobs','tasks','profiles']).then(function(db){
      var x=byId(db.customers,id);
      if(!x){ c.innerHTML=ph('Customer not found',''); return; }
      var owner=byId(db.profiles,x.owner_id);
      var machines=db.machines.filter(function(m){return m.customer_id===id;});
      var orders=db.orders.filter(function(o){return o.customer_id===id;});
      var cases=db.cases.filter(function(o){return o.customer_id===id;});
      var inter=db.interactions.filter(function(o){return o.customer_id===id;}).sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
      var jobs=db.jobs.filter(function(o){return o.customer_id===id;});
      var tasks=db.tasks.filter(function(o){return o.related_type==='customer'&&o.related_id===id;});

      var head='<div class="c360-head"><button class="btn sm ghost" id="back360">← Customers</button>'+
        '<div class="c360-id"><h2>'+esc(x.name)+' '+(x.tags||[]).map(function(t){return badge('',t);}).join('')+'</h2>'+
        '<div class="muted">'+esc((x.phones||[]).join(' · '))+' &nbsp;•&nbsp; '+esc((x.emails||[]).join(' '))+'</div>'+
        '<div class="muted">'+esc(x.install_address||'')+'</div>'+
        '<div class="muted">Owner: '+esc(owner?owner.full_name:'—')+' · Source: '+esc(x.lead_source||'—')+' · '+(x.marketing_opt_in?'opted-in':'no marketing')+'</div></div></div>';

      var tabs=['Machines','Orders','Cases','Timeline','Jobs','Tasks','Notes'];
      var tabbar='<div class="tabbar">'+tabs.map(function(t,i){return '<button class="tab'+(i===0?' active':'')+'" data-tab="'+t+'">'+t+(t==='Machines'&&machines.length?' ('+machines.length+')':'')+(t==='Cases'&&cases.length?' ('+cases.length+')':'')+'</button>';}).join('')+'</div>';

      function machinesPane(){ return machines.length? machines.map(function(m){
        var fd=dueInfo(m.filter_due), ud=dueInfo(m.uv_due);
        return '<div class="card"><div class="card-head"><h3>'+esc(m.model)+' — '+esc(m.color)+'</h3>'+badge(m.status==='active'?'done':'', m.status)+'</div>'+
          '<div class="specs">'+
          spec('Serial', esc(m.serial_number))+ spec('Installed', fmtDay(m.install_date))+
          spec('Warranty until', fmtDay(m.warranty_until))+ spec('Location', esc(m.location_in_home||'—'))+
          spec('Filter due', badge(fd.cls,fd.txt))+ spec('UV-C lamp due', badge(ud.cls,ud.txt))+
          '</div></div>';
      }).join(''):ph('No machine registered','No installed asset on file yet.'); }
      function ordersPane(){ return orders.length? tableCard('<th>Order</th><th>Plan</th><th>Total</th><th>Paid</th><th>Balance</th><th>Stage</th>',
        orders.map(function(o){ return '<tr><td>'+esc(o.shopify_order_id||o.id.slice(0,6))+'<br><span class="muted">'+fmtDay(o.order_date)+'</span></td><td>'+esc(o.plan)+'</td><td>'+money(o.amount_total)+'</td><td>'+money(o.amount_paid)+'</td><td>'+money(o.balance)+'</td><td>'+badge('',o.stage)+'</td></tr>'; }).join('')):ph('No orders','')); }
      function casesPane(){ return cases.length? casesTable(cases,db.customers):ph('No cases',''); }
      function timelinePane(){ return inter.length? '<div class="timeline">'+inter.map(function(t){
        return '<div class="tl"><div class="tl__dot"></div><div class="tl__body"><div class="tl__top"><b>'+esc(t.type)+'</b> <span class="muted">'+esc(t.direction)+' · '+fmtDate(t.timestamp)+(t.duration_sec?' · '+Math.round(t.duration_sec/60)+'m':'')+'</span></div><div>'+esc(t.subject||'')+'</div><div class="muted">'+esc(t.body||'')+'</div></div></div>';
      }).join('')+'</div>':ph('No activity yet',''); }
      function jobsPane(){ return jobs.length? jobsTable(jobs,false,false):ph('No jobs',''); }
      function tasksPane(){ return taskList(tasks); }
      function notesPane(){ return '<div class="card"><textarea id="c360notes" style="width:100%;min-height:120px">'+esc(x.notes||'')+'</textarea><div style="margin-top:8px"><button class="btn sm" id="saveNotes">Save notes</button></div></div>'; }

      var PANES={Machines:machinesPane,Orders:ordersPane,Cases:casesPane,Timeline:timelinePane,Jobs:jobsPane,Tasks:tasksPane,Notes:notesPane};
      c.innerHTML=head+tabbar+'<div id="tabbody"></div>';
      function showTab(t){ c.querySelectorAll('.tab').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-tab')===t);}); el('tabbody').innerHTML=PANES[t]();
        if(t==='Notes'){ el('saveNotes').addEventListener('click', function(){ x.notes=el('c360notes').value; sb.from('customers').update({notes:x.notes}).eq('id',id).then(function(){ toast('Notes saved'); }); }); } }
      showTab('Machines');
      c.querySelectorAll('.tab').forEach(function(b){ b.addEventListener('click', function(){ showTab(b.getAttribute('data-tab')); }); });
      el('back360').addEventListener('click', function(){ current360=null; openSection('customers'); });
    });
  }
  function spec(k,v){ return '<div class="spec"><div class="k">'+esc(k)+'</div><div class="v">'+v+'</div></div>'; }

  function customerModal(onCreated){
    openModal('New customer',
      '<div class="field"><label>Name</label><input id="cm_name"></div>'+
      '<div class="field"><label>Phone</label><input id="cm_phone"></div>'+
      '<div class="field"><label>Email</label><input id="cm_email"></div>'+
      '<div class="field"><label>Install address</label><input id="cm_addr"></div>'+
      '<div class="field"><label>What do they want?</label><input id="cm_notes" placeholder="e.g. black unit, lease"></div>',
      function(close){
        var name=el('cm_name').value.trim(); if(!name){ toast('Add a name'); return; }
        var row={ name:name, phones:[el('cm_phone').value.trim()].filter(Boolean), emails:[el('cm_email').value.trim()].filter(Boolean),
          install_address:el('cm_addr').value.trim(), billing_address:'', type:'prospect', lead_source:'phone',
          utm_campaign:'', status:'new', tags:[], owner_id:me.id, marketing_opt_in:false, notes:el('cm_notes').value.trim() };
        sb.from('customers').insert(row).then(function(r){ close(); toast('Customer created'); var id=r.data[0].id; if(onCreated) onCreated(id); else goCustomer(id); });
      },'Create');
  }

  /* ============================ CALL CONSOLE (guided) ============================ */
  function renderConsole(c){
    var st={ step:'identify', customer:null, intent:null, node:TS.ROOT, path:[], startedAt:Date.now() };
    function frame(inner){ c.innerHTML='<div class="console">'+inner+'</div>'; }

    function stepIdentify(){
      frame('<div class="wiz"><div class="wiz__step">Step 1 · Identify the caller</div>'+
        '<input id="cwSearch" class="wiz__search" placeholder="Search by phone, name or email…" autocomplete="off">'+
        '<div id="cwHits"></div>'+
        '<div class="wiz__or">— or —</div><button class="btn ghost" id="cwNew">+ New caller (create prospect)</button></div>');
      var inp=el('cwSearch'), hits=el('cwHits');
      inp.addEventListener('input', function(){
        var q=inp.value.trim().toLowerCase(); if(q.length<2){ hits.innerHTML=''; return; }
        sb.from('customers').select('*').then(function(r){
          var found=(r.data||[]).filter(function(x){ return (x.name||'').toLowerCase().indexOf(q)!==-1 || (x.phones||[]).join(' ').toLowerCase().indexOf(q)!==-1 || (x.emails||[]).join(' ').toLowerCase().indexOf(q)!==-1; }).slice(0,6);
          hits.innerHTML=found.map(function(x){ return '<button class="wiz__hit" data-cid="'+x.id+'"><b>'+esc(x.name)+'</b> <span class="muted">'+esc((x.phones||[])[0]||'')+'</span></button>'; }).join('')||'<div class="muted" style="padding:8px">No match — create a new caller below.</div>';
          hits.querySelectorAll('[data-cid]').forEach(function(b){ b.addEventListener('click', function(){ st.customer=found.filter(function(x){return x.id===b.getAttribute('data-cid');})[0]; stepIntent(); }); });
        });
      });
      el('cwNew').addEventListener('click', function(){ customerModal(function(id){ sb.from('customers').select('*').eq('id',id).single().then(function(r){ st.customer=r.data; stepIntent(); }); }); });
    }

    function stepIntent(){
      var cust=st.customer;
      frame('<div class="wiz"><div class="wiz__step">Step 2 · Why are they calling?</div>'+
        '<div class="wiz__cust">📇 <b>'+esc(cust.name)+'</b> · '+esc((cust.phones||[])[0]||'')+' · '+badge(cust.type==='customer'?'done':'scheduled',cust.type)+' <button class="btn sm ghost" id="cwOpen360">Open 360</button></div>'+
        '<div class="wiz__btns">'+
          '<button class="wiz__big" data-intent="support">🛠️ Existing-customer support</button>'+
          '<button class="wiz__big" data-intent="sales">🛒 Sales inquiry</button>'+
          '<button class="wiz__big" data-intent="schedule">📅 Schedule a service</button>'+
          '<button class="wiz__big" data-intent="billing">💳 Billing question</button>'+
          '<button class="wiz__big" data-intent="other">💬 Something else</button>'+
        '</div><button class="btn ghost sm" id="cwBack">← Back</button></div>');
      el('cwBack').addEventListener('click', stepIdentify);
      el('cwOpen360').addEventListener('click', function(){ goCustomer(cust.id); });
      c.querySelectorAll('[data-intent]').forEach(function(b){ b.addEventListener('click', function(){
        st.intent=b.getAttribute('data-intent');
        if(st.intent==='support'||st.intent==='schedule'){ st.node=TS.ROOT; st.path=[]; stepTroubleshoot(); }
        else stepSimpleOutcome();
      }); });
    }

    function stepSimpleOutcome(){
      var map={ sales:['Sales inquiry','Log the interest and hand to Sales as a lead.','lead'],
                billing:['Billing question','Log the billing question on the customer record.','note'],
                other:['General note','Log the call note on the customer record.','note'] };
      var m=map[st.intent]||map.other;
      frame('<div class="wiz"><div class="wiz__step">'+esc(m[0])+'</div><p class="muted">'+esc(m[1])+'</p>'+
        '<div class="field"><label>Notes</label><textarea id="cwNote" placeholder="What did they ask?"></textarea></div>'+
        '<button class="btn" id="cwFinish">Log &amp; finish call</button> <button class="btn ghost sm" id="cwBack">← Back</button></div>');
      el('cwBack').addEventListener('click', stepIntent);
      el('cwFinish').addEventListener('click', function(){ finishCall({ resolution_type:m[2]==='lead'?'lead':'note', subject:m[0], note:el('cwNote').value.trim(), makeLead:m[2]==='lead' }); });
    }

    function stepTroubleshoot(){
      var node=TS.TREE[st.node];
      if(!node){ stepIntent(); return; }
      frame('<div class="wiz"><div class="wiz__step">Step 3 · Guided troubleshooting</div>'+
        (st.path.length?'<div class="wiz__crumbs">'+st.path.map(function(p){return esc(p);}).join(' › ')+'</div>':'')+
        '<div class="wiz__q">'+esc(node.prompt)+'</div>'+
        '<div class="wiz__opts">'+node.options.map(function(o,i){ return '<button class="wiz__opt" data-i="'+i+'">'+esc(o.label)+'</button>'; }).join('')+'</div>'+
        '<button class="btn ghost sm" id="cwBack">← Back</button></div>');
      el('cwBack').addEventListener('click', function(){ if(st.path.length){ st.path.pop(); /* simple: restart tree */ st.node=TS.ROOT; st.path=[]; } stepIntent(); });
      c.querySelectorAll('.wiz__opt').forEach(function(b){ b.addEventListener('click', function(){
        var o=node.options[+b.getAttribute('data-i')];
        st.path.push(o.label);
        if(o.next){ st.node=o.next; stepTroubleshoot(); }
        else stepOutcome(o.outcome);
      }); });
    }

    function stepOutcome(key){
      var oc=TS.OUTCOMES[key]||TS.OUTCOMES.dispatch;
      var actions='';
      if(oc.kind==='consumable'){
        actions='<label class="chk"><input type="checkbox" id="ocShip" checked> Ship the '+esc(oc.part)+'</label>'+
                '<label class="chk"><input type="checkbox" id="ocBook"> Also book a technician visit</label>'+
                '<p class="muted">Share the self-replace guide: drinkbettertap.com/guides.html</p>';
      } else if(oc.kind==='dispatch'){
        actions='<p class="muted">A repair work order will be created and queued for Operations to schedule &amp; assign.</p>';
      } else {
        actions='<p class="muted">No visit needed — this will be logged as self-resolved and the case closed.</p>';
      }
      frame('<div class="wiz"><div class="wiz__step">Outcome</div>'+
        '<div class="wiz__outcome '+esc(oc.kind)+'"><b>'+esc(oc.title)+'</b><div class="muted">'+esc(oc.detail)+'</div></div>'+
        '<div class="wiz__crumbs">'+st.path.map(function(p){return esc(p);}).join(' › ')+'</div>'+
        actions+
        '<div class="field"><label>Extra notes (optional)</label><textarea id="cwNote"></textarea></div>'+
        '<button class="btn" id="cwFinish">Log &amp; finish call</button> <button class="btn ghost sm" id="cwBack">← Back</button></div>');
      el('cwBack').addEventListener('click', function(){ st.node=TS.ROOT; st.path=[]; stepTroubleshoot(); });
      el('cwFinish').addEventListener('click', function(){
        finishCall({ outcomeKey:key, oc:oc, subject:oc.title, note:el('cwNote').value.trim(),
          ship: el('ocShip')?el('ocShip').checked:false, book: el('ocBook')?el('ocBook').checked:false });
      });
    }

    function finishCall(res){
      var cust=st.customer, dur=Math.round((Date.now()-st.startedAt)/1000);
      var oc=res.oc;
      var resolutionType = oc ? oc.resolution_type : (res.resolution_type||'note');
      var willDispatch = oc && (oc.kind==='dispatch' || (oc.kind==='consumable' && res.book));
      var caseStatus = (oc && oc.kind==='dispatch') ? 'open' : (willDispatch?'open':'resolved');
      var slaDays = (oc && oc.priority==='P2_high')?1:3;

      // 1) case
      var casePayload={ customer_id:cust.id, machine_id:null, channel:'call', direction:'inbound',
        subject:res.subject, category:st.intent, priority:(oc&&oc.priority)||'P3_normal', status:caseStatus,
        assigned_to:me.id, opened_at:new Date().toISOString(), resolved_at: caseStatus==='resolved'?new Date().toISOString():null,
        sla_due:new Date(Date.now()+slaDays*86400000).toISOString(), resolution: oc?oc.title:(res.subject), resolution_type:resolutionType,
        linked_job_id:null, ts_path:st.path, notes:res.note||'' };

      sb.from('cases').insert(casePayload).then(function(cr){
        var caseId=cr.data[0].id;
        // 2) interaction
        sb.from('interactions').insert({ customer_id:cust.id, case_id:caseId, type:'call', direction:'inbound',
          agent_id:me.id, timestamp:new Date().toISOString(), duration_sec:dur, subject:res.subject,
          body:(res.note||'')+(st.path.length?(' | path: '+st.path.join(' › ')):''), outcome:resolutionType });
        // 3) lead (sales)
        if(res.makeLead){ sb.from('customers').update({ status:'lead' }).eq('id',cust.id);
          sb.from('tasks').insert({ related_type:'customer', related_id:cust.id, title:'New sales lead from call — follow up with '+cust.name, due_date:new Date(Date.now()+86400000).toISOString(), assignee_id:null, status:'open' }); }
        // 4) job (dispatch or booked consumable)
        if(willDispatch){
          var job={ customer_id:cust.id, machine_id:null, kind:oc.job_kind||'repair', status:'unscheduled',
            priority:oc.priority||'P3_normal', scheduled_for:null, time_window:'', assigned_to:null,
            address:cust.install_address||'', route_order:null, color:'', special_notes:'From call: '+st.path.join(' › ')+(res.note?(' — '+res.note):''),
            items_to_bring: oc.part?[oc.part]:[], amount_to_collect: oc.kind==='consumable'?55:0, amount_collected:0,
            parts_used:[], duration_min:null, checklist:[], photos:[], signature:null,
            sla_due:new Date(Date.now()+slaDays*86400000).toISOString(), source_case_id:caseId };
          sb.from('jobs').insert(job).then(function(jr){ sb.from('cases').update({ linked_job_id:jr.data[0].id }).eq('id',caseId); });
        }
        var summary = oc ? oc.title : res.subject;
        var extra = willDispatch?' A work order was queued for Operations.': (res.makeLead?' Lead sent to Sales.':' Case closed.');
        stepDone(summary, extra, cust.id, dur);
      });
    }

    function stepDone(summary, extra, cid, dur){
      frame('<div class="wiz wiz--done"><div class="wiz__check">✓</div><h3>Call logged</h3>'+
        '<p><b>'+esc(summary)+'.</b>'+esc(extra)+'</p>'+
        '<p class="muted">Duration '+Math.round(dur/60)+'m '+ (dur%60)+'s · saved to the customer 360.</p>'+
        '<div class="wiz__done-btns"><button class="btn" id="cwAgain">📞 Take another call</button> <button class="btn ghost" id="cwView">Open customer 360</button></div></div>');
      el('cwAgain').addEventListener('click', function(){ renderConsole(c); });
      el('cwView').addEventListener('click', function(){ goCustomer(cid); });
    }

    stepIdentify();
  }

  /* ============================ SUPPORT (cases) ============================ */
  function casesTable(cases, customers){
    var rows=cases.map(function(k){
      var cust=byId(customers||[],k.customer_id);
      var sla=k.sla_due?dueInfo(k.sla_due):{cls:'',txt:'—'};
      return '<tr class="js-crow" data-cid="'+k.customer_id+'" style="cursor:pointer"><td><b>'+esc(k.subject)+'</b><br><span class="muted">'+esc(k.channel)+' · '+esc(cust?cust.name:'')+'</span></td>'+
        '<td>'+prioPill(k.priority)+'</td><td>'+badge(k.status==='resolved'||k.status==='closed'?'done':(k.status==='open'?'in_progress':'scheduled'), k.status)+'</td>'+
        '<td>'+(k.status==='open'||k.status==='pending'?badge(sla.cls,sla.txt):'<span class="muted">—</span>')+'</td></tr>';
    }).join('');
    return tableCard('<th>Case</th><th>Priority</th><th>Status</th><th>SLA</th>', rows);
  }
  function renderSupport(c){
    fetchMany(['cases','customers']).then(function(db){
      var open=db.cases.filter(function(x){return x.status==='open'||x.status==='pending';});
      var closed=db.cases.filter(function(x){return x.status==='resolved'||x.status==='closed';});
      c.innerHTML='<div class="toolbar"><button class="btn sm" id="takeCall">📞 Take a call</button></div>'+
        '<div class="grid kpis">'+kpi('Open cases',open.length)+kpi('Overdue SLA',open.filter(function(x){return x.sla_due&&daysFromNow(x.sla_due)<0;}).length)+kpi('Resolved',closed.length)+'</div><div style="height:16px"></div>'+
        section('Open cases', open.length?casesTable(open,db.customers):ph('No open cases','All caught up.'))+
        '<div style="height:16px"></div>'+section('Recently resolved', closed.length?casesTable(closed,db.customers):ph('Nothing yet',''));
      el('takeCall').addEventListener('click', function(){ openSection('console'); });
      c.querySelectorAll('.js-crow').forEach(function(r){ r.addEventListener('click', function(){ goCustomer(r.getAttribute('data-cid')); }); });
    });
  }

  /* ============================ PIPELINE (sales) ============================ */
  function renderPipeline(c){
    fetchMany(['orders','customers']).then(function(db){
      var stages=['lead','qualified','quote','won','installed','lost'];
      var canEdit=['ceo','sales','customer_service_sales'].indexOf(me.role)!==-1;
      var cols=stages.map(function(s){
        var items=db.orders.filter(function(o){return o.stage===s;});
        var cards=items.map(function(o){ var cust=byId(db.customers,o.customer_id);
          return '<div class="kan-card js-order" data-oid="'+o.id+'" data-cid="'+o.customer_id+'"><b>'+esc(cust?cust.name:'—')+'</b><div class="muted">'+esc(o.plan)+' · '+money(o.amount_total)+'</div>'+(o.color_requested?'<div class="muted">'+esc(o.color_requested)+' · '+esc(o.special_notes||'')+'</div>':'')+'</div>';
        }).join('');
        return '<div class="kan-col"><div class="kan-col__head">'+esc(s)+' <span class="muted">'+items.length+'</span></div>'+(cards||'<div class="kan-empty">—</div>')+'</div>';
      }).join('');
      c.innerHTML=(canEdit?'<div class="toolbar"><button class="btn sm" id="newOrder">+ New deal</button></div>':'')+
        '<div class="kanban">'+cols+'</div>';
      if(canEdit) el('newOrder').addEventListener('click', function(){ orderModal(null,db.customers); });
      c.querySelectorAll('.js-order').forEach(function(k){ k.addEventListener('click', function(){
        if(canEdit){ var o=byId(db.orders,k.getAttribute('data-oid')); orderModal(o,db.customers); }
        else goCustomer(k.getAttribute('data-cid'));
      }); });
    });
  }
  function orderModal(o, customers){
    var isNew=!o; o=o||{ plan:'cash_1280', stage:'lead', amount_total:1280, amount_paid:0, color_requested:'white' };
    var custOpts=customers.map(function(x){return '<option value="'+x.id+'"'+(o.customer_id===x.id?' selected':'')+'>'+esc(x.name)+'</option>';}).join('');
    var stageOpts=['lead','qualified','quote','won','installed','lost'].map(function(s){return '<option value="'+s+'"'+(o.stage===s?' selected':'')+'>'+s+'</option>';}).join('');
    var planOpts=['cash_1280','installments','lease'].map(function(p){return '<option value="'+p+'"'+(o.plan===p?' selected':'')+'>'+p+'</option>';}).join('');
    openModal(isNew?'New deal':'Edit deal',
      '<div class="field"><label>Customer</label><select id="o_cust">'+custOpts+'</select></div>'+
      '<div class="field"><label>Plan</label><select id="o_plan">'+planOpts+'</select></div>'+
      '<div class="grid two"><div class="field"><label>Total</label><input id="o_total" type="number" value="'+esc(o.amount_total||0)+'"></div>'+
      '<div class="field"><label>Paid</label><input id="o_paid" type="number" value="'+esc(o.amount_paid||0)+'"></div></div>'+
      '<div class="field"><label>Color</label><select id="o_color"><option'+(o.color_requested==='white'?' selected':'')+'>white</option><option'+(o.color_requested==='black'?' selected':'')+'>black</option></select></div>'+
      '<div class="field"><label>Stage</label><select id="o_stage">'+stageOpts+'</select></div>'+
      '<div class="field"><label>Notes</label><input id="o_notes" value="'+esc(o.special_notes||'')+'"></div>',
      function(close){
        var total=Number(el('o_total').value||0), paid=Number(el('o_paid').value||0);
        var payload={ customer_id:el('o_cust').value, plan:el('o_plan').value, amount_total:total, amount_paid:paid, balance:total-paid,
          payment_status: paid>=total&&total>0?'paid':(paid>0?'partial':'quote'), color_requested:el('o_color').value,
          special_notes:el('o_notes').value.trim(), stage:el('o_stage').value, rep_id:me.id, order_date:o.order_date||new Date().toISOString() };
        var q=isNew? sb.from('orders').insert(payload) : sb.from('orders').update(payload).eq('id',o.id);
        q.then(function(){ close(); toast('Deal saved'); openSection('pipeline'); });
      });
  }

  /* ============================ DISPATCH (ops) ============================ */
  function renderDispatch(c){
    fetchMany(['jobs','profiles','customers']).then(function(db){
      var installers=db.profiles.filter(function(p){return p.role==='installer';});
      var unassigned=db.jobs.filter(function(j){return j.status==='unscheduled'||!j.assigned_to;});
      var board=installers.map(function(p){
        var jobs=db.jobs.filter(function(j){return j.assigned_to===p.id && j.status!=='done'&&j.status!=='cancelled';}).sort(function(a,b){return (a.route_order||99)-(b.route_order||99);});
        return '<div class="disp-col"><div class="disp-col__head">'+esc(p.full_name)+' <span class="muted">'+esc(p.region||'')+'</span></div>'+
          (jobs.length?jobs.map(function(j){return dispCard(j,byId(db.customers,j.customer_id));}).join(''):'<div class="kan-empty">No jobs</div>')+'</div>';
      }).join('');
      c.innerHTML='<div class="grid two">'+
        '<div>'+section('Unassigned', unassigned.length?unassigned.map(function(j){return dispCard(j,byId(db.customers,j.customer_id),true);}).join(''):ph('All assigned','Nothing waiting.'))+'</div>'+
        '<div>'+section('By installer','<div class="disp-board">'+board+'</div>')+'</div>'+
      '</div>';
      c.querySelectorAll('.js-assign').forEach(function(b){ b.addEventListener('click', function(){ assignModal(byId(db.jobs,b.getAttribute('data-jid')), installers); }); });
    });
  }
  function dispCard(j, cust, assignable){
    return '<div class="disp-card">'+prioPill(j.priority)+' <b>'+esc(j.kind.replace(/_/g,' '))+'</b>'+
      '<div>'+esc(cust?cust.name:'')+'</div><div class="muted">'+esc(j.address||'')+'</div>'+
      '<div class="muted">'+(j.scheduled_for?fmtDate(j.scheduled_for):'unscheduled')+'</div>'+
      (assignable?'<button class="btn sm js-assign" data-jid="'+j.id+'">Assign / schedule</button>':'')+'</div>';
  }
  function assignModal(j, installers){
    if(!j) return;
    var opts='<option value="">— Unassigned —</option>'+installers.map(function(p){return '<option value="'+p.id+'"'+(j.assigned_to===p.id?' selected':'')+'>'+esc(p.full_name)+' ('+esc(p.region||'')+')</option>';}).join('');
    var sched=j.scheduled_for?new Date(j.scheduled_for).toISOString().slice(0,16):'';
    openModal('Assign & schedule',
      '<div class="field"><label>Installer</label><select id="j_assign">'+opts+'</select></div>'+
      '<div class="field"><label>Date & time</label><input id="j_sched" type="datetime-local" value="'+sched+'"></div>'+
      '<div class="field"><label>Time window</label><input id="j_win" value="'+esc(j.time_window||'')+'" placeholder="9:00–11:00 AM"></div>'+
      '<div class="field"><label>Route order</label><input id="j_route" type="number" value="'+esc(j.route_order||'')+'"></div>',
      function(close){
        var assign=el('j_assign').value||null;
        sb.from('jobs').update({ assigned_to:assign, scheduled_for: el('j_sched').value?new Date(el('j_sched').value).toISOString():null,
          time_window:el('j_win').value.trim(), route_order: el('j_route').value?Number(el('j_route').value):null,
          status: assign?'scheduled':'unscheduled' }).eq('id',j.id).then(function(){ close(); toast('Job scheduled'); openSection('dispatch'); });
      });
  }

  /* ============================ JOBS (all) ============================ */
  function loadJobs(cb){ sb.from('jobs').select('*').order('scheduled_for',{ascending:true}).then(function(r){ cb(r.data||[]); }); }
  function jobsTable(jobs, installerView, canManage){
    if(!jobs.length) return ph('No jobs', installerView?'No jobs assigned to you.':'No jobs yet.');
    var rows=jobs.map(function(j){
      var status = installerView
        ? '<select data-job="'+j.id+'" class="js-status">'+['scheduled','en_route','in_progress','done'].map(function(s){return '<option value="'+s+'"'+(j.status===s?' selected':'')+'>'+s.replace('_',' ')+'</option>';}).join('')+'</select>'
        : badge(j.status==='done'?'done':(j.status==='in_progress'||j.status==='en_route'?'in_progress':(j.status==='cancelled'?'cancelled':'scheduled')), j.status.replace('_',' '));
      return '<tr><td><b>'+esc(j.customer_name||j.address||'—')+'</b><br><span class="muted">'+esc(j.kind.replace(/_/g,' '))+' · '+prioPill(j.priority)+'</span></td>'+
        '<td>'+esc(j.address||'—')+'</td><td>'+fmtDate(j.scheduled_for)+'</td><td>'+status+'</td>'+
        (canManage?'<td><button class="btn sm ghost js-edit" data-job="'+j.id+'">Edit</button></td>':'')+'</tr>';
    }).join('');
    return tableCard('<th>Job</th><th>Address</th><th>Scheduled</th><th>Status</th>'+(canManage?'<th></th>':''), rows);
  }
  function renderJobs(c){
    var canManage=(me.role==='ceo'||me.role==='operations');
    loadJobs(function(jobs){
      c.innerHTML=(canManage?'<div class="toolbar"><button class="btn sm" id="addJob">+ New job</button></div>':'')+jobsTable(jobs,false,canManage);
      if(canManage){ el('addJob').addEventListener('click', function(){ jobModal(null); });
        c.querySelectorAll('.js-edit').forEach(function(b){ b.addEventListener('click', function(){ jobModal(byId(jobs,b.getAttribute('data-job'))); }); }); }
    });
  }
  function jobModal(job){
    var isNew=!job; job=job||{ kind:'installation', status:'unscheduled', priority:'P3_normal' };
    fetchMany(['profiles','customers']).then(function(db){
      var installers=db.profiles.filter(function(p){return p.role==='installer';});
      var iOpts='<option value="">— Unassigned —</option>'+installers.map(function(p){return '<option value="'+p.id+'"'+(job.assigned_to===p.id?' selected':'')+'>'+esc(p.full_name)+'</option>';}).join('');
      var cOpts='<option value="">— none —</option>'+db.customers.map(function(x){return '<option value="'+x.id+'"'+(job.customer_id===x.id?' selected':'')+'>'+esc(x.name)+'</option>';}).join('');
      var kinds=['installation','repair','filter_replacement','uv_replacement','maintenance','removal'];
      var sched=job.scheduled_for?new Date(job.scheduled_for).toISOString().slice(0,16):'';
      openModal(isNew?'New job':'Edit job',
        '<div class="field"><label>Customer</label><select id="m_cust">'+cOpts+'</select></div>'+
        '<div class="field"><label>Type</label><select id="m_kind">'+kinds.map(function(k){return '<option value="'+k+'"'+(job.kind===k?' selected':'')+'>'+k.replace(/_/g,' ')+'</option>';}).join('')+'</select></div>'+
        '<div class="field"><label>Priority</label><select id="m_prio">'+['P1_urgent','P2_high','P3_normal','P4_low'].map(function(p){return '<option value="'+p+'"'+(job.priority===p?' selected':'')+'>'+p+'</option>';}).join('')+'</select></div>'+
        '<div class="field"><label>Address</label><input id="m_addr" value="'+esc(job.address||'')+'"></div>'+
        '<div class="field"><label>Scheduled</label><input id="m_sched" type="datetime-local" value="'+sched+'"></div>'+
        '<div class="field"><label>Assign to</label><select id="m_assign">'+iOpts+'</select></div>'+
        '<div class="field"><label>Amount to collect</label><input id="m_amt" type="number" value="'+esc(job.amount_to_collect||0)+'"></div>'+
        '<div class="field"><label>Notes</label><input id="m_notes" value="'+esc(job.special_notes||'')+'"></div>',
        function(close){
          var assign=el('m_assign').value||null;
          var payload={ customer_id:el('m_cust').value||null, kind:el('m_kind').value, priority:el('m_prio').value,
            address:el('m_addr').value.trim()||null, scheduled_for: el('m_sched').value?new Date(el('m_sched').value).toISOString():null,
            assigned_to:assign, amount_to_collect:Number(el('m_amt').value||0), special_notes:el('m_notes').value.trim()||null,
            status: job.status && !isNew ? job.status : (assign?'scheduled':'unscheduled') };
          var q=isNew? sb.from('jobs').insert(payload) : sb.from('jobs').update(payload).eq('id',job.id);
          q.then(function(){ close(); toast('Job saved'); openSection('jobs'); });
        });
    });
  }

  /* ============================ INSTALLER — MY DAY ============================ */
  function renderMyDay(c){
    sb.from('jobs').select('*').eq('assigned_to',me.id).then(function(r){
      var jobs=(r.data||[]).sort(function(a,b){ return (a.route_order||99)-(b.route_order||99) || (new Date(a.scheduled_for||0)-new Date(b.scheduled_for||0)); });
      var active=jobs.filter(function(j){return j.status!=='done'&&j.status!=='cancelled';});
      var done=jobs.filter(function(j){return j.status==='done';});
      c.innerHTML='<div class="grid kpis">'+kpi('Jobs today',active.length,'on your route')+kpi('Completed',done.length,'all time')+kpi('To collect', money(active.reduce(function(s,j){return s+Number(j.amount_to_collect||0);},0)))+'</div><div style="height:16px"></div>'+
        section('Your route', active.length?active.map(jobCard).join(''):ph('No jobs','Nothing assigned to you right now.'))+
        (done.length?'<div style="height:16px"></div>'+section('Completed', done.map(jobCard).join('')):'');
      wireJobCards(c, jobs);
    });
  }
  function jobCard(j){
    var maps='https://maps.google.com/?q='+encodeURIComponent(j.address||'');
    var items=(j.items_to_bring||[]).map(function(i){return '<span class="pill">'+esc(i)+'</span>';}).join(' ');
    return '<div class="jobcard" data-jid="'+j.id+'">'+
      '<div class="jobcard__top">'+prioPill(j.priority)+' <b>'+esc(j.kind.replace(/_/g,' '))+'</b> '+badge(j.status==='done'?'done':(j.status==='in_progress'||j.status==='en_route'?'in_progress':'scheduled'), j.status.replace('_',' '))+'</div>'+
      '<div class="jobcard__body">'+
        '<div class="spec"><div class="k">When</div><div class="v">'+fmtDate(j.scheduled_for)+' · '+esc(j.time_window||'')+'</div></div>'+
        '<div class="spec"><div class="k">Address</div><div class="v"><a href="'+maps+'" target="_blank" rel="noopener">'+esc(j.address||'—')+' ↗</a></div></div>'+
        '<div class="spec"><div class="k">Machine</div><div class="v">'+esc(j.color||'')+' '+(j.machine_id?'(registered)':'(new install)')+'</div></div>'+
        (items?'<div class="spec"><div class="k">Bring</div><div class="v">'+items+'</div></div>':'')+
        (j.special_notes?'<div class="spec"><div class="k">Notes</div><div class="v">'+esc(j.special_notes)+'</div></div>':'')+
        '<div class="spec"><div class="k">Collect</div><div class="v">'+money(j.amount_to_collect)+(j.amount_collected?' · collected '+money(j.amount_collected):'')+'</div></div>'+
      '</div>'+
      '<div class="jobcard__actions">'+
        '<select class="js-jstatus" data-jid="'+j.id+'">'+['scheduled','en_route','in_progress','done'].map(function(s){return '<option value="'+s+'"'+(j.status===s?' selected':'')+'>'+s.replace('_',' ')+'</option>';}).join('')+'</select>'+
        '<button class="btn sm js-complete" data-jid="'+j.id+'">Complete / log</button>'+
      '</div></div>';
  }
  function wireJobCards(c, jobs){
    c.querySelectorAll('.js-jstatus').forEach(function(sel){ sel.addEventListener('change', function(){
      sel.disabled=true; sb.from('jobs').update({status:sel.value}).eq('id',sel.getAttribute('data-jid')).then(function(){ sel.disabled=false; toast('Status updated'); });
    }); });
    c.querySelectorAll('.js-complete').forEach(function(b){ b.addEventListener('click', function(){ completeJobModal(byId(jobs,b.getAttribute('data-jid'))); }); });
  }
  function completeJobModal(j){
    if(!j) return;
    openModal('Complete job — '+j.kind.replace(/_/g,' '),
      '<div class="field"><label>Serial number (creates/links the machine)</label><input id="jc_serial" value="'+esc((j.machine_id?'':''))+'" placeholder="BT-EDGE-2026-…"></div>'+
      '<div class="field"><label>Parts used (comma separated)</label><input id="jc_parts" value="'+esc((j.items_to_bring||[]).join(', '))+'"></div>'+
      '<div class="field"><label>Amount collected</label><input id="jc_amt" type="number" value="'+esc(j.amount_to_collect||0)+'"></div>'+
      '<div class="field"><label>Customer signature (type name)</label><input id="jc_sign" placeholder="Customer name"></div>'+
      '<div class="field"><label>Notes</label><input id="jc_notes" value=""></div>'+
      '<p class="muted">On install/serial capture, filter due is set to +6 months and UV-C lamp to +12 months automatically.</p>',
      function(close){
        var serial=el('jc_serial').value.trim();
        var parts=el('jc_parts').value.split(',').map(function(s){return s.trim();}).filter(Boolean);
        var jobUpd={ status:'done', parts_used:parts, amount_collected:Number(el('jc_amt').value||0),
          signature:el('jc_sign').value.trim()||null, special_notes:(j.special_notes||'')+(el('jc_notes').value.trim()?(' | '+el('jc_notes').value.trim()):'') };
        function saveJob(machineId){
          if(machineId) jobUpd.machine_id=machineId;
          sb.from('jobs').update(jobUpd).eq('id',j.id).then(function(){ close(); toast('Job completed'); openSection('overview'); });
        }
        // create machine asset if a serial was captured and none linked
        if(serial && !j.machine_id && j.customer_id){
          var install=new Date().toISOString();
          var m={ customer_id:j.customer_id, model:'Water Bar WDC-E-032 Edge', color:j.color||'white', serial_number:serial,
            install_date:install, warranty_until:new Date(new Date(install).setMonth(new Date(install).getMonth()+36)).toISOString(),
            filter_last_replaced:install, filter_due:new Date(new Date(install).setMonth(new Date(install).getMonth()+6)).toISOString(),
            uv_last_replaced:install, uv_due:new Date(new Date(install).setMonth(new Date(install).getMonth()+12)).toISOString(),
            location_in_home:'', ownership:'owned', status:'active', notes:'' };
          sb.from('machines').insert(m).then(function(mr){ saveJob(mr.data[0].id); });
        } else saveJob(null);
      },'Complete job');
  }

  /* ============================ INVENTORY ============================ */
  function partsTable(parts){
    var rows=parts.map(function(p){ var low=p.qty_on_hand<=p.reorder_level;
      return '<tr><td><b>'+esc(p.name)+'</b><br><span class="muted">'+esc(p.sku)+'</span></td><td>'+esc(p.qty_on_hand)+'</td><td>'+esc(p.reorder_level)+'</td><td>'+(p.price?money(p.price):'—')+'</td><td>'+(low?badge('cancelled','reorder'):badge('done','ok'))+'</td></tr>';
    }).join('');
    return tableCard('<th>Part</th><th>On hand</th><th>Reorder at</th><th>Price</th><th>Status</th>', rows);
  }
  function renderInventory(c){
    sb.from('parts').select('*').then(function(r){
      var parts=r.data||[]; var low=parts.filter(function(p){return p.qty_on_hand<=p.reorder_level;});
      c.innerHTML='<div class="grid kpis">'+kpi('SKUs',parts.length)+kpi('Low stock',low.length,'need reorder')+'</div><div style="height:16px"></div>'+
        (low.length?section('⚠ Reorder needed', partsTable(low))+'<div style="height:16px"></div>':'')+
        section('All parts', partsTable(parts));
    });
  }

  /* ============================ MARKETING ============================ */
  function renderMarketing(c){
    fetchMany(['campaigns','customers','orders']).then(function(db){
      var spend=db.campaigns.reduce(function(s,x){return s+Number(x.spend||0);},0);
      var leads=db.campaigns.reduce(function(s,x){return s+Number(x.leads||0);},0);
      var conv=db.campaigns.reduce(function(s,x){return s+Number(x.conversions||0);},0);
      // leads by source
      var bySource={}; db.customers.forEach(function(x){ var s=x.lead_source||'Other'; bySource[s]=(bySource[s]||0)+1; });
      var srcRows=Object.keys(bySource).map(function(s){return '<tr><td>'+esc(s)+'</td><td>'+bySource[s]+'</td></tr>';}).join('');
      var campRows=db.campaigns.map(function(x){ var cpl=x.leads?(x.spend/x.leads):0; var cr=x.leads?Math.round(100*x.conversions/x.leads):0;
        return '<tr><td><b>'+esc(x.name)+'</b><br><span class="muted">'+esc(x.channel)+'</span></td><td>'+money(x.spend)+'</td><td>'+x.leads+'</td><td>'+x.conversions+'</td><td>$'+cpl.toFixed(0)+'</td><td>'+cr+'%</td></tr>';
      }).join('');
      // funnel
      var prospects=db.customers.filter(function(x){return x.type==='prospect';}).length;
      var custs=db.customers.filter(function(x){return x.type==='customer';}).length;
      c.innerHTML='<div class="grid kpis">'+kpi('Spend',money(spend))+kpi('Leads',leads)+kpi('Conversions',conv)+kpi('Cost / lead','$'+(leads?(spend/leads).toFixed(0):'0'))+kpi('Conv. rate',(leads?Math.round(100*conv/leads):0)+'%')+'</div><div style="height:18px"></div>'+
        '<div class="grid two"><div>'+section('Leads by source', tableCard('<th>Source</th><th>Count</th>',srcRows))+
        section('Funnel', '<div class="card"><div class="funnel"><div class="funnel__row"><span>Leads</span><b>'+leads+'</b></div><div class="funnel__row"><span>Prospects</span><b>'+prospects+'</b></div><div class="funnel__row"><span>Customers</span><b>'+custs+'</b></div></div></div>')+'</div>'+
        '<div>'+section('Campaigns (spend / ROI)', tableCard('<th>Campaign</th><th>Spend</th><th>Leads</th><th>Conv.</th><th>CPL</th><th>CR</th>',campRows))+
        section('Content calendar', '<div class="card"><p class="muted">Link your social folders and scheduled posts here. Aggregate view only — no individual customer financials.</p></div>')+'</div></div>';
    });
  }

  /* ============================ REPORTS ============================ */
  function renderReports(c){
    fetchMany(['orders','jobs','cases','parts']).then(function(db){
      var rev=db.orders.reduce(function(s,o){return s+Number(o.amount_paid||0);},0);
      var blocks='';
      if(me.role==='ceo'||me.role==='marketing') blocks+=kpi('Revenue collected',money(rev));
      blocks+=kpi('Jobs done',db.jobs.filter(function(j){return j.status==='done';}).length);
      blocks+=kpi('Cases resolved',db.cases.filter(function(k){return k.status==='resolved'||k.status==='closed';}).length);
      blocks+=kpi('Avg SLA','on track');
      c.innerHTML='<div class="grid kpis">'+blocks+'</div><div style="height:16px"></div>'+
        ph('Charts & exports', 'Role-scoped dashboards. With the current seed data these KPIs are live; wire real Shopify + jobs data and this adds trend charts and CSV export.');
    });
  }

  /* ============================ TEAM (CEO) ============================ */
  function renderTeam(c){
    if(me.role!=='ceo'){ c.innerHTML=ph('Restricted','Only the CEO can manage the team.'); return; }
    sb.from('profiles').select('*').order('created_at',{ascending:true}).then(function(r){
      var people=r.data||[];
      var rows=people.map(function(p){ var isSelf=p.id===me.id;
        var roleSel='<select data-uid="'+p.id+'" class="js-role"'+(isSelf?' disabled':'')+'>'+Object.keys(ROLE_LABEL).map(function(k){return '<option value="'+k+'"'+(p.role===k?' selected':'')+'>'+ROLE_LABEL[k]+'</option>';}).join('')+'</select>';
        return '<tr><td><b>'+esc(p.full_name||'—')+'</b>'+(isSelf?' <span class="role-badge">you</span>':'')+'<br><span class="muted">'+esc(p.email)+' · '+esc(p.region||'')+'</span></td><td>'+roleSel+'</td><td>'+(p.active===false?badge('cancelled','disabled'):badge('done','active'))+'</td></tr>';
      }).join('');
      c.innerHTML='<p class="sub" style="margin-bottom:14px">Set each person\'s role — changes apply next time they load the workspace. Only you (CEO) can change roles.</p>'+
        tableCard('<th>Person</th><th>Role</th><th>Status</th>', rows);
      c.querySelectorAll('.js-role').forEach(function(sel){ var prev=sel.value;
        sel.addEventListener('change', function(){ sel.disabled=true;
          sb.from('profiles').update({role:sel.value}).eq('id',sel.getAttribute('data-uid')).then(function(rr){ sel.disabled=false; if(rr.error){ toast('Could not change role'); sel.value=prev; return; } prev=sel.value; toast('Role updated'); });
        });
      });
    });
  }
})();
