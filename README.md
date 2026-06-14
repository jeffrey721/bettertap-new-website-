# Better Tap — Award-Winning Landing Site (2026)

A loud, motion-rich brand site built directly from the **BetterTap Brand Guide (YJC Trade LLC / Splash Creative)**.
Hand-built HTML/CSS/JS — no build step, no dependencies to install. Just open it.

---

## How to view it

Double-click **`index.html`** (it opens in your browser).
For the smoothest experience use Chrome or Edge with an internet connection (the fonts and
scroll-motion libraries load from a CDN). Everything still works offline — it just falls back
to simpler motion.

---

## What's inside

```
BETTER TAP WEBSITE/
├── index.html              ← the page (all copy + structure)
├── README.md               ← this file
├── IMPACT-THEME-BRANDING.md← how to push this brand into your Shopify "Impact" theme
└── assets/
    ├── css/style.css       ← the full brand design system (colours, type, layout, motion)
    ├── js/main.js          ← smooth scroll, scroll reveals, cursor, magnetics, count-ups
    └── img/                ← your B-mark logos (white / blue / black)
```

## The brand system (encoded exactly from your guide)

| Token | Hex | Meaning |
|---|---|---|
| Deep Navy | `#141937` | Trust — primary |
| Green | `#213E3C` | Freshness |
| Cream | `#F9F3E7` | Warmth |
| Light Grey | `#F4F4F4` | Clean |
| Black | `#000000` | Premium |
| Blue (logo) | `#1E6BE6 → #3E8BFF` | The water-flow accent in the mark |
| Electric Yellow | `#FBF49B` | "Loud" accent (from your Colors-In-Use page) |

**Type:** Clash Display (loud headlines) + Satoshi (clean grotesque body) — the closest
premium match to the neo-grotesque feel of your guide, pushed large for impact.

**Voice in the copy:** Confident · Direct · Warm · Grounded — pulled straight from your
Brand Personality page (MAZE filtration, NSF-certified, hot/cold on demand, boil from your
phone, the filter tracks itself, replaces pitcher + cooler + bottled-water habit).

## The "loud + flow" moves

- **Flow:** buttery smooth scroll (Lenis), section-to-section background **colour morphing**
  (navy → cream → black → navy → green…), a **pinned** MAZE-filtration sequence, parallax orbs,
  word-by-word headline reveals, and a running marquee.
- **Loud:** oversized Clash Display headlines, the electric-yellow accent, a giant `BETTERTAP`
  footer wordmark, magnetic buttons, a blend-mode custom cursor, and count-up stats.
- **Resilient:** if the CDN is ever blocked, content still appears (graceful fallbacks); respects
  `prefers-reduced-motion`.

## Easy things to change

- **Copy:** edit the text in `index.html`.
- **Colours/spacing/type sizes:** the `:root` block at the top of `assets/css/style.css`.
- **Add product photography:** drop images into `assets/img/` and place them in the feature
  cards or the filtration visual.

---

Built for **drinkbettertap.com** · © 2026 YJC Trade LLC.
