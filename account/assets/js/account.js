/* Better Tap — customer auth has MOVED to Shopify hosted customer accounts.
   A static site cannot do real, secure password auth, so the previous
   localStorage "login" demo was insecure and has been DISABLED. Real login,
   orders, addresses and profile now live on Shopify:
     https://dqz0fm-jv.myshopify.com/account
   The account/ pages are redirects to Shopify. This file is intentionally a no-op
   and no longer authenticates anything. */
(function () {
  'use strict';
  // Safety net: if ever loaded on a leftover /account/ page, go to the real login.
  try {
    if (location.pathname.indexOf('/account/') !== -1) {
      location.replace('https://dqz0fm-jv.myshopify.com/account');
    }
  } catch (e) {}
})();
