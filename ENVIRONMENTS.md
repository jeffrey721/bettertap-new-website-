# Better Tap — 3-Stage Environments

Three stages, the standard professional workflow:

| Stage | Purpose | Link |
|---|---|---|
| **Local** | Your machine — build & preview instantly | **http://localhost:4321** (site) · **http://localhost:4321/crm/** (CRM) |
| **Staging** | Private cloud copy to review before going live | `https://bettertap-staging.vercel.app` *(after 1-time login — see below)* |
| **Production** | The live public site | `https://bettertap.vercel.app` *(after 1-time login — see below)* |

Git branches mirror the stages: `local` → `staging` → `production`. You promote work up the chain.

---

## 1) Local (live now)

A zero-dependency Node server is already running and serving the `local` branch:

```
http://localhost:4321        → the website
http://localhost:4321/crm/   → the operations console (CRM)
```

To start it again later (if you reboot):
```bash
cd "BETTER TAP WEBSITE"
node server.js 4321 .
```

---

## 2) Staging + 3) Production (one-time setup, then automatic)

These are real public URLs hosted on **Vercel** (free). I prepared everything
(`vercel.json`, git branches); they just need your account connected once.

**Step 1 — log in (10 seconds, in your browser):**
```bash
cd "BETTER TAP WEBSITE"
vercel login
```
(Opens a browser device-code page — approve it.)

**Step 2 — deploy production (the live site):**
```bash
git checkout production && git merge local
vercel --prod
```
→ gives you `https://<project>.vercel.app` (you can attach `drinkbettertap.com` later).

**Step 3 — deploy staging (preview):**
```bash
git checkout staging && git merge local
vercel
```
→ gives you a unique `https://<project>-<hash>.vercel.app` preview URL.

> Tell me once you've run `vercel login` and I'll do the rest and hand you the two real links.
> (GitHub Pages or Cloudflare Pages also work — say the word and I'll wire whichever you prefer.)

---

## Promotion workflow (how work flows through stages)

```
edit on  local      →  test at localhost:4321
   │  git checkout staging && git merge local && vercel        (review on staging URL)
   ▼
 approve →  git checkout production && git merge staging && vercel --prod   (goes live)
```

## Autosave
A background job commits your work to git every 10 minutes (only when something changed),
so progress is never lost. History: `git log --oneline`.
