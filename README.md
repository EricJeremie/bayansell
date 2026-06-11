# Bayansell

An Airbnb-style marketplace where people can **post their items** and **browse listings** from others across the Philippines. Buy and sell preloved and brand-new finds.

**Live:** https://bayansell.vercel.app

## Features

- Browse listings in a responsive grid, with image galleries
- Live search (title, description, location) + Airbnb-style **category icon row**
- Sort by newest / price (low→high, high→low)
- Item detail pages with specs, seller info, and gallery
- **Post an item** — full form with drag-and-drop image upload
- **Favorites / wishlist** with a saved-items page
- **Mock login** with an account menu, **My Listings** page, and delete
- **Contact seller** modal
- Everything persists in the browser via `localStorage`

## Tech

Pure **static frontend** — hand-written HTML, CSS, and vanilla JavaScript. No build step, no framework, no backend. Listings and favorites are stored client-side in `localStorage`.

```
index.html        # app shell (sticky header + footer)
css/styles.css    # design system (Airbnb-style, blue theme)
js/data.js        # seed listings + categories
js/store.js       # localStorage layer (listings, favorites, user session)
js/app.js         # router, views, search/filter, modals, post form
```

## Run locally

No installs needed — serve the folder with any static server:

```bash
python3 -m http.server 5173
# then open http://localhost:5173
```

## Deploy

Hosted on **Vercel** as a static site (no build). Pushing to the connected GitHub repo's default branch triggers an automatic production deploy.
