# Pushing the Better Tap brand into your Shopify "Impact" theme

Your store (**drinkbettertap.com**) currently has two themes:

- **Horizon** — *Live / published*
- **Impact** — *Installed but unpublished (this is the one you bought)*

> ⚠️ I was able to confirm this and I *can* write to the **unpublished Impact** theme, but the
> Shopify connector blocked me from **reading** the theme's files — so I could not safely
> auto-edit it without risking overwriting its config blind. Below is the exact, safe recipe to
> apply the brand yourself in a few minutes. It maps 1:1 to the site I built.

Work on **Impact** while it stays unpublished, then hit **Publish** when you're happy. Your live
Horizon store is never touched.

---

## 1) Colours — Theme settings → Colors (color schemes)

Impact uses **color schemes**. Set these up (create as many schemes as you have sections):

| Scheme | Background | Text | Button bg | Button text |
|---|---|---|---|---|
| **Scheme 1 — Navy (primary)** | `#141937` | `#F9F3E7` | `#FBF49B` | `#141937` |
| **Scheme 2 — Cream (light)** | `#F9F3E7` | `#141937` | `#141937` | `#F9F3E7` |
| **Scheme 3 — Green (fresh)** | `#213E3C` | `#F9F3E7` | `#FBF49B` | `#141937` |
| **Scheme 4 — Black (premium)** | `#000000` | `#F9F3E7` | `#FBF49B` | `#141937` |
| **Scheme 5 — Grey (clean)** | `#F4F4F4` | `#141937` | `#141937` | `#FFFFFF` |

Then, for the **flow** effect, assign schemes section-by-section down the homepage so the
background changes as visitors scroll (e.g. Navy hero → Cream → Black → Navy → Green → Cream).

Accent / links colour: blue `#1E6BE6`.

---

## 2) Typography — Theme settings → Typography

Your brand fonts (confirmed from the embedded fonts in `BetterTap_Logo.pdf`) are:
- **Aeonik** — display / headlines
- **Neue Haas Grotesk** — body / UI

Both are commercial licenses. Two options:

**A. Use the licensed fonts (best — exact brand match):**
If you have the Aeonik + Neue Haas web licenses, upload the `.woff2` files to the theme
(`assets/`) and add `@font-face` in `layout/theme.liquid` before `</head>`, then set the
Custom CSS below. (The standalone site already has matching `@font-face` hooks in
`assets/css/style.css` — drop the files into `assets/fonts/` and they activate.)

**B. Closest FREE matches (no license needed):**
- Headings → **General Sans** (Fontshare) — closest free match to Aeonik
- Body → **Inter** — closest free match to Neue Haas Grotesk

Add before `</head>` in `layout/theme.liquid`:
```html
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```
Then add the Custom CSS below.

> The full standalone site in this folder (Home, Why BetterTap, Shop, About, Contact) is your
> visual reference — match Impact's sections to those layouts.

---

## 3) Custom CSS — paste-ready

Add this in **Theme settings → Custom CSS** (Impact has this field), or at the bottom of
`assets/theme.css` / a custom asset. It enforces the brand fonts, the loud type scale, the
yellow accent, and pill buttons:

```css
:root{
  --bt-navy:#141937; --bt-green:#213E3C; --bt-cream:#F9F3E7;
  --bt-grey:#F4F4F4; --bt-yellow:#FBF49B; --bt-blue:#1E6BE6;
}
/* Brand fonts (only if you added the Fontshare link in theme.liquid) */
h1,h2,h3,.h0,.h1,.h2{ font-family:'Clash Display',sans-serif !important; letter-spacing:-.02em; line-height:.98; }
body{ font-family:'Satoshi',sans-serif; }

/* LOUD headline scale */
h1,.h0{ font-size:clamp(3rem,8vw,8rem) !important; font-weight:600 !important; }

/* Yellow accent buttons, pill shaped */
.button,.btn,button.button{
  background:var(--bt-yellow) !important; color:var(--bt-navy) !important;
  border-radius:100px !important; font-weight:700 !important; letter-spacing:.01em;
}
.button:hover{ filter:brightness(1.04); transform:translateY(-2px); transition:.3s; }

/* Selection + links on brand */
::selection{ background:var(--bt-yellow); color:var(--bt-navy); }
a{ text-underline-offset:3px; }
```

---

## 4) Logo & favicon

- Header logo: upload **`assets/img/bmark-white.png`** (works on the navy header) — or the
  full "Bettertap" wordmark from `BetterTap_Logo.pdf`.
- Favicon (Theme settings → Favicon): **`assets/img/bmark-blue.png`**.

---

## 5) Homepage section order (to feel award-winning)

Rebuild the homepage in the Impact editor in this order — it mirrors the site I built:

1. **Hero** (Scheme Navy) — big headline "Better water, on tap.", two buttons.
2. **Marquee / scrolling text** (Scheme Cream) — "No bottles · No bulky systems · Just better tap water".
3. **Rich text / belief** (Scheme Black) — "We believe better water should be the obvious choice."
4. **MAZE filtration** — 3 steps (removes lead/microplastics/hormones, keeps minerals, tracks itself).
5. **Feature grid** (Scheme Cream) — hot/cold on demand, boil from phone, filter tracks itself, NSF-certified.
6. **Comparison** (Scheme Green) — replaces pitcher + cooler + bottled water.
7. **Testimonial** (Scheme Cream) — "She pours her own water now…".
8. **Email capture CTA** (Scheme Navy) — "Cleaner. Faster. Better."
9. **Footer** (Scheme Black).

---

### Logo & colour rules from your guide (don't break these)
- Don't rotate, stretch, recolour, add gradient/stroke/dropshadow to the mark.
- Don't introduce colours outside the brand palette above.

Once it looks right on the unpublished Impact theme → **Publish**.
