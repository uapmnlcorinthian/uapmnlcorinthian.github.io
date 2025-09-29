# UAP Manila Corinthian Chapter (MCC) Website

Static site (Jekyll on **GitHub Pages**) with dynamic data via **Supabase** and a lightweight in‑browser **Admin CMS** that edits `_data/*.yml` through the GitHub API—no separate server required.

> This README is public. It deliberately avoids secrets and operational credentials.

---

## 🧭 Overview

- **Frontend**: Jekyll (GitHub Pages) + Bootstrap 5 + Font Awesome.
- **Dynamic data**: Supabase (Auth + Postgres with RLS) for member login, profile, and payments.
- **Admin CMS**: `/admin/` page lets authorized editors update `_data/*.yml` files. Save → commits to the repo → GitHub Pages redeploys automatically.
- **Assets**: Served from object storage/CDN (e.g., Cloudflare R2) via public URLs.
- **Custom domain & HTTPS** via GitHub Pages + DNS.

---

## 🚀 Features

| Category               | Details                                                                                                   |
|------------------------|------------------------------------------------------------------------------------------------------------|
| Authentication         | Supabase Auth (email/password). RLS policies protect user rows.                                           |
| Member Dashboard       | Profile, status, company, position, payments (multi-year). Sensitive fields masked by default.            |
| Payments UI            | Year-based columns auto-generated from available data.                                                     |
| Admin CMS (no server)  | Left: YAML files/entries; Right: editor form; **Save** commits to `_data` via GitHub API.                 |
| Security               | JWT + RLS; short-lived client sessions. CMS token stored in `sessionStorage` only.                         |
| Deployment             | Jekyll → GitHub Pages; custom domain w/ HTTPS; cache busting for key JS/CSS.                               |

---

## 🧱 Architecture (High Level)

- **Jekyll** renders pages from layouts/includes and pulls content from `_data/*.yml`.
- **Admin CMS** (client-side app) reads/writes YAML via GitHub Contents API using a fine-grained personal access token (PAT).
- **Supabase** provides Auth + DB. Frontend uses the **public anon key** only; access is limited by **Row Level Security (RLS)**.
- **Assets** hosted on object storage (e.g., Cloudflare R2); referenced via absolute URLs.

---

## 💻 Tech Stack

- Jekyll (GitHub Pages)
- Bootstrap 5, Font Awesome
- Vanilla JavaScript (+ small CMS app)
- Supabase JS SDK v2
- YAML parsing via `js-yaml`

---

## 📂 Project Structure (representative)

```
/
├── CNAME                      # Custom domain (e.g., uapmnlcorinthian.com)
├── _config.yml                # Jekyll config
├── _includes/                 # Partials (nav, footer, tables…)
├── _layouts/                  # Layouts (default, dashboard…)
├── _data/                     # YAML data sources edited by CMS
│   ├── members.yml
│   ├── events.yml
│   └── _schemas.yml          # (optional) form hints for CMS fields
├── admin/                     # Admin CMS (in-browser)
│   ├── index.html
│   ├── admin.js
│   └── admin.css
├── assets/                    # Site CSS/JS/images
│   ├── css/
│   ├── js/
│   └── img/
└── README.md
```
> The CMS edits **only** `_data/*.yml`. App logic/templates live in source files—use PRs for code changes.

---

## 🔑 Configuration & Secrets

**Never commit secrets** (service keys, personal tokens, API keys).  
Frontend uses **public** Supabase anon key only; rely on **RLS** for data protection.

Example public runtime config pattern:

```js
// js/config.js (example)
window.RUNTIME = {
  SUPABASE_URL:  "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON: "YOUR_PUBLIC_ANON_KEY"
};
```

**Admin CMS token (for editors)**

- Generate a **GitHub Fine‑grained PAT** with **Contents: Read/Write** for this repo only.
- Paste it into the Admin CMS when prompted.
- It is stored in **sessionStorage** (tab-scoped) and cleared when the tab closes.

---

## 🧑‍💼 Admin CMS — How to Use (Editors)

**Location**: `/admin/`

### Quick Start
1. Open the Admin page and sign in with your **GitHub fine‑grained token** (repo access required).
2. In the **left sidebar**, choose a `_data/*.yml` file. Use **Search** to find entries.
3. Click an item to open it in the **right editor**. Edit fields (text, dates, lists, toggles).
4. Click **💾 Save**. The CMS commits to the repo. GitHub Pages redeploys automatically.
5. Visit the site and **hard refresh** (Ctrl/Cmd+Shift+R) if you don’t see changes.

### Editor Basics
- **List files** (arrays): left shows items; right edits one item at a time. Use **Add**, **Duplicate**, **Delete**, **Move Up/Down**.
- **Map files** (key → value): right side shows a simple table. Use **Add Row** to insert keys.
- **Display key** (when shown) controls the item label in the sidebar.
- **Reload** pulls the latest from GitHub; **Export** downloads YAML for backup/review.

---

## 🧰 Supabase (Backend)

> Keep schema names/tables aligned with your production database. Do not include credentials in this repo.

- **Auth**: enable Email/Password in the Supabase dashboard.
- **Tables**: members, payments (or your current naming). Use Supabase Table Editor for simple edits, SQL editor for migrations.
- **RLS**: enable Row Level Security and add policies, for example: users can read their own rows.

Example policy sketch:
```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_read_own" ON members
  FOR SELECT TO authenticated USING (auth.uid() = id);
```

---

## 🖼️ Assets (Cloudflare R2 or equivalent)

- Store public images/files in an object storage bucket (e.g., `assets/`).
- Reference files by their public URLs in Markdown/HTML templates.
- If a proxy worker or CDN listing exists, you can browse public files there for copy‑paste URLs.
- When replacing files with the same name, consider cache busting (e.g., versioned filenames).

---

## 🌍 Deployment & Domain

- Deploys from the default branch via **GitHub Pages**.
- **Custom Domain**: ensure a `CNAME` file exists with `uapmnlcorinthian.com` (or your domain).
- **DNS**:
  - Apex → GitHub Pages A/AAAA records (per GitHub docs).
  - `www` → CNAME to `username.github.io`.
- Enable **Enforce HTTPS** in repo **Settings → Pages** once the certificate is issued.

---

## 🧪 Local Development

1. **Clone** the repository:
   ```bash
   git clone https://github.com/ManilaCorinthianChapter/mcc.git
   cd mcc
   ```
2. **Jekyll**: Install Ruby, Bundler, and gems:
   ```bash
   bundle install
   ```
3. (Optional) Add `js/config.js` with your **public** Supabase settings (see snippet above).
4. **Run**:
   ```bash
   bundle exec jekyll serve --host=0.0.0.0
   ```
   Visit `http://localhost:4000/`. Features that need Supabase will require a reachable project URL + anon key.

---

## 🩺 Troubleshooting (Common)

- **CMS Save fails (401/403)**: Token doesn’t have repo **Contents: Read/Write** or has expired → create a new fine‑grained PAT and retry.
- **Change not visible**: Check GitHub Pages build/Actions logs; hard refresh; ensure you edited the correct YAML file.
- **Broken YAML**: Validate syntax (quotes, indentation). Use **Export** before large edits. Revert with Git history if needed.
- **Assets 404**: Confirm the exact path/filename and case sensitivity. Purge CDN cache if necessary.
- **Supabase write/read fails**: Check RLS policies and the user’s auth session. Verify table/column names did not change.

---

## 👥 Contributing

This is an internal project. Open issues/PRs are welcome **from authorized org members**. For others, please open an issue first to discuss changes.

---

## 📄 License

Proprietary. All rights reserved by **UAP Manila Corinthian Chapter**.

---

## ✅ Quick Checklist

- `CNAME` present and DNS records point to GitHub Pages.
- No secrets committed.
- CMS edits limited to `_data/*.yml`.
- Supabase RLS enabled and tested.
- Assets referenced by public URLs (use cache busting on replacements).
- Cache‑bust critical JS/CSS when deploying breaking UI updates.
