/* ==========================================================================
   Better Tap — Field Service / Installer portal
   PROTOTYPE — front-end only. All data is simulated and persisted to
   localStorage under the "bt_inst_" prefix. Vanilla JS, no libraries.

   ---------------------------------------------------------------------------
   PRODUCTION NEEDS (not implemented here — this is a demo):
   - Real authentication (SSO / OAuth, hashed credentials, server-issued
     session tokens, real SMS/TOTP 2FA — NOT "any code works").
   - Backend + database for jobs, routes, time logs, parts and notes
     (this prototype keeps everything in the browser's localStorage).
   - Real GPS via a reviewed geolocation flow + continuous background
     tracking reported to a dispatch service (here it's a one-shot demo).
   - Photo upload to object storage (S3/GCS) with auth + EXIF handling;
     here images are only previewed locally as data URLs and not uploaded.
   - Maps / routing API (Google/Mapbox) for the route map, turn-by-turn
     navigation, real distance & ETA; here the map is a styled placeholder.
   - Legally-binding e-signature capture & storage (audit trail, consent);
     here the signature is a throwaway canvas drawing.
   - Inventory / van-stock sync, dispatch assignment, payroll/earnings,
     offline support and conflict resolution.
   ========================================================================== */
(function(){
  'use strict';

  /* ---------- auth guard ---------- */
  if (localStorage.getItem('bt_inst_auth') !== '1') { location.replace('index.html'); return; }

  var P = 'bt_inst_';
  var $ = function(s,c){return (c||document).querySelector(s);};
  var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  var IMG = '../assets/img/';

  /* ---------- storage helpers ---------- */
  function load(key, fb){ try{ var v=localStorage.getItem(P+key); return v?JSON.parse(v):fb; }catch(e){ return fb; } }
  function save(key, val){ try{ localStorage.setItem(P+key, JSON.stringify(val)); }catch(e){} }

  /* ---------- demo seed data ---------- */
  var PARTS_CATALOG = [
    {id:'maze',  name:'MAZE filter cartridge', sku:'BT-MAZE-01'},
    {id:'uv',    name:'UV lamp module',        sku:'BT-UV-220'},
    {id:'faucet',name:'Better Tap faucet',     sku:'BT-FCT-09'},
    {id:'tube',  name:'Tubing (1/4" / ft)',    sku:'BT-TUBE-14'},
    {id:'membrane',name:'RO membrane',         sku:'BT-RO-75'},
    {id:'oring', name:'O-ring seal kit',       sku:'BT-ORK-03'}
  ];

  var SEED_JOBS = [
    {
      id:'j1', name:'Dana & Marcus Levin', type:'Install', status:'Scheduled',
      addr:'18 Oak Hollow Dr, Westchester', window:'8:30 – 9:30 AM',
      distance:'2.4 mi', eta:'9 min', phone:'(914) 555-0182',
      lat:41.0421, lng:-73.7629, img:'unit-front.jpg',
      tasks:[
        {t:'Confirm under-sink space & shutoff valve', done:false},
        {t:'Mount Better Tap unit & faucet', done:false},
        {t:'Connect water lines, run pressure test', done:false},
        {t:'Flush MAZE filter & verify flow', done:false},
        {t:'Walk customer through app pairing', done:false}
      ],
      svc:''
    },
    {
      id:'j2', name:'Priya Nathan', type:'Filter swap', status:'Scheduled',
      addr:'502 Birch Ln, Hartsdale', window:'10:00 – 10:45 AM',
      distance:'3.1 mi', eta:'12 min', phone:'(914) 555-0244',
      lat:41.0145, lng:-73.7951, img:'dispense.jpg',
      tasks:[
        {t:'Shut off feed & relieve pressure', done:false},
        {t:'Replace MAZE cartridge', done:false},
        {t:'Reset filter-life counter', done:false},
        {t:'Sanitize & leak-check', done:false}
      ],
      svc:''
    },
    {
      id:'j3', name:'Riverside Café (Account)', type:'Service', status:'Scheduled',
      addr:'9 Mill St, Tarrytown', window:'11:30 AM – 1:00 PM',
      distance:'5.7 mi', eta:'18 min', phone:'(914) 555-0310',
      lat:41.0762, lng:-73.8587, img:'control-panel.jpg',
      tasks:[
        {t:'Inspect control panel & error log', done:false},
        {t:'Test dispense rates (hot/cold/sparkling)', done:false},
        {t:'Descale & clean nozzles', done:false},
        {t:'Replace UV lamp module', done:false},
        {t:'Log service report for account', done:false}
      ],
      svc:''
    },
    {
      id:'j4', name:'Tom Albright', type:'Repair', status:'Scheduled',
      addr:'77 Cedar Crest, Irvington', window:'2:00 – 3:00 PM',
      distance:'4.2 mi', eta:'14 min', phone:'(914) 555-0467',
      lat:41.0390, lng:-73.8682, img:'lifestyle-kitchen.jpg',
      tasks:[
        {t:'Diagnose low-flow complaint', done:false},
        {t:'Check tubing for kinks / blockage', done:false},
        {t:'Replace O-ring seal kit', done:false},
        {t:'Verify flow restored & no leaks', done:false}
      ],
      svc:''
    },
    {
      id:'j5', name:'Grace Okafor', type:'Install', status:'Scheduled',
      addr:'231 Lakeview Ter, Dobbs Ferry', window:'3:30 – 4:30 PM',
      distance:'3.8 mi', eta:'13 min', phone:'(914) 555-0529',
      lat:41.0140, lng:-73.8729, img:'unit-front.jpg',
      tasks:[
        {t:'Verify counter clearance & power', done:false},
        {t:'Install unit, faucet & drain saddle', done:false},
        {t:'Prime system & pressure test', done:false},
        {t:'Customer walkthrough & registration', done:false}
      ],
      svc:''
    }
  ];

  /* preset sample install photos shown on a couple of jobs */
  var SAMPLE_PHOTOS = ['unit-front.jpg','control-panel.jpg','dispense.jpg'];

  function ensureState(){
    if(!load('jobs')){
      // attach map x/y coords (placeholder map layout) + empty work logs
      var coords=[[18,72],[40,40],[68,22],[80,58],[52,82]];
      SEED_JOBS.forEach(function(j,i){
        j.mx=coords[i][0]; j.my=coords[i][1];
        j.elapsed=0; j.timerState='stopped'; j.timerStart=0;
        j.parts=[]; j.photos=[]; j.locShared=false; j.signed=false; j.signature=null;
        j.completedAt=null;
      });
      // pre-seed a couple of sample install photos on job 1
      SEED_JOBS[0].photos=[{src:IMG+SAMPLE_PHOTOS[0],seed:true},{src:IMG+SAMPLE_PHOTOS[1],seed:true}];
      SEED_JOBS[2].photos=[{src:IMG+SAMPLE_PHOTOS[2],seed:true}];
      save('jobs', SEED_JOBS);
    }
    if(!load('profile')){
      save('profile',{name:'Mike R.', role:'Senior Installer', van:'Van 7 — BT-7842', initials:'MR',
        stock:[
          {n:'MAZE filter cartridge', q:14},
          {n:'UV lamp module', q:4},
          {n:'Better Tap faucet', q:6},
          {n:'Tubing (1/4")', q:'85 ft'},
          {n:'RO membrane', q:3},
          {n:'O-ring seal kit', q:9}
        ]
      });
    }
  }
  ensureState();

  function getJobs(){ return load('jobs', []); }
  function getJob(id){ return getJobs().filter(function(j){return j.id===id;})[0]; }
  function saveJob(job){
    var jobs=getJobs();
    for(var i=0;i<jobs.length;i++){ if(jobs[i].id===job.id){ jobs[i]=job; break; } }
    save('jobs', jobs);
  }

  /* ---------- utility ---------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function fmtClock(ms){
    var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
    function p(n){return (n<10?'0':'')+n;}
    return p(h)+':'+p(m)+':'+p(sec);
  }
  function fmtHrs(ms){ return (ms/3600000).toFixed(1)+'h'; }
  function liveElapsed(j){
    var e=j.elapsed||0;
    if(j.timerState==='running' && j.timerStart) e += Date.now()-j.timerStart;
    return e;
  }
  function statusPill(s){
    var map={'Scheduled':'scheduled','En route':'enroute','On site':'onsite','Complete':'complete'};
    return '<span class="pill pill--'+(map[s]||'scheduled')+'"><span class="dot"></span>'+esc(s)+'</span>';
  }
  function typeTag(t){
    var map={'Install':'install','Service':'service','Filter swap':'filter','Repair':'repair'};
    return '<span class="tag tag--'+(map[t]||'service')+'">'+esc(t)+'</span>';
  }

  function toast(msg){
    var t=document.createElement('div'); t.className='toast';
    t.innerHTML='<svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+esc(msg);
    $('#toasts').appendChild(t);
    setTimeout(function(){t.style.opacity='0';t.style.transition='.3s';setTimeout(function(){t.remove();},300);},2200);
  }

  /* ---------- navigation ---------- */
  var current='route';
  function setView(v){
    current=v;
    $$('.nav-item, .tab').forEach(function(b){ b.classList.toggle('is-active', b.dataset.view===v); });
    render();
    $('#main').scrollTop=0; window.scrollTo(0,0);
  }
  $$('.nav-item, .tab').forEach(function(b){ b.addEventListener('click', function(){ setView(b.dataset.view); }); });

  function render(){
    if(current==='route') renderRoute();
    else if(current==='summary') renderSummary();
    else if(current==='profile') renderProfile();
  }

  /* ===================================================================
     VIEW: TODAY'S ROUTE
     =================================================================== */
  function renderRoute(){
    var jobs=getJobs();
    var done=jobs.filter(function(j){return j.status==='Complete';}).length;
    var miles=jobs.reduce(function(a,j){return a+parseFloat(j.distance);},0).toFixed(1);
    var prof=load('profile');

    var stopsSvg = jobs.map(function(j,i){
      var nextJ=jobs[i+1];
      var line = nextJ ? '<line class="rt-line" x1="'+j.mx+'%" y1="'+j.my+'%" x2="'+nextJ.mx+'%" y2="'+nextJ.my+'%" stroke="#4D97DB" stroke-width="2.4" stroke-dasharray="6 5" stroke-linecap="round" opacity=".7"/>' : '';
      return line;
    }).join('');
    var stopsPins = jobs.map(function(j,i){
      var col = j.status==='Complete' ? '#16a34a' : (j.status==='On site'||j.status==='En route' ? '#d97706' : '#141937');
      return '<g class="map-stop" data-jump="'+j.id+'">'+
        '<circle cx="'+j.mx+'%" cy="'+j.my+'%" r="14" fill="'+col+'" stroke="#fff" stroke-width="2.5"/>'+
        '<text class="map-pin-num" x="'+j.mx+'%" y="'+j.my+'%" text-anchor="middle" dy="4.5">'+(i+1)+'</text></g>';
    }).join('');

    var cards = jobs.map(function(j,i){
      return '<div class="jobcard '+(j.status==='Complete'?'is-complete':'')+'" data-open="'+j.id+'">'+
        '<div class="jobcard__num">'+(j.status==='Complete'?'<svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px"><path d="M5 12.5l4 4 10-10.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>':(i+1))+'</div>'+
        '<div class="jobcard__body">'+
          '<div class="jobcard__top"><div class="jobcard__name">'+esc(j.name)+'</div>'+statusPill(j.status)+'</div>'+
          '<div class="jobcard__addr"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.8"/></svg>'+esc(j.addr)+'</div>'+
          '<div class="jobcard__meta">'+typeTag(j.type)+
            '<span class="mi"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'+esc(j.window)+'</span>'+
            '<span class="mi"><svg viewBox="0 0 24 24" fill="none"><path d="M3 11l18-7-7 18-2.5-8L3 11Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'+esc(j.distance)+' · '+esc(j.eta)+'</span>'+
          '</div>'+
        '</div></div>';
    }).join('');

    $('#main').innerHTML =
      '<div class="view">'+
        '<div class="greet">'+
          '<div><h2>Hi '+esc(prof.name)+' 👋</h2><p>'+jobs.length+' stops on your route today.</p></div>'+
          '<div class="day"><span>Today</span><b id="todayDate"></b></div>'+
        '</div>'+

        '<div class="stats">'+
          '<div class="stat"><div class="stat__v">'+jobs.length+'</div><div class="stat__l">Stops</div></div>'+
          '<div class="stat"><div class="stat__v">'+miles+'</div><div class="stat__l">Miles</div></div>'+
          '<div class="stat"><div class="stat__v">~7.5h</div><div class="stat__l">Est. hours</div></div>'+
        '</div>'+

        '<div class="routemap">'+
          '<div class="routemap__head"><b>Route map</b><span class="tag">'+done+' of '+jobs.length+' done</span></div>'+
          '<div class="routemap__canvas">'+
            '<div class="van-badge"><svg viewBox="0 0 24 24" fill="none"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="17" r="1.8" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="17" r="1.8" stroke="currentColor" stroke-width="1.6"/></svg>'+esc(prof.van.split(' — ')[0])+'</div>'+
            '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0">'+stopsSvg+'</svg>'+
            '<svg style="position:absolute;inset:0">'+stopsPins+'</svg>'+
          '</div>'+
          '<div class="routemap__foot"><button class="btn btn--primary btn--sm btn--block" id="startRoute"><svg viewBox="0 0 24 24" fill="none"><path d="M5 3l15 9-15 9V3Z" fill="currentColor"/></svg> Start route</button></div>'+
        '</div>'+

        '<div class="section-head"><div><h1>Today\'s jobs</h1><p>Tap a stop to open the job.</p></div></div>'+
        '<div class="joblist">'+cards+'</div>'+
      '</div>';

    var d=new Date();
    $('#todayDate').textContent = d.toLocaleDateString(undefined,{month:'short',day:'numeric'});

    $$('[data-open]').forEach(function(el){ el.addEventListener('click',function(){ openJob(el.dataset.open); }); });
    $$('[data-jump]').forEach(function(el){ el.addEventListener('click',function(){ openJob(el.getAttribute('data-jump')); }); });
    $('#startRoute').addEventListener('click',function(){
      var next=getJobs().filter(function(j){return j.status!=='Complete';})[0];
      if(!next){ toast('All stops complete — nice work!'); return; }
      next.status='En route'; saveJob(next); toast('Navigating to '+next.name+' (demo)'); renderRoute();
    });
  }

  /* ===================================================================
     VIEW: JOB DETAIL (sheet)
     =================================================================== */
  var sheet=$('#jobSheet'), sheetPanel=$('#jobSheetPanel'), openJobId=null, timerTick=null;

  function openJob(id){
    var j=getJob(id); if(!j) return; openJobId=id;
    sheetPanel.innerHTML=jobDetailHTML(j);
    sheet.classList.add('open'); sheet.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    bindJobDetail(j);
    startTimerTick();
  }
  function closeSheet(){
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden','true');
    document.body.style.overflow=''; openJobId=null; stopTimerTick();
  }
  $$('[data-close-sheet]').forEach(function(el){ el.addEventListener('click', closeSheet); });

  function jobDetailHTML(j){
    var checklist=j.tasks.map(function(t,i){
      return '<div class="check-item '+(t.done?'done':'')+'" data-task="'+i+'">'+
        '<span class="check-box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'+
        '<span class="check-label">'+esc(t.t)+'</span></div>';
    }).join('');

    var photos=(j.photos||[]).map(function(p){
      return '<div class="photo"><img src="'+esc(p.src)+'" alt="install photo"/>'+(p.seed?'<span class="seed">SAMPLE</span>':'')+'</div>';
    }).join('');

    var parts=(j.parts||[]).length ? j.parts.map(function(p){
      return '<div class="part-row" data-part="'+esc(p.id)+'">'+
        '<div class="part-row__n"><b>'+esc(p.name)+'</b><span>'+esc(p.sku)+'</span></div>'+
        '<div class="qty"><button data-q="-1">–</button><span>'+p.qty+'</span><button data-q="1">+</button></div>'+
        '<button class="rm" data-rm>Remove</button></div>';
    }).join('') : '<div class="empty-line">No parts logged yet.</div>';

    var locShared=j.locShared;
    var coordTxt = j.locCoords || (j.lat.toFixed(4)+', '+j.lng.toFixed(4));

    return ''+
    '<div class="jd-head">'+
      '<button class="icon-btn" data-close-sheet aria-label="Back"><svg viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'+
      '<div class="jd-head__t"><b>'+esc(j.name)+'</b><span>'+esc(j.type)+' · '+esc(j.window)+'</span></div>'+
      statusPill(j.status)+
    '</div>'+

    '<div class="jd-body">'+
      '<div class="jd-hero"><img src="'+IMG+esc(j.img)+'" alt="job"/><div class="jd-hero__tag">'+typeTag(j.type)+'</div></div>'+

      /* contact + address */
      '<div class="block">'+
        '<div class="kv"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg><div><b>'+esc(j.addr)+'</b><span>'+esc(j.distance)+' away · ETA '+esc(j.eta)+'</span></div></div>'+
        '<div class="contact-grid">'+
          '<a class="btn btn--green" href="tel:'+esc(j.phone.replace(/[^0-9]/g,''))+'"><svg viewBox="0 0 24 24" fill="none"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 14l1 5v0a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg> Call</a>'+
          '<a class="btn btn--ghost" href="sms:'+esc(j.phone.replace(/[^0-9]/g,''))+'"><svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H8l-4 3V5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg> Message</a>'+
        '</div>'+
        '<div class="block__c tight" style="border-top:1px solid var(--line-soft)"><button class="btn btn--subtle btn--block" id="navBtn"><svg viewBox="0 0 24 24" fill="none"><path d="M3 11l18-7-7 18-2.5-8L3 11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg> Navigate (demo)</button></div>'+
      '</div>'+

      /* time tracker */
      '<div class="block">'+
        '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v4l3 2M9 2h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><b>Time on job</b></div></div>'+
        '<div class="timer">'+
          '<div class="timer__clock" id="timerClock">'+fmtClock(liveElapsed(j))+'</div>'+
          '<div class="timer__state '+(j.timerState==='running'?'running':j.timerState==='paused'?'paused':'')+'" id="timerState">'+
            (j.timerState==='running'?'Running':j.timerState==='paused'?'Paused':'Stopped')+'</div>'+
          '<div class="timer__btns">'+
            '<button class="btn btn--primary" id="tStart">'+(j.timerState==='running'?'<svg viewBox="0 0 24 24" fill="none"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg> Pause':'<svg viewBox="0 0 24 24" fill="none"><path d="M6 4l14 8-14 8V4Z" fill="currentColor"/></svg> '+(j.timerState==='paused'?'Resume':'Start'))+'</button>'+
            '<button class="btn btn--ghost" id="tStop"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg> Stop</button>'+
          '</div>'+
        '</div>'+
      '</div>'+

      /* checklist */
      '<div class="block">'+
        '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><b>Task checklist</b></div><span class="tag" id="taskCount"></span></div>'+
        checklist+
      '</div>'+

      /* installation images */
      '<div class="block">'+
        '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><circle cx="8.5" cy="10" r="1.7" stroke="currentColor" stroke-width="1.5"/><path d="M5 17l5-4 4 3 3-2 3 3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><b>Installation photos</b></div></div>'+
        '<div class="photo-grid" id="photoGrid">'+photos+
          '<label class="photo-add"><input type="file" accept="image/*" id="photoInput" multiple /><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Add photo</label>'+
        '</div>'+
      '</div>'+

      /* parts replaced */
      '<div class="block">'+
        '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M3 8l9-5 9 5-9 5-9-5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><b>Parts replaced</b></div><button class="btn btn--subtle btn--sm" id="addPart"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg> Add</button></div>'+
        '<div id="partsList">'+parts+'</div>'+
      '</div>'+

      /* service notes */
      '<div class="block">'+
        '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9h6M9 13h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><b>Service provided</b></div></div>'+
        '<div class="block__c"><textarea class="textarea" id="svcNotes" placeholder="What did you do on this job? Notes for the customer & office…">'+esc(j.svc||'')+'</textarea></div>'+
      '</div>'+

      /* location tracking */
      '<div class="block">'+
        '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="1.7"/></svg><b>Location tracking</b></div></div>'+
        '<div class="loc-box">'+
          '<div class="loc-status '+(locShared?'on':'')+'" id="locStatus"><span class="ind"></span><span id="locTxt">'+(locShared?'Tracking on — visible to dispatch':'Location not shared')+'</span></div>'+
          '<div class="loc-coords" id="locCoords">'+esc(coordTxt)+'</div>'+
          '<button class="btn btn--ghost btn--block" id="shareLoc"><svg viewBox="0 0 24 24" fill="none"><path d="M3 11l18-7-7 18-2.5-8L3 11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg> '+(locShared?'Update my location':'Share my location')+'</button>'+
        '</div>'+
      '</div>'+

      /* complete */
      (j.status==='Complete'
        ? '<div class="block"><div class="block__c" style="text-align:center"><div class="pill pill--complete" style="font-size:13px;margin-bottom:8px"><span class="dot"></span>Job complete</div>'+(j.signature?'<div style="margin-top:6px"><img src="'+esc(j.signature)+'" alt="signature" style="max-height:80px;margin:0 auto;border:1px solid var(--line);border-radius:10px;padding:6px"/></div>':'')+'</div></div>'
        : '')+
    '</div>'+

    /* sticky action bar */
    '<div class="jd-actionbar">'+
      (j.status==='Complete'
        ? '<button class="btn btn--ghost btn--lg" data-close-sheet>Close</button>'
        : '<button class="btn btn--ghost btn--lg" id="enRoute">'+(j.status==='Scheduled'?'Mark en route':'On site')+'</button>'+
          '<button class="btn btn--green btn--lg" id="completeJob"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10.5" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg> Complete job</button>')+
    '</div>';
  }

  function updateTaskCount(j){
    var d=j.tasks.filter(function(t){return t.done;}).length;
    var el=$('#taskCount'); if(el) el.textContent=d+' / '+j.tasks.length;
  }

  function bindJobDetail(j){
    updateTaskCount(j);

    /* checklist toggle */
    $$('[data-task]', sheetPanel).forEach(function(el){
      el.addEventListener('click',function(){
        var i=+el.dataset.task; j=getJob(j.id);
        j.tasks[i].done=!j.tasks[i].done; saveJob(j);
        el.classList.toggle('done', j.tasks[i].done); updateTaskCount(j);
      });
    });

    /* navigate */
    var nav=$('#navBtn', sheetPanel); if(nav) nav.addEventListener('click',function(){ toast('Opening turn-by-turn to '+j.name+' (demo)'); });

    /* timer */
    $('#tStart', sheetPanel).addEventListener('click',function(){
      j=getJob(j.id);
      if(j.timerState==='running'){ // pause
        j.elapsed=liveElapsed(j); j.timerState='paused'; j.timerStart=0;
      } else { // start / resume
        j.timerState='running'; j.timerStart=Date.now();
        if(j.status==='Scheduled'||j.status==='En route'){ j.status='On site'; }
      }
      saveJob(j); refreshTimerUI(j);
    });
    $('#tStop', sheetPanel).addEventListener('click',function(){
      j=getJob(j.id); j.elapsed=liveElapsed(j); j.timerState='stopped'; j.timerStart=0;
      saveJob(j); refreshTimerUI(j); toast('Time logged: '+fmtClock(j.elapsed));
    });

    /* photos */
    $('#photoInput', sheetPanel).addEventListener('change',function(e){
      var files=Array.prototype.slice.call(e.target.files||[]); if(!files.length) return;
      var grid=$('#photoGrid', sheetPanel), addBtn=grid.querySelector('.photo-add');
      var remaining=files.length;
      files.forEach(function(f){
        var r=new FileReader();
        r.onload=function(){
          j=getJob(j.id); j.photos=j.photos||[]; j.photos.push({src:r.result,seed:false}); saveJob(j);
          var d=document.createElement('div'); d.className='photo';
          d.innerHTML='<img src="'+r.result+'" alt="install photo"/>';
          grid.insertBefore(d, addBtn);
          if(--remaining===0) toast(files.length+' photo'+(files.length>1?'s':'')+' added (demo — not uploaded)');
        };
        r.readAsDataURL(f);
      });
      e.target.value='';
    });

    /* parts */
    $('#addPart', sheetPanel).addEventListener('click', function(){ openPartPicker(j); });
    bindPartRows(j);

    /* service notes (debounced save) */
    var notes=$('#svcNotes', sheetPanel), tNotes;
    notes.addEventListener('input',function(){
      clearTimeout(tNotes);
      tNotes=setTimeout(function(){ j=getJob(j.id); j.svc=notes.value; saveJob(j); },350);
    });

    /* share location */
    $('#shareLoc', sheetPanel).addEventListener('click',function(){ shareLocation(j); });

    /* en route / complete */
    var er=$('#enRoute', sheetPanel);
    if(er) er.addEventListener('click',function(){
      j=getJob(j.id);
      j.status = (j.status==='Scheduled') ? 'En route' : 'On site';
      saveJob(j);
      $('.jd-head .pill', sheetPanel).outerHTML=statusPill(j.status);
      er.textContent = (j.status==='On site') ? 'On site' : 'Mark on site';
      er.disabled = (j.status==='On site');
      toast('Status: '+j.status);
    });
    var cj=$('#completeJob', sheetPanel);
    if(cj) cj.addEventListener('click',function(){ openSignature(j); });
  }

  function refreshTimerUI(j){
    var clk=$('#timerClock', sheetPanel), st=$('#timerState', sheetPanel), btn=$('#tStart', sheetPanel);
    if(!clk) return;
    clk.textContent=fmtClock(liveElapsed(j));
    st.className='timer__state '+(j.timerState==='running'?'running':j.timerState==='paused'?'paused':'');
    st.textContent=j.timerState==='running'?'Running':j.timerState==='paused'?'Paused':'Stopped';
    btn.innerHTML = j.timerState==='running'
      ? '<svg viewBox="0 0 24 24" fill="none"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor"/></svg> Pause'
      : '<svg viewBox="0 0 24 24" fill="none"><path d="M6 4l14 8-14 8V4Z" fill="currentColor"/></svg> '+(j.timerState==='paused'?'Resume':'Start');
  }
  function startTimerTick(){
    stopTimerTick();
    timerTick=setInterval(function(){
      if(!openJobId) return;
      var j=getJob(openJobId);
      if(j && j.timerState==='running'){ var clk=$('#timerClock', sheetPanel); if(clk) clk.textContent=fmtClock(liveElapsed(j)); }
    },1000);
  }
  function stopTimerTick(){ if(timerTick){ clearInterval(timerTick); timerTick=null; } }

  function bindPartRows(j){
    $$('#partsList [data-part]', sheetPanel).forEach(function(row){
      var pid=row.getAttribute('data-part');
      $$('[data-q]', row).forEach(function(b){
        b.addEventListener('click',function(){
          var delta=+b.getAttribute('data-q'); j=getJob(j.id);
          var p=j.parts.filter(function(x){return x.id===pid;})[0]; if(!p) return;
          p.qty=Math.max(1,p.qty+delta); saveJob(j);
          row.querySelector('.qty span').textContent=p.qty;
        });
      });
      row.querySelector('[data-rm]').addEventListener('click',function(){
        j=getJob(j.id); j.parts=j.parts.filter(function(x){return x.id!==pid;}); saveJob(j);
        renderPartsList(j);
      });
    });
  }
  function renderPartsList(j){
    var wrap=$('#partsList', sheetPanel); if(!wrap) return;
    wrap.innerHTML = (j.parts||[]).length ? j.parts.map(function(p){
      return '<div class="part-row" data-part="'+esc(p.id)+'">'+
        '<div class="part-row__n"><b>'+esc(p.name)+'</b><span>'+esc(p.sku)+'</span></div>'+
        '<div class="qty"><button data-q="-1">–</button><span>'+p.qty+'</span><button data-q="1">+</button></div>'+
        '<button class="rm" data-rm>Remove</button></div>';
    }).join('') : '<div class="empty-line">No parts logged yet.</div>';
    bindPartRows(j);
  }

  /* ---------- location (real geolocation if available, else mock) ---------- */
  function shareLocation(j){
    var status=$('#locStatus', sheetPanel), txt=$('#locTxt', sheetPanel), coords=$('#locCoords', sheetPanel), btn=$('#shareLoc', sheetPanel);
    function applied(lat,lng,label){
      j=getJob(j.id); j.locShared=true; j.locCoords=lat.toFixed(5)+', '+lng.toFixed(5); saveJob(j);
      status.classList.add('on'); txt.textContent='Tracking on — visible to dispatch';
      coords.textContent=j.locCoords+(label?'  ·  '+label:'');
      btn.innerHTML='<svg viewBox="0 0 24 24" fill="none"><path d="M3 11l18-7-7 18-2.5-8L3 11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg> Update my location';
      $('#locDot').classList.add('on');
    }
    btn.disabled=true; btn.innerHTML='<span class="spin"></span> Locating…';
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(function(pos){
        btn.disabled=false; applied(pos.coords.latitude, pos.coords.longitude, 'live GPS'); toast('Location shared with dispatch');
      },function(){
        btn.disabled=false; applied(j.lat, j.lng, 'approx (demo)'); toast('GPS unavailable — using demo location');
      },{timeout:6000});
    } else {
      setTimeout(function(){ btn.disabled=false; applied(j.lat, j.lng, 'approx (demo)'); toast('Location shared (demo)'); },500);
    }
  }

  /* ---------- modal: add part ---------- */
  var modal=$('#modal'), modalBox=$('#modalBox');
  function openModal(html){ modalBox.innerHTML='<div class="modal-grab"></div>'+html; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  $$('[data-close-modal]').forEach(function(el){ el.addEventListener('click', closeModal); });

  function openPartPicker(j){
    var opts=PARTS_CATALOG.map(function(p){
      return '<div class="part-opt" data-pick="'+p.id+'"><div><b>'+esc(p.name)+'</b><br><span>'+esc(p.sku)+'</span></div><span class="add-ic">+</span></div>';
    }).join('');
    openModal('<h3>Add part</h3><p class="sub">Pick from your van stock to log it on this job.</p><div class="part-pick">'+opts+'</div>');
    $$('[data-pick]', modalBox).forEach(function(el){
      el.addEventListener('click',function(){
        var pid=el.getAttribute('data-pick'), cat=PARTS_CATALOG.filter(function(x){return x.id===pid;})[0];
        j=getJob(j.id); j.parts=j.parts||[];
        var ex=j.parts.filter(function(x){return x.id===pid;})[0];
        if(ex){ ex.qty++; } else { j.parts.push({id:cat.id,name:cat.name,sku:cat.sku,qty:1}); }
        saveJob(j); renderPartsList(j); closeModal(); toast(cat.name+' added');
      });
    });
  }

  /* ---------- modal: signature + complete ---------- */
  function openSignature(j){
    openModal(
      '<h3>Customer sign-off</h3><p class="sub">Have the customer sign below to complete the job.</p>'+
      '<canvas class="sig-pad" id="sigPad"></canvas>'+
      '<div class="sig-row"><span class="link" id="sigClear">Clear</span><span class="muted" style="font-size:12px">Sign with finger or mouse</span></div>'+
      '<div class="field sig-name"><label for="sigName">Customer name</label><input class="input" id="sigName" value="'+esc(j.name)+'" /></div>'+
      '<button class="btn btn--green btn--block btn--lg" id="sigDone"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10.5" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg> Confirm &amp; complete</button>'
    );
    var canvas=$('#sigPad'), ctx, drawing=false, dirty=false;
    function sizeCanvas(){
      var r=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
      canvas.width=r.width*dpr; canvas.height=r.height*dpr;
      ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
      ctx.lineWidth=2.4; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#141937';
    }
    sizeCanvas();
    function pos(e){
      var r=canvas.getBoundingClientRect();
      var t=e.touches?e.touches[0]:e;
      return {x:t.clientX-r.left, y:t.clientY-r.top};
    }
    function start(e){ e.preventDefault(); drawing=true; dirty=true; var p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }
    function move(e){ if(!drawing) return; e.preventDefault(); var p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); }
    function end(){ drawing=false; }
    canvas.addEventListener('mousedown',start); canvas.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
    canvas.addEventListener('touchstart',start,{passive:false}); canvas.addEventListener('touchmove',move,{passive:false}); canvas.addEventListener('touchend',end);

    $('#sigClear', modalBox).addEventListener('click',function(){ ctx.clearRect(0,0,canvas.width,canvas.height); dirty=false; });
    $('#sigDone', modalBox).addEventListener('click',function(){
      if(!dirty){ toast('Please capture a signature first.'); return; }
      j=getJob(j.id);
      j.signature=canvas.toDataURL('image/png');
      j.signedName=$('#sigName', modalBox).value;
      j.signed=true; j.status='Complete'; j.completedAt=Date.now();
      if(j.timerState==='running'){ j.elapsed=liveElapsed(j); }
      j.timerState='stopped'; j.timerStart=0;
      saveJob(j); closeModal(); closeSheet();
      toast('Job marked complete ✓'); setView('route');
    });

    window.addEventListener('resize', function once(){ if(!modal.classList.contains('open')){ window.removeEventListener('resize',once); return; } });
  }

  /* ===================================================================
     VIEW: DAY SUMMARY / EARNINGS
     =================================================================== */
  function renderSummary(){
    var jobs=getJobs();
    var done=jobs.filter(function(j){return j.status==='Complete';});
    var totalMs=jobs.reduce(function(a,j){return a+liveElapsed(j);},0);
    var miles=jobs.reduce(function(a,j){return a+(j.status==='Complete'?parseFloat(j.distance):0);},0).toFixed(1);
    var earnings=(done.length*145 + (totalMs/3600000)*22).toFixed(0); // demo rollup

    // aggregate parts used across completed jobs
    var partAgg={};
    jobs.forEach(function(j){ (j.parts||[]).forEach(function(p){
      if(!partAgg[p.id]) partAgg[p.id]={name:p.name,sku:p.sku,qty:0};
      partAgg[p.id].qty+=p.qty;
    });});
    var partKeys=Object.keys(partAgg);
    var partsHtml = partKeys.length ? '<div class="block parts-used-list">'+partKeys.map(function(k){
      var p=partAgg[k];
      return '<div class="part-row"><div class="part-row__n"><b>'+esc(p.name)+'</b><span>'+esc(p.sku)+'</span></div><span class="tag">×'+p.qty+'</span></div>';
    }).join('')+'</div>' : '<div class="block"><div class="empty-line">No parts logged yet today.</div></div>';

    var pct=Math.round(done.length/jobs.length*100);

    $('#main').innerHTML=
      '<div class="view">'+
        '<div class="section-head"><div><h1>Day summary</h1><p>Your rollup for today (demo earnings).</p></div></div>'+

        '<div class="summary-hero">'+
          '<div class="lbl">Est. earnings today</div>'+
          '<div class="big">$'+earnings+'</div>'+
          '<div class="sub">'+done.length+' of '+jobs.length+' jobs complete · '+miles+' mi driven</div>'+
          '<div class="progress"><div class="progress__bar" style="width:'+pct+'%"></div></div>'+
        '</div>'+

        '<div class="sum-grid">'+
          '<div class="sum-card"><div class="ic"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="v">'+done.length+'</div><div class="l">Jobs completed</div></div>'+
          '<div class="sum-card"><div class="ic"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 9v4l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><div class="v">'+fmtHrs(totalMs)+'</div><div class="l">Time tracked</div></div>'+
          '<div class="sum-card"><div class="ic"><svg viewBox="0 0 24 24" fill="none"><path d="M3 11l18-7-7 18-2.5-8L3 11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></div><div class="v">'+miles+'</div><div class="l">Miles driven</div></div>'+
          '<div class="sum-card"><div class="ic"><svg viewBox="0 0 24 24" fill="none"><path d="M3 8l9-5 9 5-9 5-9-5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></div><div class="v">'+partKeys.reduce(function(a,k){return a+partAgg[k].qty;},0)+'</div><div class="l">Parts used</div></div>'+
        '</div>'+

        '<div class="section-head"><div><h1 style="font-size:18px">Parts used today</h1></div></div>'+
        partsHtml+

        '<div class="section-head" style="margin-top:16px"><div><h1 style="font-size:18px">Completed jobs</h1></div></div>'+
        (done.length ? '<div class="joblist">'+done.map(function(j){
          return '<div class="jobcard is-complete" data-open="'+j.id+'"><div class="jobcard__num"><svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px"><path d="M5 12.5l4 4 10-10.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>'+
            '<div class="jobcard__body"><div class="jobcard__top"><div class="jobcard__name">'+esc(j.name)+'</div><span class="tag">'+fmtClock(liveElapsed(j))+'</span></div>'+
            '<div class="jobcard__meta">'+typeTag(j.type)+'<span class="mi">'+esc(j.distance)+'</span></div></div></div>';
        }).join('')+'</div>' : '<div class="block"><div class="empty-line">No jobs completed yet — go get \'em!</div></div>')+
      '</div>';

    $$('[data-open]').forEach(function(el){ el.addEventListener('click',function(){ openJob(el.dataset.open); }); });
  }

  /* ===================================================================
     VIEW: PROFILE
     =================================================================== */
  function renderProfile(){
    var p=load('profile');
    var stock=p.stock.map(function(s){
      return '<div class="kv"><svg viewBox="0 0 24 24" fill="none"><path d="M3 8l9-5 9 5-9 5-9-5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><div style="flex:1;display:flex;justify-content:space-between;align-items:center"><b>'+esc(s.n)+'</b><span class="tag">'+esc(s.q)+'</span></div></div>';
    }).join('');

    $('#main').innerHTML=
      '<div class="view">'+
        '<div class="section-head"><div><h1>Profile</h1><p>Your installer account &amp; van stock.</p></div></div>'+

        '<div class="profile-card">'+
          '<span class="avatar avatar--lg" style="background:#4D97DB">'+esc(p.initials)+'</span>'+
          '<h2>'+esc(p.name)+'</h2>'+
          '<div class="role">'+esc(p.role)+' · Better Tap</div>'+
          '<div class="badges"><span class="demo-chip"><span class="dot"></span>Demo account</span><span class="tag tag--install">'+esc(p.van)+'</span></div>'+
        '</div>'+

        '<div class="block stock-list">'+
          '<div class="block__h"><div class="left"><svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="17" r="1.8" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="17" r="1.8" stroke="currentColor" stroke-width="1.6"/></svg><b>Van stock — '+esc(p.van.split(' — ')[0])+'</b></div></div>'+
          stock+
        '</div>'+

        '<button class="btn btn--danger btn--block btn--lg signout" id="signOut"><svg viewBox="0 0 24 24" fill="none"><path d="M15 12H4M8 8l-4 4 4 4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Sign out</button>'+
        '<button class="btn btn--ghost btn--block" id="resetDemo" style="margin-top:10px">Reset demo data</button>'+
      '</div>';

    $('#signOut').addEventListener('click',function(){
      localStorage.removeItem(P+'auth'); location.replace('index.html');
    });
    $('#resetDemo').addEventListener('click',function(){
      ['jobs','profile'].forEach(function(k){ localStorage.removeItem(P+k); });
      ensureState(); toast('Demo data reset'); setView('route');
    });
  }

  /* topbar avatar -> profile */
  $('#topUser').addEventListener('click',function(){ setView('profile'); });
  $('#locPing').addEventListener('click',function(){
    var anyShared=getJobs().some(function(j){return j.locShared;});
    toast(anyShared?'Location is being shared with dispatch':'Open a job to share your location');
  });

  /* reflect any previously-shared location on the topbar dot */
  if(getJobs().some(function(j){return j.locShared;})) $('#locDot').classList.add('on');

  /* ---------- boot ---------- */
  setView('route');

})();
