/* =================================================================
   "Ask Better Tap" — FAQ assistant
   -----------------------------------------------------------------
   STATIC-SITE IMPLEMENTATION: this answers ONLY from the curated
   knowledge base below using client-side retrieval (keyword scoring).
   It never invents product claims — if nothing matches well enough,
   it routes the user to support / WhatsApp.

   PRODUCTION UPGRADE (needs a backend): to make this a true LLM
   assistant with natural answers + streaming, add a server-side edge
   function that (1) embeds the question, (2) retrieves the top KB
   entries below as context, (3) calls an LLM with the API key kept
   server-side only, and (4) streams the grounded answer back. Keep
   this KB as the retrieval source so answers stay factual.
   ================================================================= */
(function () {
  'use strict';

  var SUPPORT = {
    email: 'hello@bettertap.com',
    phone: '(646) 386-1427',
    whatsapp: 'https://wa.me/16463861427'
  };

  // Knowledge base — curated from BetterTap / Strauss Edge FAQ content.
  var KB = [
    { q: 'What does BetterTap remove from my water?',
      k: 'remove contaminants lead chlorine pfas microplastics hormones mercury arsenic what filter clean safe',
      a: "BetterTap's MAZE filtration reduces 20+ contaminants — including lead, chlorine, PFAS, microplastics, hormones and mercury. It's certified to NSF/ANSI 42, 53, 401 & P473." },
    { q: 'Does it remove healthy minerals like reverse osmosis?',
      k: 'minerals calcium magnesium potassium reverse osmosis ro strip healthy keep retain',
      a: "No. Unlike reverse osmosis, MAZE keeps the healthy minerals — calcium, magnesium and potassium — so your water tastes clean and does your body good." },
    { q: 'How does installation work and how long does it take?',
      k: 'install installation setup plumber site survey how long time 90 minutes connect water line',
      a: "A technician professionally installs BetterTap in about 90 minutes. It includes a quick site survey and a connection to your water line — no DIY plumbing required." },
    { q: 'How often do I change the MAZE filter?',
      k: 'filter change replace maze how often 6 months dishwasher subscription cartridge',
      a: "The MAZE filter lasts about 6 months. It's dishwasher-safe, and you can put it on an annual subscription so a fresh filter arrives automatically — no guessing." },
    { q: 'How often is the UV lamp replaced?',
      k: 'uv lamp light replace annual year bacteria safe fresh',
      a: "The UV lamp is replaced about once a year. It keeps your water safe and fresh between pours by guarding against bacteria." },
    { q: 'What warranty comes with BetterTap?',
      k: 'warranty guarantee coverage 3 year three year 5 year five year extension protect',
      a: "BetterTap comes with a 3-year warranty, extendable to 5 years for full peace of mind." },
    { q: 'Can I get hot and cold water?',
      k: 'hot cold temperature boiling instant 30 settings degrees on demand',
      a: "Yes — purified hot and cold water on demand, with up to 30 temperature settings from icy cold to boiling." },
    { q: 'Why buy the official U.S. model instead of a grey-market import?',
      k: 'grey market import official 110v 220v voltage us warranty service authentic genuine',
      a: "Official BetterTap units are built for the U.S. (110V) and come with U.S. warranty and service. Grey-market imports are often 220V and aren't covered or serviced here — buy official to be protected." },
    { q: 'Is there a Sabbath mode?',
      k: 'sabbath shabbat mode kosher religious',
      a: "Yes, BetterTap supports a Sabbath mode." },
    { q: 'Is the water certified safe?',
      k: 'certified nsf ansi tested independent lab safe standards proof',
      a: "Yes. BetterTap is independently tested and certified to NSF/ANSI 42, 53, 401 & P473 — so the claims are verified, not just marketing." },
    { q: 'How much does BetterTap cost and how can I pay?',
      k: 'price cost pay payment installments lease how much money buy financing',
      a: "You can pay in full, choose monthly installments, or lease BetterTap. See the Shop page for current pricing and the plan that fits you best." },
    { q: 'Does it replace bottled water and pitchers?',
      k: 'replace bottled water pitcher cooler kettle plastic waste save',
      a: "One BetterTap replaces bottled-water cases, pitcher filters, coolers and kettles — cleaner water on tap, far less plastic and cost." },
    { q: 'Is BetterTap suitable for hard-water areas?',
      k: 'hard water soft water limescale scale buildup minerals area suitable',
      a: "Yes. BetterTap performs in both soft and hard-water homes and helps cut down the limescale buildup that hard water leaves behind." },
    { q: 'Does it remove fluoride?',
      k: 'fluoride remove keep stays naturally occurring beneficial',
      a: "No — naturally occurring fluoride stays in your water. MAZE targets harmful contaminants while leaving the beneficial elements in place." },
    { q: "Does it change my water's pH or mineral content (TDS)?",
      k: 'ph alkalinity tds total dissolved solids minerals calcium magnesium change preserve',
      a: "No. Because MAZE clarifies without stripping minerals, your water keeps its natural pH and TDS — including calcium and magnesium." },
    { q: 'Can I install BetterTap in a rental?',
      k: 'rental rent renting apartment landlord permission hole countertop install',
      a: "Absolutely — with your landlord's okay. Installation needs only a small hole through the countertop to route the connection below." },
    { q: 'Does it work with a water softener?',
      k: 'water softener compatible connect line before ahead works',
      a: "Yes. When you have a softener, our technician simply ties BetterTap into the line ahead of it so everything runs smoothly." },
    { q: 'How much energy does it use?',
      k: 'energy power electricity efficient consumption kwh kettle coffee usage',
      a: "Very little — BetterTap sips power, drawing less than a typical electric kettle or single-serve coffee maker over a day." },
    { q: 'Is BetterTap child-safe?',
      k: 'child safe lock safety kids children hot water guard',
      a: "Yes. A built-in child lock guards the hot-water dispense, and your technician will walk you through it at install." },
    { q: 'Can I fill jugs, bottles and pots?',
      k: 'fill jug bottle pot pan container drip tray remove tall spout',
      a: "Yes — the drip tray lifts away so taller pitchers, bottles and pots fit easily under the spout." },
    { q: 'How much counter space does it take?',
      k: 'space footprint counter size dimensions small kitchen room appliance',
      a: "About the footprint of a kettle or coffee machine — and since it replaces several appliances, most kitchens end up with more room, not less." },
    { q: 'What if I move to a new home?',
      k: 'move moving relocate new home house reinstall transfer address',
      a: "Take BetterTap with you. Just reach out to our team and we'll help arrange setup at your new place." },
    { q: 'Is there a satisfaction guarantee?',
      k: 'satisfaction guarantee 30 day trial risk free refund return cooling off money back',
      a: "Yes — try BetterTap risk-free with our 30-day satisfaction guarantee. If it isn't right for you, just let us know and we'll make it right." },
    { q: 'Are there hidden costs beyond the plan?',
      k: 'hidden costs fees extra charges plan included surprises maintenance',
      a: "No surprises. Your plan covers what you'd expect, and you can reach us anytime if a question comes up." }
  ];

  function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' '); }
  var STOP = {the:1,a:1,an:1,is:1,are:1,do:1,does:1,i:1,my:1,to:1,of:1,it:1,how:1,what:1,can:1,me:1,for:1,and:1,you:1,with:1,in:1,on:1,'s':1};

  function retrieve(query){
    var qWords = norm(query).split(/\s+/).filter(function(w){ return w && !STOP[w]; });
    if(!qWords.length) return null;
    var best = null, bestScore = 0;
    KB.forEach(function(item){
      var hay = norm(item.q + ' ' + item.k);
      var score = 0;
      qWords.forEach(function(w){
        if(hay.indexOf(w) !== -1) score += (w.length > 4 ? 2 : 1);
      });
      if(score > bestScore){ bestScore = score; best = item; }
    });
    return bestScore >= 2 ? best : null;
  }

  function init(){
    var box = document.getElementById('faqAsk');
    if(!box) return;
    var log = document.getElementById('faqLog');
    var form = document.getElementById('faqForm');
    var input = document.getElementById('faqInput');
    var chips = document.getElementById('faqChips');

    function add(text, who){
      var el = document.createElement('div');
      el.className = 'faq-msg faq-msg--' + who;
      el.innerHTML = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }

    function answer(query){
      add(query.replace(/</g,'&lt;'), 'user');
      var typing = document.createElement('div');
      typing.className = 'faq-msg faq-msg--bot faq-typing'; typing.textContent = '…';
      log.appendChild(typing); log.scrollTop = log.scrollHeight;
      setTimeout(function(){
        typing.remove();
        var hit = retrieve(query);
        if(hit){
          add('<b>'+hit.q+'</b><br>'+hit.a, 'bot');
        } else {
          add("I'm not sure about that one — I don't want to guess. Our team can help right away: " +
              '<a href="'+SUPPORT.whatsapp+'" target="_blank" rel="noopener">WhatsApp us</a>, ' +
              'email <a href="mailto:'+SUPPORT.email+'">'+SUPPORT.email+'</a>, or call '+SUPPORT.phone+'.', 'bot');
        }
      }, 450);
    }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var v = input.value.trim();
      if(!v) return;
      input.value = '';
      answer(v);
    });

    // suggested questions
    ['What does it remove?','How often do I change the filter?','How does installation work?','What warranty do I get?'].forEach(function(s){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'faq-chip'; b.textContent = s;
      b.addEventListener('click', function(){ answer(s); });
      chips.appendChild(b);
    });
  }

  if(document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
