/* =================================================================
   BETTER TAP — shared interactions
   Nav state · mobile menu · scroll reveals · zip checker ·
   product gallery · FAQ accordion · qty · cart count
   All progressive: works without it, better with it.
   ================================================================= */
(function () {
  'use strict';
  var docEl = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Smooth scroll (Lenis) for the "water flow" feel ---- */
  var lenis = null;
  if (!reduce) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js';
    s.onload = function () {
      if (!window.Lenis) return;
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
      function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      // in-page anchor links flow smoothly
      document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click', function(e){
          var id=a.getAttribute('href'); if(id.length<2) return;
          var t=document.querySelector(id); if(!t) return;
          e.preventDefault(); lenis.scrollTo(t,{offset:-80,duration:1.2});
        });
      });
    };
    document.head.appendChild(s);
  }

  /* ---- Persistent buy button + decorative water-filter element ---- */
  var isApp = location.pathname.indexOf('/crm/') !== -1 || location.pathname.indexOf('/account/') !== -1 || location.pathname.indexOf('/installer/') !== -1 || location.pathname.indexOf('/marketing/') !== -1;
  if (!isApp) {
    var addEls = function () {
      if (!document.querySelector('.buybar')) {
        var buy = document.createElement('a');
        buy.href = 'checkout.html?plan=lease'; buy.className = 'buybar'; buy.setAttribute('aria-label', 'Buy BetterTap');
        buy.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M6 7h12l-1 13H7L6 7Z" stroke="currentColor" stroke-width="1.8"/><path d="M9 7a3 3 0 0 1 6 0" stroke="currentColor" stroke-width="1.8"/></svg> Get BetterTap <b>from $25/mo</b>';
        document.body.appendChild(buy);
      }
      if (!document.querySelector('.waterflow')) {
        var wf = document.createElement('div'); wf.className = 'waterflow'; wf.setAttribute('aria-hidden', 'true');
        wf.innerHTML = '<div class="glass"><div class="glass__water"><span class="b b1"></span><span class="b b2"></span><span class="b b3"></span></div></div>';
        document.body.appendChild(wf);
      }
    };
    if (document.body) addEls(); else document.addEventListener('DOMContentLoaded', addEls);
  }

  /* ---- SIGNATURE: scroll-reactive cup fill — fills on scroll down,
         empties on scroll up. Bound to scroll progress, rAF-smoothed. ---- */
  if (!isApp && !reduce) {
    var gw = document.querySelector('.glass__water');
    if (gw) {
      var fTarget = 0, fCur = 0, fTicking = false;
      var fMeasure = function () {
        var max = document.documentElement.scrollHeight - innerHeight;
        fTarget = max > 0 ? Math.min(1, Math.max(0, (scrollY || pageYOffset) / max)) : 0;
        if (!fTicking) { fTicking = true; requestAnimationFrame(fLoop); }
      };
      var fLoop = function () {
        fCur += (fTarget - fCur) * 0.12;
        gw.style.height = (8 + fCur * 84).toFixed(1) + '%';
        if (Math.abs(fTarget - fCur) > 0.0008) { requestAnimationFrame(fLoop); } else { fTicking = false; }
      };
      addEventListener('scroll', fMeasure, { passive: true });
      addEventListener('resize', fMeasure, { passive: true });
      fMeasure();
    }
  }

  /* ---- Hero mouse-parallax tilt (desktop, motion-allowed) ---- */
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var stage = el.closest('.phero__stage') || el.parentElement;
      var area = el.closest('.phero') || stage;
      area.addEventListener('mousemove', function (e) {
        var r = area.getBoundingClientRect();
        var px = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var py = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transform = 'perspective(900px) rotateY(' + (px * 6).toFixed(2) + 'deg) rotateX(' + (-py * 5).toFixed(2) + 'deg)';
      }, { passive: true });
      area.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---- Button ripple (droplet on click) ---- */
  if (!reduce) {
    document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var ex = b.querySelector('.ripple'); if (ex) ex.remove();
        var r = b.getBoundingClientRect();
        var sp = document.createElement('span'); sp.className = 'ripple';
        sp.style.left = (e.clientX - r.left) + 'px'; sp.style.top = (e.clientY - r.top) + 'px';
        b.appendChild(sp); b.classList.add('rippling');
        setTimeout(function () { b.classList.remove('rippling'); if (sp.parentNode) sp.remove(); }, 620);
      });
    });
  }

  /* ---- Early-bird promo popup (home) ---- */
  var promo = document.querySelector('.promo');
  if (promo) {
    var PROMO_END = new Date('2026-06-29T23:59:59'); // ~2 weeks
    var dismissed = false;
    try { dismissed = localStorage.getItem('bt_promo_dismissed') === '1'; } catch (e) {}
    var now = new Date();
    if (!dismissed && now < PROMO_END) {
      setTimeout(function () { promo.classList.add('open'); }, 1200);
    }
    var close = function () {
      promo.classList.remove('open');
      try { localStorage.setItem('bt_promo_dismissed', '1'); } catch (e) {}
    };
    promo.querySelectorAll('[data-promo-close]').forEach(function (b) { b.addEventListener('click', close); });
    promo.addEventListener('click', function (e) { if (e.target === promo) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---- Nav scrolled state ---- */
  var nav = document.querySelector('.nav');
  function onScroll(){ if(nav) nav.classList.toggle('scrolled',(scrollY||pageYOffset)>10); }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* ---- Mobile menu ---- */
  var burger = document.querySelector('.nav__burger');
  if (burger) burger.addEventListener('click', function(){ document.body.classList.toggle('menu-open'); });
  document.querySelectorAll('.mobile-menu a').forEach(function(a){
    a.addEventListener('click', function(){ document.body.classList.remove('menu-open'); });
  });

  /* ---- Scroll reveals (IntersectionObserver) ---- */
  if (!reduce && 'IntersectionObserver' in window) {
    docEl.classList.add('io');
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.12, rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('[data-rise]').forEach(function(el){ io.observe(el); });
  }

  /* ---- Count-ups ---- */
  function countUp(el){
    if(el.dataset.done) return; el.dataset.done='1';
    var to=parseFloat(el.getAttribute('data-count'))||0, suf=el.getAttribute('data-suffix')||'', pre=el.getAttribute('data-prefix')||'';
    var t0=null, dur=1400;
    function tick(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1); var e=1-Math.pow(1-p,3);
      el.textContent=pre+Math.round(to*e)+(p===1?suf:''); if(p<1)requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  if('IntersectionObserver' in window){
    var io2=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){countUp(e.target);io2.unobserve(e.target);}});},{threshold:.5});
    document.querySelectorAll('[data-count]').forEach(function(el){io2.observe(el);});
  } else { document.querySelectorAll('[data-count]').forEach(countUp); }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.acc__q').forEach(function(q){
    q.addEventListener('click', function(){
      var item=q.closest('.acc__item'), a=item.querySelector('.acc__a');
      var open=item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight+'px' : 0;
    });
  });

  /* ---- Zip / water checker (demo) ---- */
  var zip = document.querySelector('[data-zip]');
  if (zip){
    var out = document.querySelector('[data-zip-out]');
    zip.addEventListener('submit', function(e){
      e.preventDefault();
      var v=(zip.querySelector('input')||{}).value||'';
      var city = ({ '10001':'New York, NY','90001':'Los Angeles, CA','60601':'Chicago, IL','33101':'Miami, FL','77001':'Houston, TX' })[v.trim()] || 'your area';
      if(out){ out.hidden=false; var c=out.querySelector('[data-zip-city]'); if(c)c.textContent=city; out.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'}); }
    });
  }

  /* ---- Product gallery ---- */
  document.querySelectorAll('[data-gallery]').forEach(function(g){
    var main=g.querySelector('[data-gallery-main] img');
    g.querySelectorAll('[data-thumb]').forEach(function(t){
      t.addEventListener('click', function(){
        g.querySelectorAll('[data-thumb]').forEach(function(x){x.classList.remove('active');});
        t.classList.add('active');
        var src=t.getAttribute('data-thumb'); if(main&&src)main.src=src;
      });
    });
  });

  /* ---- Color swatches ---- */
  document.querySelectorAll('[data-swatches]').forEach(function(s){
    s.querySelectorAll('.swatch').forEach(function(sw){
      sw.addEventListener('click', function(){
        s.querySelectorAll('.swatch').forEach(function(x){x.classList.remove('active');});
        sw.classList.add('active');
        var lbl=document.querySelector('[data-swatch-label]'); if(lbl&&sw.dataset.name)lbl.textContent=sw.dataset.name;
        // swap the product gallery to this colorway's images
        var imgs=(sw.dataset.imgs||'').split(',').filter(Boolean);
        var g=document.querySelector('[data-gallery]');
        if(imgs.length && g){
          var main=g.querySelector('[data-gallery-main] img');
          if(main) main.src=imgs[0];
          var thumbs=g.querySelector('.pdp__thumbs');
          if(thumbs){
            thumbs.innerHTML=imgs.map(function(src,i){
              return '<button class="'+(i===0?'active':'')+'" data-thumb="'+src+'" aria-label="View '+(i+1)+'"><img src="'+src+'" alt="" loading="lazy"></button>';
            }).join('');
            thumbs.querySelectorAll('[data-thumb]').forEach(function(t){
              t.addEventListener('click', function(){
                thumbs.querySelectorAll('[data-thumb]').forEach(function(x){x.classList.remove('active');});
                t.classList.add('active');
                if(main) main.src=t.getAttribute('data-thumb');
              });
            });
          }
        }
      });
    });
  });

  /* ---- Quantity ---- */
  document.querySelectorAll('[data-qty]').forEach(function(q){
    var val=q.querySelector('span'), n=1;
    q.querySelector('[data-dec]').addEventListener('click',function(){n=Math.max(1,n-1);val.textContent=n;});
    q.querySelector('[data-inc]').addEventListener('click',function(){n++;val.textContent=n;});
  });

  /* ---- Add to cart (demo count) ---- */
  var cartCount=0, cartEl=document.querySelector('[data-cart-count]');
  document.querySelectorAll('[data-add-cart]').forEach(function(b){
    b.addEventListener('click', function(){
      var qEl=document.querySelector('[data-qty] span');
      cartCount += qEl?parseInt(qEl.textContent,10):1;
      if(cartEl){cartEl.textContent=cartCount; cartEl.parentElement.style.display='grid';}
      var t=b.querySelector('span')||b, old=t.textContent; t.textContent='Added ✓';
      setTimeout(function(){t.textContent=old;},1400);
    });
  });

  /* ---- Newsletter / forms (demo) ---- */
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var msg=f.getAttribute('data-msg')||'Thanks — we’ll be in touch.';
      var n=document.createElement('p'); n.textContent=msg; n.style.cssText='margin-top:12px;font-weight:600;color:var(--blue)';
      if(!f.querySelector('.form-note')){n.className='form-note';f.appendChild(n);}
      f.reset();
    });
  });
})();
