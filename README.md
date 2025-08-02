# **UAP Manila Corinthian Chapter (MCC) Website**

Managed by the **UAP Manila Corinthian Chapter** as the official member portal.

---

## 🧭 Overview

This static/Jekyll-powered site (hosted on **GitHub Pages**) integrates with **Supabase JavaScript SDK v2** to provide a secure, dynamic member system:

- Members can **log in securely**.
- After login, they see a **personalized dashboard**—membership status, company, position, and payment history (multi‑year support).
- **Sensitive fields (e.g. PRC license, email, phone)** are masked by default, with one-click visibility toggles.
- **Print/save** buttons for membership card or record.
- Fully **responsive UI**, built with **Bootstrap 5** + **FontAwesome 6** icons.
- Custom domain: **uapmnlcorinthian.com**, with HTTPS automatically issued by GitHub Pages.

---

## 🚀 Features

| Category             | Functionality                                                       |
|----------------------|---------------------------------------------------------------------|
| Authentication       | Email/password login using Supabase Auth with secure password handling and row-level security |
| Member Dashboard     | Displays dynamic member data with toggles, print/save, and real-time filtering |
| Payment History      | Year-based columns auto-generated based on available data |
| Security & Privacy   | Defaults to masking sensitive data; session stored in `sessionStorage` only |
| Design & Accessibility | Built with Bootstrap 5 and FontAwesome for accessible UI |
| Deployment           | Jekyll‑based static site on GitHub Pages, using a **CNAME file** and GitHub DNS configuration |

---

## 💻 Tech Stack

- **Jekyll** — Organizes layouts, includes, and pages (Home, Login, Dashboard, etc.)
- **Bootstrap 5** — Responsive layout and standardized components
- **FontAwesome 6** — Icons for actions (toggle, print, logout)
- **Vanilla JavaScript** (`js/common.js`) — Handles login flow, UI toggles, session logic, data rendering
- **Supabase JavaScript SDK v2** — Auth and database operations (CRUD, dashboard HTML injection, payment lookup)

---

## 📂 Project Structure

```
/
├── CNAME                   # Contains your custom domain (e.g. uapmnlcorinthian.com)
├── _config.yml             # Jekyll site config
├── _includes/              # Common page bits (navbar, footer, payment table)
├── _layouts/               # Layout templates (default, dashboard)
├── pages/                  # Markdown/pages: index.md, login.md, account.md
├── js/
│   └── common.js           # Login/API/session/render logic
├── css/
│   └── overrides.css       # Custom style overrides for Bootstrap
└── README.md               # (you’re editing this now)
```

---

## 🏁 Getting Started (Locally)

1. **Clone** the repository:
   ```sh
   git clone git@github.com:ManilaCorinthianChapter/mcc.git
   cd mcc
   ```
2. **Ensure Jekyll is installed** locally (Ruby, Bundler, Bundled gems, etc.)
3. **Configure Supabase credentials**:
   - Open `js/common.js` and update:
     ```js
     const SUPA_PROJECT_URL = "https://xyz.supabase.co";
     const SUPA_ANON_KEY = "public‑anon‑key";
     ```
   - Store these securely; never push your project key.
4. **Run Jekyll locally**:
   ```sh
   bundle install
   bundle exec jekyll serve --host=0.0.0.0
   ```
   View at `http://localhost:4000/` (login dashboard requires Supabase connection).

---

## 🧰 Supabase Backend Setup

1. **Create a Supabase project** (free tier is sufficient).
2. **Enable Email/Password Auth** in Auth settings; confirm email if desired.
3. **Define your schema**:
   ```sql
   CREATE TABLE members (
     id            uuid PRIMARY KEY REFERENCES auth.users(id),
     prc_license   text,
     batch_year    int,
     company       text,
     position      text,
     contact_email text,
     contact_phone text
   );

   CREATE TABLE payments (
     id            serial PRIMARY KEY,
     member_id     uuid REFERENCES members(id),
     year          int,
     month         int,
     amount        numeric,
     paid_at       timestamp
   );
   ```
4. Apply `Row-Level Security`:
   ```sql
   ALTER TABLE members ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "self‑only" ON members
     FOR SELECT TO authenticated
     USING ( auth.uid() = id );

   -- Similar policy for payments table
   ```

---

## 🌍 Deployment & Custom Domain

- **Ensure _CNAME file is set** with your real domain (`uapmnlcorinthian.com` or prefixed with `www`).
- On GitHub:
  1. Go to **Settings → Pages**.
  2. Under *Custom domain*, set it to your domain.
  3. Enable **Enforce HTTPS** once certificate is issued.
- **DNS setup**:
  - If using **apex domain**:
    - A records → IPs 185.199.108.153, 109.153, 110.153, 111.153 (GitHub Pages servers)
  - If using **www subdomain**:
    - CNAME → `username.github.io.`
- DNS changes take effect in minutes to hours.

---

## 🔐 Security Best Practices

- Credentials (`SUPA_ANON_KEY`) should never be checked in; consider using environment variables (e.g. `.env.local` during build).
- **Session storage** is isolated per browser tab; no SS with sensitive values in localStorage.
- Supabase’s **RLS+JWT** combined with the email/password auth protects user data.
- Validate any frontend input via Supabase backend using Postgres constraints or triggers.

---

## 👥 Contribution (Internal)

- This repository and portal are **proprietary**, limited to UAP‑MCC internal use.
- To contribute:
  - Contact the site owner, **UAP MCC** (`uapmccmembership@gmail.com`).
  - Pull requests or pushes should only come via authenticated contributors.
- Please keep UI changes minimal and test locally before pushing.

---

## 📞 Contact & Support

- **Author / Maintainer**: ArZ Miranda  
- **Support email**: `uapmccmembership@gmail.com`  
- Official site: [https://uapmnlcorinthian.com](https://uapmnlcorinthian.com)

---

## ⚖️ License

This project is **proprietary**; usage is restricted to UAP‑MCC only.

---

## 📌 Quick Summary

- ✅ No need to unpublish your GitHub Pages site—just point your custom domain to it.
- ✅ Ensure the `CNAME` file and DNS A/CNAME records match your domain.
- ✅ Once DNS propagates, GitHub automatically provisions **HTTPS**.
- ✅ Ongoing site updates (Jekyll + JS code) deploy instantly via **commits to `main` branch**.
