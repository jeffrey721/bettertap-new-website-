/* ==========================================================================
   Better Tap — Marketing Command Center  (FRONT-END PROTOTYPE)
   --------------------------------------------------------------------------
   DEMO ONLY. All metrics here are fabricated sample data persisted in the
   browser via localStorage (prefix `bt_mkt_`). There is no real backend,
   no real ad accounts, and no real authentication.

   PRODUCTION REQUIREMENTS (what a real build of this would need):
   --------------------------------------------------------------------------
   - Real authentication + SSO with enforced 2FA (TOTP / WebAuthn), server
     sessions, and role-based access control.
   - Real OAuth 2.0 connections and ongoing API ingestion for each channel:
       * Meta (Facebook Ads + Instagram)  -> Meta Marketing API / Graph API
       * TikTok                            -> TikTok Marketing / Business API
       * YouTube                           -> YouTube Data API / Google Ads
       * Google Ads                        -> Google Ads API
       * SEO (Google Search)               -> Google Search Console API
       * WhatsApp Groups                   -> WhatsApp Business Platform API
       * Facebook Groups                   -> Meta Graph API (Groups)
   - Click / conversion tracking infrastructure: UTM tagging, server-side
     click capture, identity stitching, and CRM lead-source attribution.
   - A data warehouse + ETL/ELT pipeline (e.g. scheduled jobs syncing each
     channel into a warehouse) feeding a modeled reporting layer.
   - Secrets management for API tokens, refresh-token rotation, rate-limit
     handling, and per-channel data-freshness/error monitoring.
   ========================================================================== */

(function(){
'use strict';

/* auth guard (defence in depth) */
if (localStorage.getItem('bt_mkt_auth') !== '1') { location.replace('index.html'); return; }

var LS = 'bt_mkt_';
var $ = function(s,c){return (c||document).querySelector(s);};
var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
var fmtN = function(n){return n.toLocaleString('en-US');};
var fmt$ = function(n){return '$'+Math.round(n).toLocaleString('en-US');};
var fmtK = function(n){
  if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M';
  if(n>=1e3) return '$'+(n/1e3).toFixed(1)+'k';
  return '$'+Math.round(n);
};

/* ------------------------------------------------------------------ store */
function load(key, def){
  try{ var v = localStorage.getItem(LS+key); return v==null ? def : JSON.parse(v); }
  catch(e){ return def; }
}
function save(key, val){ localStorage.setItem(LS+key, JSON.stringify(val)); }

/* ------------------------------------------------------------------ seed */
/* channel colors use generic brand-neutral hues (no third-party logos). */
var SEED_CHANNELS = [
  {id:'facebook',  name:'Facebook Ads',     type:'Paid social',     icon:'Fb', color:'#3b5fb0', connected:true,  spend:8420, reach:412000, clicks:9180, leads:286, ctr:2.22, roas:3.4},
  {id:'instagram', name:'Instagram',        type:'Paid social',     icon:'Ig', color:'#c2418f', connected:true,  spend:6240, reach:351000, clicks:7640, leads:241, ctr:2.18, roas:3.1},
  {id:'tiktok',    name:'TikTok',           type:'Paid social',     icon:'Tk', color:'#1c1c2e', connected:true,  spend:4980, reach:528000, clicks:11200,leads:198, ctr:2.12, roas:2.7},
  {id:'youtube',   name:'YouTube',          type:'Video',           icon:'Yt', color:'#c0392b', connected:false, spend:3110, reach:189000, clicks:4020, leads:96,  ctr:2.13, roas:2.2},
  {id:'google',    name:'Google Ads',       type:'Paid search',     icon:'Go', color:'#2f76b8', connected:true,  spend:9870, reach:0,      clicks:14300,leads:402, ctr:0,    roas:4.1},
  {id:'seo',       name:'SEO (Google Search)',type:'Organic search',icon:'Se', color:'#16a34a', connected:true,  spend:0,    reach:0,      clicks:18600,leads:214, ctr:0,    roas:0,
                   seoImpr:642000, avgPos:7.4, keywords:['better tap','tap water filter','remineralized water','countertop ro system']},
  {id:'wa',        name:'WhatsApp Groups',  type:'Community',        icon:'Wa', color:'#1f8a5b', connected:true,  spend:0,    reach:0,      clicks:0,    leads:128, ctr:0,    roas:0,
                   members:3120, messages:8740},
  {id:'fbgroups',  name:'Facebook Groups',  type:'Community',        icon:'Fg', color:'#4257a8', connected:false, spend:0,    reach:0,      clicks:0,    leads:74,  ctr:0,    roas:0,
                   members:5480, messages:2310}
];

var SEED_CAMPAIGNS = [
  {name:'Spring Refill Push',        ch:'facebook',  status:'active', spend:3120, clicks:3640, conv:118, roas:3.8},
  {name:'Reels — Clean Water',       ch:'instagram', status:'active', spend:2480, clicks:3110, conv:96,  roas:3.3},
  {name:'TikTok Founder Story',      ch:'tiktok',    status:'active', spend:2010, clicks:5200, conv:84,  roas:2.9},
  {name:'Search — Brand Terms',      ch:'google',    status:'active', spend:1860, clicks:2940, conv:142, roas:5.2},
  {name:'Search — RO Systems',       ch:'google',    status:'active', spend:3420, clicks:4980, conv:128, roas:3.7},
  {name:'YouTube Explainer Pre-roll',ch:'youtube',   status:'paused', spend:1280, clicks:1620, conv:38,  roas:2.0},
  {name:'Retargeting — Cart',        ch:'facebook',  status:'active', spend:1640, clicks:1980, conv:74,  roas:4.4},
  {name:'IG Story — Bundle Offer',   ch:'instagram', status:'paused', spend:980,  clicks:1240, conv:31,  roas:2.6},
  {name:'TikTok Spark Ads',          ch:'tiktok',    status:'active', spend:1540, clicks:4100, conv:58,  roas:2.5},
  {name:'Holiday Teaser',            ch:'facebook',  status:'ended',  spend:2200, clicks:2680, conv:71,  roas:3.0}
];

/* CRM-aligned lead sources */
var SEED_SOURCES = [
  {src:'Facebook Ad', leads:360, sales:88,  rev:79200},
  {src:'Google Ads',  leads:402, sales:121, rev:108900},
  {src:'TikTok',      leads:198, sales:41,  rev:36900},
  {src:'Phone',       leads:142, sales:64,  rev:57600},
  {src:'Email',       leads:176, sales:53,  rev:47700},
  {src:'Referral',    leads:118, sales:49,  rev:44100}
];

/* monthly spend vs revenue trend */
var SEED_TREND = {
  months:['Jan','Feb','Mar','Apr','May','Jun'],
  spend:[18200,21400,19800,24600,27300,31200],
  rev:  [62000,71500,68900,84200,96400,112800]
};

var SEED_TEAM = [
  {nm:'Jeffrey C.', em:'jeffrey@bettertap.com', rl:'Head of Marketing', color:'#4D97DB'},
  {nm:'Maya R.',    em:'maya@bettertap.com',    rl:'Paid Media Lead',   color:'#213E3C'},
  {nm:'Devon P.',   em:'devon@bettertap.com',   rl:'SEO & Content',     color:'#c2418f'},
  {nm:'Lena K.',    em:'lena@bettertap.com',    rl:'Community Manager',  color:'#d97706'}
];

function seedIfNeeded(){
  if(load('channels')==null)  save('channels', SEED_CHANNELS);
  if(load('campaigns')==null) save('campaigns',SEED_CAMPAIGNS);
  if(load('sources')==null)   save('sources',  SEED_SOURCES);
  if(load('trend')==null)     save('trend',    SEED_TREND);
  if(load('team')==null)      save('team',      SEED_TEAM);
}
seedIfNeeded();

function getChannels(){ return load('channels', SEED_CHANNELS); }
function getCampaigns(){ return load('campaigns', SEED_CAMPAIGNS); }
function getSources(){ return load('sources', SEED_SOURCES); }
function getTrend(){ return load('trend', SEED_TREND); }
function getTeam(){ return load('team', SEED_TEAM); }
function channelById(id){ return getChannels().filter(function(c){return c.id===id;})[0]; }

/* ------------------------------------------------------------------ toast */
function toast(msg){
  var t=document.createElement('div'); t.className='toast';
  t.innerHTML='<svg class="ic" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4 4 10-10.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'+msg;
  $('#toasts').appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transition='.3s';setTimeout(function(){t.remove();},300);},2200);
}

/* expose minimal API for inline handlers */
window.BTM = { toast: toast };

/* ------------------------------------------------------------------ helpers */
function chIcon(c, big){
  return '<span class="ch-ic" style="background:'+c.color+'">'+c.icon+'</span>';
}
function statusPill(s){
  return '<span class="pill pill--'+s+'"><span class="dot"></span>'+s.charAt(0).toUpperCase()+s.slice(1)+'</span>';
}

/* ==================================================================
   OVERVIEW
   ================================================================== */
function totals(){
  var ch=getChannels();
  var spend=0,reach=0,clicks=0,leads=0;
  ch.forEach(function(c){spend+=c.spend;reach+=c.reach;clicks+=c.clicks;leads+=c.leads;});
  var impressions = 4920000; // demo aggregate impressions
  var orders = 416;
  var revenue = 374300;
  var cpl = spend/leads;
  var roas = revenue/spend;
  return {spend:spend,impressions:impressions,clicks:clicks,leads:leads,cpl:cpl,roas:roas,orders:orders,revenue:revenue};
}

function kpiCard(label, val, deltaTxt, up, icon){
  var arrow = up
    ? '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l7-7 7 7M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none"><path d="M19 12l-7 7-7-7M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<div class="kpi"><div class="kpi__top"><span class="kpi__label">'+label+'</span>'+
    '<span class="kpi__ic">'+icon+'</span></div>'+
    '<div class="kpi__val">'+val+'</div>'+
    '<div class="kpi__delta '+(up?'up':'down')+'">'+arrow+deltaTxt+'</div></div>';
}

var IC = {
  spend:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  impr:'<svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>',
  click:'<svg viewBox="0 0 24 24" fill="none"><path d="M9 3v6M3 9h6M5.5 5.5 9.5 9.5M13 13l8 3-3 1-1 3-4-7Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lead:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M5 20c1-3.5 3.7-5 7-5s6 1.5 7 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  cpl:'<svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18v12H3zM3 10h18" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="14" r="1.4" fill="currentColor"/></svg>',
  roas:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 18 9 12l4 3 7-9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 6h4v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  order:'<svg viewBox="0 0 24 24" fill="none"><path d="M6 7h12l-1 12H7L6 7Z" stroke="currentColor" stroke-width="1.6"/><path d="M9 7a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.6"/></svg>',
  rev:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M14 9a2.5 2.5 0 0 0-4 1c0 2.8 4 1.2 4 4a2.5 2.5 0 0 1-4 1M12 7v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
};

function renderOverview(){
  var t=totals();
  var grid=$('#kpiGrid'); grid.innerHTML='';
  grid.innerHTML =
    kpiCard('Total ad spend', fmtK(t.spend), '8.4% vs prev', false, IC.spend) +
    kpiCard('Impressions', (t.impressions/1e6).toFixed(2)+'M', '11.2%', true, IC.impr) +
    kpiCard('Clicks', fmtN(t.clicks), '6.7%', true, IC.click) +
    kpiCard('Leads', fmtN(t.leads), '9.1%', true, IC.lead) +
    kpiCard('Cost per lead', '$'+t.cpl.toFixed(2), '3.2%', true, IC.cpl) +
    kpiCard('ROAS', t.roas.toFixed(1)+'x', '0.4x', true, IC.roas) +
    kpiCard('Orders', fmtN(t.orders), '7.8%', true, IC.order) +
    kpiCard('Revenue', fmtK(t.revenue), '14.0%', true, IC.rev);

  renderSpendRevChart();
  renderLeadsDonut();
  renderOverviewChannelTable();
}

/* ---- spend vs revenue line chart (inline SVG) ---- */
function renderSpendRevChart(){
  var tr=getTrend();
  var W=640,H=220,pad={l:46,r:14,t:14,b:26};
  var iw=W-pad.l-pad.r, ih=H-pad.t-pad.b;
  var max=Math.max.apply(null, tr.spend.concat(tr.rev))*1.1;
  var n=tr.months.length;
  var x=function(i){return pad.l + (n<=1?0:i*(iw/(n-1)));};
  var y=function(v){return pad.t + ih - (v/max)*ih;};

  function path(arr){
    return arr.map(function(v,i){return (i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1);}).join(' ');
  }
  // gridlines
  var grid='';
  for(var g=0;g<=4;g++){
    var gv=max*g/4, gy=y(gv);
    grid+='<line x1="'+pad.l+'" y1="'+gy.toFixed(1)+'" x2="'+(W-pad.r)+'" y2="'+gy.toFixed(1)+'" stroke="#eef0f6" stroke-width="1"/>';
    grid+='<text x="'+(pad.l-8)+'" y="'+(gy+3).toFixed(1)+'" text-anchor="end" font-size="9.5" fill="#8a91ad">'+fmtK(gv)+'</text>';
  }
  // revenue area fill
  var revArea='M'+x(0)+' '+(pad.t+ih);
  tr.rev.forEach(function(v,i){revArea+=' L'+x(i).toFixed(1)+' '+y(v).toFixed(1);});
  revArea+=' L'+x(n-1)+' '+(pad.t+ih)+' Z';

  function dots(arr,color){
    return arr.map(function(v,i){return '<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="3" fill="#fff" stroke="'+color+'" stroke-width="2"/>';}).join('');
  }

  var svg='<svg class="svg-chart" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Spend vs revenue line chart">'+
    '<defs><linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0%" stop-color="#4D97DB" stop-opacity=".22"/><stop offset="100%" stop-color="#4D97DB" stop-opacity="0"/>'+
    '</linearGradient></defs>'+
    grid+
    '<path d="'+revArea+'" fill="url(#revFill)"/>'+
    '<path d="'+path(tr.spend)+'" fill="none" stroke="#cdd6e8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<path d="'+path(tr.rev)+'" fill="none" stroke="#4D97DB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+
    dots(tr.spend,'#cdd6e8')+dots(tr.rev,'#4D97DB')+
  '</svg>';

  var labels='<div class="chart-xlabels">'+tr.months.map(function(m){return '<span>'+m+'</span>';}).join('')+'</div>';
  $('#srChart').innerHTML = svg + labels;
}

/* ---- leads by channel donut (inline SVG) ---- */
function renderLeadsDonut(){
  var ch=getChannels().slice().filter(function(c){return c.leads>0;}).sort(function(a,b){return b.leads-a.leads;});
  var total=ch.reduce(function(s,c){return s+c.leads;},0);
  var R=58, C=2*Math.PI*R, off=0;
  var segs='', legend='';
  ch.forEach(function(c){
    var frac=c.leads/total, len=frac*C;
    segs+='<circle cx="80" cy="80" r="'+R+'" fill="none" stroke="'+c.color+'" stroke-width="20" '+
      'stroke-dasharray="'+len.toFixed(2)+' '+(C-len).toFixed(2)+'" stroke-dashoffset="'+(-off).toFixed(2)+'" '+
      'transform="rotate(-90 80 80)"><title>'+c.name+': '+c.leads+'</title></circle>';
    off+=len;
    legend+='<div class="row"><span class="sw" style="background:'+c.color+'"></span>'+
      '<span class="nm">'+c.name+'</span><span class="vl">'+c.leads+'</span></div>';
  });
  var svg='<svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Leads by channel donut chart">'+
    '<circle cx="80" cy="80" r="'+R+'" fill="none" stroke="#eef0f6" stroke-width="20"/>'+segs+
    '<text x="80" y="74" text-anchor="middle" font-family="General Sans,sans-serif" font-size="22" font-weight="600" fill="#1a1e36">'+fmtN(total)+'</text>'+
    '<text x="80" y="92" text-anchor="middle" font-size="10" fill="#8a91ad">total leads</text>'+
  '</svg>';
  $('#leadsDonut').innerHTML = svg + '<div class="donut-legend">'+legend+'</div>';
}

function renderOverviewChannelTable(){
  var ch=getChannels().slice().sort(function(a,b){return b.leads-a.leads;});
  var rows=ch.map(function(c){
    return '<tr><td><div class="ch-cell">'+chIcon(c)+'<div><div class="ch-name">'+c.name+'</div><div class="t-sub">'+c.type+'</div></div></div></td>'+
      '<td class="num">'+(c.spend?fmt$(c.spend):'—')+'</td>'+
      '<td class="num">'+(c.clicks?fmtN(c.clicks):'—')+'</td>'+
      '<td class="num">'+fmtN(c.leads)+'</td>'+
      '<td class="num">'+(c.roas?c.roas.toFixed(1)+'x':'—')+'</td>'+
      '<td>'+(c.connected?statusPill('connected'):'<span class="pill pill--disconnected"><span class="dot"></span>Not connected</span>')+'</td></tr>';
  }).join('');
  $('#overviewChannelTable').innerHTML =
    '<div class="table-wrap"><table><thead><tr><th>Channel</th><th class="num">Spend</th><th class="num">Clicks</th><th class="num">Leads</th><th class="num">ROAS</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  $('#overviewChannelTable').firstChild.style.border='none';
  $('#overviewChannelTable').parentElement.classList.add('is-flush');
}

/* ==================================================================
   CHANNELS
   ================================================================== */
function metric(k,v){ return '<div class="m"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }

function channelCardMetrics(c){
  if(c.id==='seo'){
    return metric('Clicks',fmtN(c.clicks)) + metric('Impressions',fmtN(c.seoImpr)) +
           metric('Avg position',c.avgPos.toFixed(1)) + metric('Leads',fmtN(c.leads));
  }
  if(c.id==='wa'||c.id==='fbgroups'){
    return metric('Members',fmtN(c.members)) + metric('Messages',fmtN(c.messages)) +
           metric('Leads',fmtN(c.leads)) + metric('Reply rate', (c.id==='wa'?'62%':'41%'));
  }
  // paid channels
  var reach = c.reach ? fmtN(c.reach) : '—';
  return metric('Spend',fmt$(c.spend)) + metric(c.reach?'Reach':'Clicks', c.reach?reach:fmtN(c.clicks)) +
         metric('Leads',fmtN(c.leads)) + metric('ROAS', c.roas?c.roas.toFixed(1)+'x':'—');
}

function renderChannels(){
  var ch=getChannels();
  $('#navChannelCount').textContent = ch.filter(function(c){return c.connected;}).length;
  $('#channelGrid').innerHTML = ch.map(function(c){
    var kw='';
    if(c.id==='seo' && c.keywords){
      kw='<div class="kw">'+c.keywords.map(function(k){return '<span class="tag">'+k+'</span>';}).join('')+'</div>';
    }
    var pill = c.connected
      ? statusPill('connected')
      : '<span class="pill pill--disconnected"><span class="dot"></span>Not connected</span>';
    var btn = c.connected
      ? '<button class="btn btn--ghost btn--sm" data-disc="'+c.id+'">Manage</button>'
      : '<button class="btn btn--primary btn--sm" data-conn="'+c.id+'">Connect</button>';
    return '<div class="ch-card">'+
      '<div class="ch-card__head">'+chIcon(c)+'<div class="ti"><div class="nm">'+c.name+'</div><div class="ty">'+c.type+'</div></div></div>'+
      '<div class="ch-metrics">'+channelCardMetrics(c)+'</div>'+ kw +
      '<div class="ch-card__foot">'+pill+btn+'</div>'+
    '</div>';
  }).join('');

  $$('#channelGrid [data-conn]').forEach(function(b){
    b.addEventListener('click',function(){ toggleConnect(b.getAttribute('data-conn'), true); });
  });
  $$('#channelGrid [data-disc]').forEach(function(b){
    b.addEventListener('click',function(){ toggleConnect(b.getAttribute('data-disc'), false); });
  });
}

function toggleConnect(id, connect){
  var ch=getChannels();
  ch.forEach(function(c){ if(c.id===id) c.connected=connect; });
  save('channels', ch);
  var c=channelById(id);
  toast((connect?'Connected ':'Disconnected ')+c.name+' (demo)');
  renderChannels(); renderIntegrations(); renderOverviewChannelTable();
}

/* ==================================================================
   CAMPAIGNS
   ================================================================== */
function renderCampaignFilter(){
  var sel=$('#campFilter');
  var opts='<option value="">All channels</option>'+getChannels().map(function(c){
    return '<option value="'+c.id+'">'+c.name+'</option>';
  }).join('');
  sel.innerHTML=opts;
}

function renderCampaigns(){
  var camps=getCampaigns();
  var q=($('#campSearch').value||'').toLowerCase();
  var f=$('#campFilter').value;
  var list=camps.filter(function(c){
    if(f && c.ch!==f) return false;
    if(q && c.name.toLowerCase().indexOf(q)<0) return false;
    return true;
  });
  var rows=list.map(function(c){
    var ch=channelById(c.ch)||{name:c.ch,color:'#888',icon:'?'};
    var cpl = c.conv ? (c.spend/c.conv) : 0;
    return '<tr><td>'+c.name+'</td>'+
      '<td><div class="ch-cell">'+chIcon(ch)+'<span>'+ch.name+'</span></div></td>'+
      '<td>'+statusPill(c.status)+'</td>'+
      '<td class="num">'+fmt$(c.spend)+'</td>'+
      '<td class="num">'+fmtN(c.clicks)+'</td>'+
      '<td class="num">$'+cpl.toFixed(2)+'</td>'+
      '<td class="num">'+fmtN(c.conv)+'</td>'+
      '<td class="num">'+c.roas.toFixed(1)+'x</td></tr>';
  }).join('');
  if(!rows) rows='<tr><td colspan="8" style="text-align:center;color:var(--ink-3);padding:30px">No campaigns match your filters.</td></tr>';
  $('#campTable').innerHTML =
    '<table><thead><tr><th>Campaign</th><th>Channel</th><th>Status</th><th class="num">Spend</th><th class="num">Clicks</th><th class="num">CPL</th><th class="num">Conversions</th><th class="num">ROAS</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

/* ==================================================================
   ATTRIBUTION
   ================================================================== */
function renderAttribution(){
  // funnel from aggregate demo numbers
  var stages=[
    {lbl:'Impressions', val:4920000},
    {lbl:'Clicks',      val:64060},
    {lbl:'Leads',       val:1639},
    {lbl:'Sales',       val:416}
  ];
  var max=stages[0].val;
  $('#funnel').innerHTML = stages.map(function(s,i){
    var w=Math.max(16, (s.val/max)*100);
    var conv = i>0 ? ((s.val/stages[i-1].val)*100).toFixed(1)+'% from '+stages[i-1].lbl.toLowerCase() : 'top of funnel';
    return '<div class="stage"><div class="bar" style="width:'+w+'%"><span class="lbl">'+s.lbl+'</span><span class="val">'+fmtN(s.val)+'</span></div><div class="conv">'+conv+'</div></div>';
  }).join('');

  // source table
  var src=getSources().slice().sort(function(a,b){return b.rev-a.rev;});
  var totRev=src.reduce(function(s,r){return s+r.rev;},0);
  var rows=src.map(function(r){
    var cvr=(r.sales/r.leads*100).toFixed(1);
    var share=(r.rev/totRev*100).toFixed(0);
    return '<tr><td><b>'+r.src+'</b></td>'+
      '<td class="num">'+fmtN(r.leads)+'</td>'+
      '<td class="num">'+fmtN(r.sales)+'</td>'+
      '<td class="num">'+cvr+'%</td>'+
      '<td class="num">'+fmt$(r.rev)+'</td>'+
      '<td class="num">'+share+'%</td></tr>';
  }).join('');
  $('#sourceTable').innerHTML =
    '<div class="table-wrap" style="border:none;box-shadow:none;border-radius:0"><table><thead><tr><th>Lead source</th><th class="num">Leads</th><th class="num">Sales</th><th class="num">CVR</th><th class="num">Revenue</th><th class="num">% of rev</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  $('#sourceTable').parentElement.classList.add('is-flush');
}

/* ==================================================================
   SETTINGS
   ================================================================== */
function renderIntegrations(){
  var ch=getChannels();
  $('#integrationList').innerHTML = ch.map(function(c){
    return '<div class="row-line"><span class="ch-ic" style="background:'+c.color+'">'+c.icon+'</span>'+
      '<div class="gx"><div class="t">'+c.name+'</div><div class="d">'+c.type+' · '+(c.connected?'Connected (demo)':'Not connected')+'</div></div>'+
      '<label class="switch"><input type="checkbox" data-int="'+c.id+'" '+(c.connected?'checked':'')+'><span class="sl"></span></label></div>';
  }).join('');
  $$('#integrationList [data-int]').forEach(function(inp){
    inp.addEventListener('change',function(){ toggleConnect(inp.getAttribute('data-int'), inp.checked); });
  });
}

function renderTeam(){
  $('#teamList').innerHTML = getTeam().map(function(m){
    var init=m.nm.split(' ').map(function(s){return s[0];}).join('').slice(0,2);
    return '<div class="team-row"><span class="avatar" style="background:'+m.color+'">'+init+'</span>'+
      '<div class="meta"><div class="nm">'+m.nm+'</div><div class="em">'+m.em+'</div></div>'+
      '<span class="tag">'+m.rl+'</span></div>';
  }).join('');
}

function renderSettings(){ renderIntegrations(); renderTeam(); }

/* reset demo data */
function resetDemo(){
  modal('Reset demo data?',
    'This clears all locally stored marketing data and connection toggles, then restores the original seeded dataset.',
    'Reset', 'btn--danger', function(){
      Object.keys(localStorage).forEach(function(k){ if(k.indexOf(LS)===0 && k!==LS+'auth') localStorage.removeItem(k); });
      seedIfNeeded();
      renderAll();
      toast('Demo data reset');
    });
}

/* ==================================================================
   MODAL
   ================================================================== */
function modal(title, body, okLabel, okClass, onOk){
  var card=$('#modalCard');
  card.innerHTML='<h3>'+title+'</h3><p>'+body+'</p><div class="modal__row">'+
    '<button class="btn btn--ghost" id="mCancel">Cancel</button>'+
    '<button class="btn '+(okClass||'btn--primary')+'" id="mOk">'+okLabel+'</button></div>';
  var m=$('#modal'); m.classList.add('show');
  function close(){ m.classList.remove('show'); }
  $('#mCancel').onclick=close;
  $('#mOk').onclick=function(){ close(); if(onOk) onOk(); };
  m.onclick=function(e){ if(e.target===m) close(); };
}

/* ==================================================================
   NAV / VIEW ROUTING
   ================================================================== */
var TITLES={overview:'Overview',channels:'Channels',campaigns:'Campaigns',attribution:'Attribution',settings:'Settings'};

function show(view){
  $$('.view').forEach(function(v){v.classList.toggle('active', v.id==='view-'+view);});
  $$('.nav-item').forEach(function(n){n.classList.toggle('active', n.getAttribute('data-view')===view);});
  $('#pageTitle').textContent=TITLES[view]||'';
  $('#crumb').textContent=TITLES[view]||'';
  if(window.innerWidth<=860){ $('#app').classList.remove('nav-open'); $('#navScrim').classList.remove('show'); }
  window.scrollTo(0,0);
}

function renderAll(){
  renderOverview();
  renderChannels();
  renderCampaignFilter();
  renderCampaigns();
  renderAttribution();
  renderSettings();
}

/* ------------------------------------------------------------------ wire up */
function init(){
  renderAll();

  $$('.nav-item').forEach(function(n){
    n.addEventListener('click',function(){ show(n.getAttribute('data-view')); });
  });
  $$('[data-goto]').forEach(function(b){
    b.addEventListener('click',function(){ show(b.getAttribute('data-goto')); });
  });

  // settings tabs
  $$('#settingsTabs button').forEach(function(b){
    b.addEventListener('click',function(){
      $$('#settingsTabs button').forEach(function(x){x.classList.remove('active');});
      b.classList.add('active');
      var p=b.getAttribute('data-pane');
      $$('.settings-pane').forEach(function(pn){pn.classList.toggle('active', pn.id==='pane-'+p);});
    });
  });

  // campaigns filters
  $('#campSearch').addEventListener('input', renderCampaigns);
  $('#campFilter').addEventListener('change', renderCampaigns);

  // reset
  $('#resetBtn').addEventListener('click', resetDemo);

  // range selector (demo — toast only, data is static sample)
  $('#rangeSel').addEventListener('change',function(){
    toast('Range set to '+this.options[this.selectedIndex].text+' (demo data is static)');
  });

  // sidebar collapse / mobile nav
  $('#collapseBtn').addEventListener('click',function(){ $('#app').classList.toggle('sidebar-collapsed'); });
  $('#burger').addEventListener('click',function(){ $('#app').classList.add('nav-open'); $('#navScrim').classList.add('show'); });
  $('#navScrim').addEventListener('click',function(){ $('#app').classList.remove('nav-open'); $('#navScrim').classList.remove('show'); });

  $('#bell').addEventListener('click',function(){ toast('No new alerts (demo)'); });

  // sign out
  $('#signout').addEventListener('click',function(e){
    e.preventDefault();
    localStorage.removeItem(LS+'auth');
    location.replace('index.html');
  });
}

if(document.readyState!=='loading') init();
else document.addEventListener('DOMContentLoaded', init);

})();
