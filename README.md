# Bayansell

An Airbnb-style marketplace where people can **post their items** and **browse listings** from others across the Philippines. Buy and sell preloved and brand-new finds.

**Live:** https://bayansell.vercel.app

## Features

- Browse listings in a responsive grid, with image galleries
- Live search (title, description, location) + Airbnb-style **category icon row**
- **Newport City, Pasay area filters** — mobile-friendly location pills for the local audience
- Sort by newest / price (low→high, high→low)
- Item detail pages with specs, seller info, and gallery
- **Post an item** — full form with **direct photo upload** (client-side compression + instant preview, stored in Supabase Storage)
- **Favorites / wishlist** with a saved-items page
- **Email/password auth** (Supabase) with buyer/seller roles and a seller dashboard
- **Contact seller** → real inquiries + in-app messaging
- **Email alerts** — sellers get notified when a buyer sends an inquiry
- Footer content pages (How it works, Safety, Help, About, Careers, Contact)

## Tech

Static **vanilla JS frontend** (no build step / framework) backed by **Supabase** (Postgres + Auth + Storage + an Edge Function).

```
index.html                              # app shell; ?v= query strings cache-bust JS/CSS
css/styles.css                          # design system (Airbnb-style, blue --rausch theme)
js/supabase.js                          # Supabase client init
js/data.js                              # seed listings, categories, Newport locations
js/store.js                             # data layer (listings, favorites, auth, messaging, uploads)
js/app.js                               # router, views, search/filter, modals, post form
supabase/functions/notify-message/      # Edge Function: emails a seller on new inquiry
```

Database: `profiles`, `listings`, `favorites`, `inquiries`, `messages` (all RLS-protected);
a `listing-images` Storage bucket; a trigger on `messages` that calls the `notify-message`
Edge Function via `pg_net`.

> **Cache-busting:** browsers cache `js/*.js` and `css/styles.css`. When you change one,
> bump its `?v=N` query string in `index.html` so visitors get the new version after a deploy.

## Email notifications setup

The new-message email pipeline (trigger → `pg_net` → Edge Function) is deployed and working,
but actually sending email needs an email provider. It uses [Resend](https://resend.com):

1. Create a Resend account and an API key.
2. Set it as a function secret:
   `supabase secrets set RESEND_API_KEY=re_xxx` (or in the Supabase dashboard → Edge Functions → Secrets).
3. To email real users (not just your own address), verify a sending domain in Resend and set
   `NOTIFY_FROM="Bayansell <alerts@yourdomain.com>"`.

Until `RESEND_API_KEY` is set, the function safely no-ops and logs who it *would* have emailed.

## Run locally

No installs needed — serve the folder with any static server:

```bash
python3 -m http.server 5173
# then open http://localhost:5173
```

## Deploy

Hosted on **Vercel** as a static site (no build). Pushing to the connected GitHub repo's default
branch triggers an automatic production deploy. The Supabase backend is managed separately
(migrations + the `notify-message` Edge Function).
