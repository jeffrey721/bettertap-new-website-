# Better Tap Admin CRM — Supabase setup (one-time, ~10 min)

Real, secure login. Each person signs in; their **role** decides what they see. Only the
CEO (`jeffrey@drinkbettertap.com`) can assign roles. Security is enforced by Supabase
server-side (Row-Level Security) — not by the browser — so it's genuinely safe.

## 1. Create the project
1. Go to **https://supabase.com** → sign up (free) → **New project**.
2. Name it `bettertap-crm`, pick a region near you, set a strong database password (save it).
3. Wait ~2 min for it to provision.

## 2. Run the database setup
1. In the project: **SQL Editor → New query**.
2. Paste the whole contents of **`crm/supabase-schema.sql`** → **Run**.
   - This creates the roles, the `profiles` table, the `jobs` table, and all the security rules.

## 3. Turn on email login
1. **Authentication → Providers → Email**: make sure **Email** is enabled.
2. For the simplest start, **Authentication → Providers → Email → turn OFF "Confirm email"**
   (so the team can sign in immediately). You can turn it back on later.

## 4. Send me two values (safe to share — the anon key is public by design)
From **Project Settings → API**:
- **Project URL** — e.g. `https://abcdxyz.supabase.co`
- **anon public** key — the long `eyJ...` string labelled **anon / public**

> ⚠️ Do **NOT** send the **service_role** key — that one is secret. Only the **anon/public** key.

Paste those two to me and I'll wire the login + role dashboards and we go live.

## 5. After it's wired — create the team & assign roles
- Each person opens the CRM and **signs up** with their work email + a password
  (Jeffrey signs up with `jeffrey@drinkbettertap.com` → he's automatically the CEO).
- Jeffrey opens **Team** in the CRM and sets each person's role:
  - Doni Baratz → **Operations**
  - Ruchama → **Customer Service / Sales**
  - Morry, Ari → **Installations & Repairs**

(Or set them in SQL directly — see the bottom of `supabase-schema.sql`.)
