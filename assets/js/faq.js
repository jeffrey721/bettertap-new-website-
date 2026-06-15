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
    phone: '(833) 269-1704',
    whatsapp: 'https://wa.me/18332691704'
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
      a: "One BetterTap replaces bottled-water cases, pitcher filters, coolers and kettles — cleaner water on tap, far less plastic and cost." }
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
