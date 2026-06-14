# Hosting Better Tap on GitHub Pages

The site is static and uses **relative paths**, so it works on GitHub Pages as-is
(including from a project subpath like `username.github.io/bettertap/`).
A `.nojekyll` file is included so GitHub serves the `assets/` and `crm/` folders untouched.

## Option A — I push it for you (fastest)
Authenticate the GitHub CLI once, then tell me "push to github":
```bash
gh auth login        # choose GitHub.com → HTTPS → login with browser
```
Then I will:
```bash
gh repo create bettertap --public --source . --remote origin --push
gh api -X POST repos/:owner/bettertap/pages -f source.branch=production -f source.path=/
```
…and hand you the live URL: `https://<your-username>.github.io/bettertap/`

## Option B — you do it in the GitHub UI
1. Create a new repo (e.g. `bettertap`) on github.com.
2. Push this folder:
   ```bash
   git remote add origin https://github.com/<you>/bettertap.git
   git push -u origin production
   ```
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: **production** / **/(root)** → Save.
4. Wait ~1 min → your site is live at `https://<you>.github.io/bettertap/`.

## 3-stage workflow on GitHub
- **local** → http://localhost:4321 (your machine)
- **staging** → push the `staging` branch; deploy a second Pages site or use a
  `bettertap-staging` repo (or a Pages preview from the `staging` branch).
- **production** → the `production` branch is what GitHub Pages serves publicly.

Promote: `git checkout production && git merge staging && git push`.

## ⚠️ Important: the CRM is publicly reachable
The admin console lives at `/crm/` and there's an **"Admin login"** button at the
bottom-right of every page. Its login + 2FA are a **front-end demo** (no real security),
so on a public site anyone could open it. Before going live, either:
- **Remove it from the public deploy** (delete the `crm/` folder + the FAB), or
- Keep it private (host the CRM separately / behind real auth).
Tell me which and I'll set it up.
