# SavinYa – Buy smarter. Save more.

A shopping decision tool: search a product, see whether the price is actually good, and get a transparent BUY NOW / WAIT / TARGET REACHED / GOOD DEAL / DON'T BUY / NOT ENOUGH DATA verdict with reasons.

**Status: MVP running on SIMULATED demo data.** No prices are live. The UI labels demo data everywhere.

## Run locally
Static site, no build step, no dependencies. ES modules need http (not `file://`):

    python3 -m http.server 8080     # then open http://localhost:8080

## Deploy to GitHub Pages
Push the contents of this folder to a repo, then Settings → Pages → deploy from branch (root). All paths are relative and routing uses `#/` hashes, so it works under `/<repo>/`.

## Structure
- `js/engine.js` – pure logic: deal assessment, total cost, seasonal patterns, calendar, insights
- `js/service.js` – merges all providers, reports failures
- `js/providers/provider.js` – `ProductDataProvider` contract + normalised data shapes
- `js/providers/demoProvider.js` – simulated data (delete when real data is connected)
- `js/providers/index.js` – **register new providers here**
- `js/store.js` – wishlist in `localStorage` (per device)
- `js/app.js`, `css/styles.css` – UI

## Adding real data (Phase 2)
1. Create `js/providers/<name>Provider.js` extending `ProductDataProvider`; return normalised Offers/Observations. Return `[]` for anything the source can't supply.
2. Call your own backend proxy from it. **Never put API keys in this repo or the browser.** Keep keys in server environment variables.
3. Add it to `providers/index.js`, remove `demoProvider`.

Only use sources with permission: official retailer APIs, affiliate/product feeds, licensed shopping-search APIs. Vinted/second-hand: no general public search API is assumed; plug in an authorised partner feed through `getSecondHand()` if one is available.

## Needs a backend (not possible in browser-only code)
Real price history (a scheduled job must record observations), alerts while the browser is closed (scheduled checks + email/push), account sync, and any API requiring secret keys. Today, target alerts are evaluated only when the app is opened.
