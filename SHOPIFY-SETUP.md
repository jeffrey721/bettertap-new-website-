# Better Tap — Shopify checkout setup

The website is wired to your live Shopify store (**Better Tap**, `dqz0fm-jv.myshopify.com` /
`drinkbettertap.com`). The buy buttons use a real cart + Shopify-hosted checkout via
`assets/js/shopify-cart.js`.

**Status:** everything is connected and configured **except one credential** — a Storefront
API access token. Until it's pasted, the site safely falls back to the demo cart (no error,
nothing breaks). Once pasted, real cart + real checkout + real orders go live.

---

## The one remaining step — create & paste the Storefront token (~2 min)

A Storefront API token is **publishable** (read-only storefront access). It is *safe to ship
in page JavaScript* — that's exactly what it's designed for.

1. Shopify admin → **Settings → Apps and sales channels → Develop apps**.
2. Click **Create an app** → name it `BetterTap Website` → **Create app**.
3. Open the app → **Configuration** → **Storefront API** → **Configure** and enable at least:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
   - Save.
4. Go to **API credentials** → **Install app** → copy the **Storefront API access token**
   (a long string, *not* the Admin API token).
5. Open **`assets/js/shopify-cart.js`** and paste it on line ~19:
   ```js
   token: 'PASTE_THE_TOKEN_HERE'
   ```
6. Save, commit, and deploy. Done — the buy buttons now open a real cart and Shopify checkout.

---

## What's already done

- **Store side (live):** 6 products published to the Online Store — Better Tap Water Bar
  (White/Black), MAZE Filter Subscription, 1-Year Bundle, MAZE Water Filter, UV Lamp,
  Filter + UV Bundle.
- **Inventory:** the machine tracks real stock (**White 200 / Black 100**, "deny" policy) so it
  **auto-decrements on each sale**. Consumables are set to continue-selling.
- **Variant IDs:** confirmed and mapped in `shopify-cart.js` (`PRODUCTS`).
- **Buttons wired:** `[data-buy-now]` (Buy now) and `[data-add-cart][data-bt-variant=…]`
  (machine by colour swatch, plus filter / uv / bundle-fu) are auto-bound by `shopify-cart.js`.
- **Script included** on `shop.html`.

## ⚠️ Currency

Your store currency is **ILS (₪)** while the website shows **USD ($)**. Shopify checkout will
charge in ILS unless you either (a) switch the site copy to ILS, or (b) set up **Shopify Markets**
to present USD to US shoppers. Decide this before taking real orders.
