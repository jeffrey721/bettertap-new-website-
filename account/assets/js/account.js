/* =====================================================================
   BETTER TAP — Customer Account Portal  (FRONT-END PROTOTYPE)
   ---------------------------------------------------------------------
   HONESTY / DEMO NOTICE
   This is a self-contained front-end prototype. There is NO real backend.
   "Authentication" is simulated and all data persists only in this
   browser's localStorage (key prefix: bt_acct_). Anyone can sign in with
   any non-empty credentials, and the 2FA accepts any 6 digits.

   PRODUCTION REQUIREMENTS (NOT implemented here):
     - Real backend API + server-side session/JWT issuance
     - Passwords hashed & salted (bcrypt/argon2); never stored client-side
     - Genuine 2FA (TOTP / SMS / email OTP) verified server-side
     - A real database for customers, machines, service requests, docs
     - Role-based access control (RBAC) + authorization on every endpoint
     - CSRF protection, rate limiting, audit logging, secure cookies
     - Input validation/sanitization on the server, HTTPS everywhere
   ===================================================================== */

(function () {
  "use strict";

  var PREFIX = "bt_acct_";
  var get = function (k, d) {
    try { var v = localStorage.getItem(PREFIX + k); return v === null ? d : v; }
    catch (e) { return d; }
  };
  var set = function (k, v) { try { localStorage.setItem(PREFIX + k, v); } catch (e) {} };
  var getJSON = function (k, d) {
    try { var v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : d; }
    catch (e) { return d; }
  };
  var setJSON = function (k, v) { set(k, JSON.stringify(v)); };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ===============================================================
     LOGIN PAGE  (index.html)
     =============================================================== */
  function initLogin() {
    var stepEmail = $("#step-email");
    var step2fa = $("#step-2fa");
    if (!stepEmail) return;

    // password show/hide
    var pwToggle = $("#pw-toggle");
    if (pwToggle) {
      pwToggle.addEventListener("click", function () {
        var input = $("#password");
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        pwToggle.textContent = show ? "Hide" : "Show";
      });
    }

    // Step 1 -> Step 2
    var loginForm = $("#login-form");
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#email").value.trim();
      var pw = $("#password").value.trim();
      var err = $("#login-err");
      if (!email || !pw) {
        err.textContent = "Please enter your email and password.";
        return;
      }
      err.textContent = "";
      // remember email (demo)
      if ($("#remember").checked) { set("remember_email", email); }
      else { try { localStorage.removeItem(PREFIX + "remember_email"); } catch (x) {} }
      set("pending_email", email);

      stepEmail.style.display = "none";
      step2fa.style.display = "block";
      $("#otp-target").textContent = email;
      var first = $(".otp input");
      if (first) first.focus();
    });

    // prefill remembered email
    var remembered = get("remember_email", "");
    if (remembered) {
      $("#email").value = remembered;
      $("#remember").checked = true;
    }

    // OTP auto-advance
    var otps = $$(".otp input");
    otps.forEach(function (inp, i) {
      inp.addEventListener("input", function () {
        inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
        if (inp.value && i < otps.length - 1) otps[i + 1].focus();
        $("#otp-err").textContent = "";
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !inp.value && i > 0) otps[i - 1].focus();
      });
      inp.addEventListener("paste", function (e) {
        e.preventDefault();
        var data = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
        for (var j = 0; j < data.length && j < otps.length; j++) otps[j].value = data[j];
        var next = Math.min(data.length, otps.length - 1);
        otps[next].focus();
      });
    });

    // Verify
    var verifyForm = $("#verify-form");
    verifyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = otps.map(function (o) { return o.value; }).join("");
      var err = $("#otp-err");
      if (!/^\d{6}$/.test(code)) {
        err.textContent = "Enter all 6 digits.";
        return;
      }
      // PROTOTYPE: accept 123456 or any 6 digits
      set("auth", "1");
      set("email", get("pending_email", "you@example.com"));
      window.location.href = "app.html";
    });

    // Back to step 1
    var back2fa = $("#back-2fa");
    if (back2fa) {
      back2fa.addEventListener("click", function () {
        step2fa.style.display = "none";
        stepEmail.style.display = "block";
        otps.forEach(function (o) { o.value = ""; });
        $("#otp-err").textContent = "";
      });
    }

    // demo "forgot password"
    var forgot = $("#forgot");
    if (forgot) {
      forgot.addEventListener("click", function (e) {
        e.preventDefault();
        alert("Demo only: a real reset link would be emailed to you.");
      });
    }
  }

  /* ===============================================================
     DASHBOARD  (app.html)
     =============================================================== */

  var DEFAULT_PROFILE = {
    name: "Jeffrey Cohen",
    email: "jeffrey@yjctrade.com",
    address: "142 Maple Grove Ave, Brooklyn, NY 11215"
  };
  var DEFAULT_NOTIF = { service: true, tips: true, marketing: false };
  var DEFAULT_REQUESTS = [
    { id: "SR-1041", subject: "Filter replacement", category: "Filter", status: "Completed", date: "Feb 2, 2026" },
    { id: "SR-1058", subject: "Annual service visit", category: "Repair", status: "Scheduled", date: "May 2026" },
    { id: "SR-1066", subject: "Hot-water flow check", category: "Other", status: "In progress", date: "Apr 18, 2026" }
  ];

  function statusPill(status) {
    var s = status.toLowerCase();
    var cls = "pill--neutral";
    if (s.indexOf("complet") > -1) cls = "pill--ok";
    else if (s.indexOf("schedul") > -1) cls = "pill--info";
    else if (s.indexOf("progress") > -1) cls = "pill--warn";
    else if (s.indexOf("open") > -1) cls = "pill--warn";
    return '<span class="pill ' + cls + '">' + escapeHTML(status) + "</span>";
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* deterministic Code128-style barcode visual (NOT a scannable barcode) */
  function renderBarcode(svg, seed) {
    if (!svg) return;
    var ns = "http://www.w3.org/2000/svg";
    var W = 280, H = 64, x = 0;
    // simple seeded pseudo-random from the serial string
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) & 0xffffffff;
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff); }
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    // quiet zone
    x = 6;
    while (x < W - 6) {
      var bw = 1 + Math.floor(rnd() * 4);       // bar width 1-4
      var gap = 1 + Math.floor(rnd() * 3);      // gap 1-3
      if (rnd() > 0.5 || x === 6) {
        var rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", 0);
        rect.setAttribute("width", bw);
        rect.setAttribute("height", H);
        rect.setAttribute("fill", "#141937");
        svg.appendChild(rect);
      }
      x += bw + gap;
    }
  }

  function initApp() {
    var shell = $(".shell");
    if (!shell) return;

    // GUARD
    if (get("auth", "0") !== "1") {
      window.location.replace("index.html");
      return;
    }

    // hydrate profile / who
    var profile = getJSON("profile", DEFAULT_PROFILE);
    if (get("email", "")) profile.email = profile.email || get("email", "");
    var initials = profile.name.split(/\s+/).map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();
    $$("[data-initials]").forEach(function (el) { el.textContent = initials; });
    $$("[data-username]").forEach(function (el) { el.textContent = profile.name; });
    $$("[data-useremail]").forEach(function (el) { el.textContent = profile.email; });

    // sign out
    $$("[data-signout]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        try { localStorage.removeItem(PREFIX + "auth"); } catch (x) {}
        window.location.replace("index.html");
      });
    });

    // user dropdown
    var userMenu = $(".user-menu");
    if (userMenu) {
      $(".avatar", userMenu).addEventListener("click", function (e) {
        e.stopPropagation();
        userMenu.classList.toggle("open");
      });
      document.addEventListener("click", function () { userMenu.classList.remove("open"); });
    }

    /* ---- navigation (sidebar + mobile tabs) ---- */
    function show(section) {
      $$(".section-pane").forEach(function (p) { p.classList.toggle("active", p.id === "pane-" + section); });
      $$("[data-nav]").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-nav") === section); });
      set("last_section", section);
      var c = $(".content"); if (c) c.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    $$("[data-nav]").forEach(function (n) {
      n.addEventListener("click", function () { show(n.getAttribute("data-nav")); });
    });
    show(get("last_section", "machine"));

    /* ---- barcode ---- */
    var serial = "BT-EDGE-2026-018472";
    renderBarcode($("#barcode"), serial);

    /* ---- gallery lightbox ---- */
    var lightbox = $("#lightbox");
    if (lightbox) {
      $$(".gallery button").forEach(function (b) {
        b.addEventListener("click", function () {
          $("#lightbox-img").src = b.getAttribute("data-full") || $("img", b).src;
          lightbox.classList.add("open");
        });
      });
      $(".close", lightbox).addEventListener("click", function () { lightbox.classList.remove("open"); });
      lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.classList.remove("open"); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") lightbox.classList.remove("open"); });
    }

    /* ---- service requests ---- */
    var requests = getJSON("requests", DEFAULT_REQUESTS);
    var nextId = parseInt(get("req_seq", "1067"), 10);

    function renderRequests() {
      var tbody = $("#req-body");
      if (!tbody) return;
      if (!requests.length) {
        tbody.innerHTML = '<tr><td colspan="4"><div class="empty">No service requests yet.</div></td></tr>';
        return;
      }
      tbody.innerHTML = requests.map(function (r) {
        return "<tr>" +
          '<td><div class="subj">' + escapeHTML(r.subject) + '</div><div class="meta">' + escapeHTML(r.id) + " · " + escapeHTML(r.category) + "</div></td>" +
          "<td>" + escapeHTML(r.date) + "</td>" +
          "<td>" + statusPill(r.status) + "</td>" +
          "</tr>";
      }).join("");
    }
    renderRequests();

    var reqForm = $("#req-form");
    if (reqForm) {
      reqForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var subject = $("#req-subject").value.trim();
        var category = $("#req-category").value;
        var desc = $("#req-desc").value.trim();
        if (!subject) { $("#req-subject").focus(); return; }
        var now = new Date();
        var dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        requests.unshift({
          id: "SR-" + nextId,
          subject: subject,
          category: category,
          status: "Open",
          date: dateStr,
          desc: desc
        });
        nextId++;
        set("req_seq", String(nextId));
        setJSON("requests", requests);
        renderRequests();
        reqForm.reset();
        toast("Service request submitted");
      });
    }

    /* ---- account profile ---- */
    var profForm = $("#profile-form");
    if (profForm) {
      $("#pf-name").value = profile.name;
      $("#pf-email").value = profile.email;
      $("#pf-address").value = profile.address;
      profForm.addEventListener("submit", function (e) {
        e.preventDefault();
        profile = {
          name: $("#pf-name").value.trim() || profile.name,
          email: $("#pf-email").value.trim() || profile.email,
          address: $("#pf-address").value.trim() || profile.address
        };
        setJSON("profile", profile);
        // refresh header bits
        var ini = profile.name.split(/\s+/).map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase();
        $$("[data-initials]").forEach(function (el) { el.textContent = ini; });
        $$("[data-username]").forEach(function (el) { el.textContent = profile.name; });
        $$("[data-useremail]").forEach(function (el) { el.textContent = profile.email; });
        toast("Profile saved");
      });
    }

    /* ---- notification toggles ---- */
    var notif = getJSON("notif", DEFAULT_NOTIF);
    $$("[data-notif]").forEach(function (cb) {
      var key = cb.getAttribute("data-notif");
      cb.checked = !!notif[key];
      cb.addEventListener("change", function () {
        notif[key] = cb.checked;
        setJSON("notif", notif);
        toast("Preferences updated");
      });
    });

    /* ---- refer & earn ---- */
    initRefer();

    function copyText(text, okMsg) {
      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          toast(okMsg);
        } catch (e) { toast("Copy failed — please copy manually"); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
      } else { fallback(); }
    }

    function initRefer() {
      // build code from the customer's name, e.g. "JEFFREY-50"
      var first = (profile.name || "Friend").split(/\s+/)[0].replace(/[^a-z]/gi, "").toUpperCase() || "FRIEND";
      var code = first + "-50";
      var link = "https://drinkbettertap.com/?ref=" + code;

      var codeEl = $("#ref-code");
      var linkEl = $("#ref-link");
      if (codeEl) codeEl.textContent = code;
      if (linkEl) linkEl.textContent = link;

      // copy buttons
      $$("[data-copy]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = $(btn.getAttribute("data-copy"));
          if (!target) return;
          var isCode = target === codeEl;
          copyText(target.textContent.trim(), isCode ? "Code copied to clipboard" : "Link copied to clipboard");
        });
      });

      // share intents
      var msg = "I love my BetterTap water system — use my code " + code + " to get $50 off: " + link;
      var enc = encodeURIComponent;
      var wa = $("#share-whatsapp"); if (wa) wa.href = "https://wa.me/?text=" + enc(msg);
      var em = $("#share-email"); if (em) em.href = "mailto:?subject=" + enc("Get $50 off a BetterTap") + "&body=" + enc(msg);
      var fb = $("#share-facebook"); if (fb) fb.href = "https://www.facebook.com/sharer/sharer.php?u=" + enc(link);
      var xs = $("#share-x"); if (xs) xs.href = "https://twitter.com/intent/tweet?text=" + enc(msg);

      // stats tracker (persisted)
      var DEFAULT_REFER = { invited: 4, signed: 2, earned: 100 };
      var stats = getJSON("refer", DEFAULT_REFER);
      function renderStats() {
        $$("[data-ref-stat]").forEach(function (el) {
          el.textContent = stats[el.getAttribute("data-ref-stat")];
        });
      }
      renderStats();

      var demo = $("#ref-demo");
      if (demo) {
        demo.addEventListener("click", function () {
          stats.invited += 1;
          // ~ every other invite signs up and earns $50
          if (stats.invited % 2 === 0) { stats.signed += 1; stats.earned += 50; }
          setJSON("refer", stats);
          renderStats();
          toast("Referral added — keep sharing!");
        });
      }
    }

    /* ---- toast ---- */
    var toastTimer;
    function toast(msg) {
      var t = $("#toast");
      if (!t) return;
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLogin();
    initApp();
  });
})();
