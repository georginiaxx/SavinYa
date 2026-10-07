import { search, loadProduct, isDemo } from './service.js';
import { store } from './store.js';
import { money, offerTotal, bestOffer, ago, calendar, insights, STATUS, dailySeries, assess } from './engine.js';

const $ = (s) => document.querySelector(s), main = $('#main');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BADGE = { [STATUS.BUY]: 'b-buy', [STATUS.TARGET]: 'b-target', [STATUS.GOOD]: 'b-good', [STATUS.WAIT]: 'b-wait', [STATUS.NO]: 'b-no', [STATUS.DATA]: 'b-data' };
const badge = (s) => `<span class="badge ${BADGE[s]}">${esc(s)}</span>`;
const STOCK = { in_stock: 'In stock', low_stock: 'Low stock', out_of_stock: 'Out of stock', unknown: 'Availability unknown' };
const KIND = { exact: 'Exact match', alternative: 'Alternative', lookalike: 'Lookalike', dupe: 'Dupe' };
const demoTag = (x) => x?.isDemo ? '<span class="tag demo">Demo data</span>' : '';
const shipTxt = (o) => o.shippingCost == null ? 'Shipping calculated at checkout' : o.shippingCost === 0 ? 'Free shipping' : `+ ${money(o.shippingCost)} shipping`;
const totalTxt = (o) => { const t = offerTotal(o); return t.exact ? `${money(t.amount)} total` : `${money(t.amount)} · shipping not included, final total may differ`; };
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); }
const loading = () => (main.innerHTML = '<p class="empty" role="status">Loading prices…</p>');
const errorView = (m) => `<div class="card empty" role="alert"><h2>Something went wrong</h2><p>${esc(m)}</p><a class="btn" href="#/">Back to home</a></div>`;

function updateChrome(route) {
  const n = store.all().length, c = $('#wl-count'); c.hidden = !n; c.textContent = n;
  document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === route ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  $('#demo-bar').textContent = isDemo() ? 'Demo mode: products, prices and histories are simulated and not live.' : '';
}

function card(r) {
  const b = r.assessment.best, p = r.product, cheapUsed = r.used.length ? Math.min(...r.used.map((u) => u.price)) : null;
  return `<article class="card"><a class="pc" href="#/product/${esc(p.id)}"><img src="${p.image}" alt="" width="84" height="84"><div><div class="t">${esc(p.title)}</div><div class="mute">${esc(p.brand)} · ${esc(p.category)}</div>
  ${b ? `<div class="price">${money(b.price)}</div><div class="mute">${esc(b.retailer)} · ${STOCK[b.availability]} · ${shipTxt(b)}</div>` : '<div class="mute">No in-stock price</div>'}</div></a>
  <div class="row sp" style="margin-top:.7rem">${badge(r.assessment.status)}${cheapUsed != null && b && cheapUsed < b.price ? `<span class="save">Second-hand from ${money(cheapUsed)}</span>` : ''}${demoTag(p)}
  <button class="btn ghost sm" data-act="${store.has(p.id) ? 'unsave' : 'save'}" data-id="${esc(p.id)}" data-price="${b?.price ?? ''}">${store.has(p.id) ? 'Saved ✓' : 'Save to wishlist'}</button></div></article>`;
}

async function home() {
  loading();
  const { products } = await search('').catch(() => ({ products: [] }));
  const pick = ['d2', 'd1', 'd3'].map((id) => products.find((x) => x.product.id === id)).filter(Boolean);
  main.innerHTML = `<section class="hero"><h1>Know if it's a good price before you buy.</h1><p class="lead">Search any product. SavinYa checks its price history and tells you to buy, wait, or look elsewhere, and says why.</p>
  <form class="searchbox" role="search" data-form="search"><label class="skip" for="q">Search products</label><input id="q" name="q" type="search" placeholder="e.g. black trainers" autocomplete="off"><button class="btn">Search</button></form>
  <div class="chips" aria-label="Try a search">${['trainers', 'headphones', 'jeans', 'coat'].map((q) => `<a class="chip" href="#/search?q=${q}">${q}</a>`).join('')}</div></section>
  <section class="sect"><h2>See how a verdict looks</h2><div class="grid g3">${pick.map(card).join('')}</div></section>
  <section class="sect grid g3"><div class="card"><h3>Is it really a good deal?</h3><p class="mute">We compare today's price with what it has actually cost, not with a crossed-out "was" price.</p></div>
  <div class="card"><h3>Total cost, honestly</h3><p class="mute">Shipping is added where known. Where it isn't, we say so instead of guessing.</p></div>
  <div class="card"><h3>Admits what it doesn't know</h3><p class="mute">Thin price history gives "Not enough data", not a confident-sounding answer.</p></div></section>`;
}

async function searchView(params) {
  const q = params.get('q') || '';
  loading();
  let res; try { res = await search(q); } catch (e) { main.innerHTML = errorView("We couldn't reach the price sources. Check your connection and try again."); return; }
  const f = { retailer: params.get('retailer') || '', cond: params.get('cond') || '', brand: params.get('brand') || '', cat: params.get('cat') || '', max: Number(params.get('max')) || 0, sort: params.get('sort') || 'deal' };
  let rows = res.products;
  const uniq = (fn) => [...new Set(rows.flatMap(fn))].sort();
  const opts = { retailer: uniq((r) => r.offers.map((o) => o.retailer)), brand: uniq((r) => [r.product.brand]), cat: uniq((r) => [r.product.category]) };
  rows = rows.filter((r) => (!f.retailer || r.offers.some((o) => o.retailer === f.retailer)) && (!f.brand || r.product.brand === f.brand) && (!f.cat || r.product.category === f.cat)
    && (f.cond !== 'used' || r.used.length) && (!f.max || (r.assessment.best && r.assessment.best.price <= f.max)));
  const rank = { [STATUS.BUY]: 0, [STATUS.TARGET]: 0, [STATUS.GOOD]: 1, [STATUS.WAIT]: 2, [STATUS.DATA]: 3, [STATUS.NO]: 4 };
  const tot = (r) => r.assessment.best ? offerTotal(r.assessment.best).amount : 1e9;
  rows.sort((a, b) => f.sort === 'total' ? tot(a) - tot(b) : rank[a.assessment.status] - rank[b.assessment.status] || tot(a) - tot(b));
  const sel = (name, label, list, v) => `<label>${label}<select name="${name}"><option value="">Any</option>${list.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`;
  main.innerHTML = `<h1 style="font-size:1.8rem">Search</h1><form role="search" class="searchbox" data-form="search"><label class="skip" for="q">Search products</label><input id="q" name="q" type="search" value="${esc(q)}" placeholder="e.g. black trainers"><button class="btn">Search</button></form>
  <form class="filters" data-form="filters"><input type="hidden" name="q" value="${esc(q)}">${sel('retailer', 'Retailer', opts.retailer, f.retailer)}${sel('cat', 'Category', opts.cat, f.cat)}${sel('brand', 'Brand', opts.brand, f.brand)}
  <label>Condition<select name="cond"><option value="">New</option><option value="used" ${f.cond === 'used' ? 'selected' : ''}>Has second-hand</option></select></label>
  <label>Max price (£)<input name="max" type="number" min="0" inputmode="numeric" value="${f.max || ''}"></label>
  <label>Sort by<select name="sort"><option value="deal" ${f.sort === 'deal' ? 'selected' : ''}>Best deal</option><option value="total" ${f.sort === 'total' ? 'selected' : ''}>Lowest total cost</option></select></label></form>
  ${res.failed ? `<p class="alert" role="alert" style="background:#fde8dc;color:#7a2d08">${res.failed} of ${res.total} price sources didn't respond, so some results may be missing.</p>` : ''}
  ${rows.length ? `<p class="mute" role="status">${rows.length} result${rows.length > 1 ? 's' : ''}${isDemo() ? ' · demo data' : ''}</p><div class="grid g3">${rows.map(card).join('')}</div>`
    : `<div class="card empty"><h2>No matches</h2><p>Try a broader word like "trainers", or clear a filter.</p><a class="btn" href="#/search">Clear search</a></div>`}`;
}

function chart(history, target) {
  const s = dailySeries(history); if (s.length < 2) return '<p class="mute">Not enough history to chart yet.</p>';
  const W = 640, H = 230, L = 44, B = 24, T = 10, R = 10;
  const vals = s.map((x) => x.price).concat(target != null ? [target] : []), lo = Math.floor(Math.min(...vals) * .95), hi = Math.ceil(Math.max(...vals) * 1.03);
  const x = (i) => L + (i / (s.length - 1)) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join('');
  const ticks = [lo, Math.round((lo + hi) / 2), hi].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e3ee"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${money(v)}</text>`).join('');
  const mn = s.reduce((a, b, i) => (b.price < a.p ? { p: b.price, i } : a), { p: 1e9, i: 0 });
  const label = (i) => new Date(s[i].date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lowest daily price from ${label(0)} to ${label(s.length - 1)}. Lowest ${money(mn.p)}, latest ${money(s[s.length - 1].price)}.">${ticks}
  ${target != null ? `<line x1="${L}" x2="${W - R}" y1="${y(target)}" y2="${y(target)}" stroke="#2f6a00" stroke-dasharray="5 4"/><text x="${W - R}" y="${y(target) - 4}" text-anchor="end" style="fill:#2f6a00">Target ${money(target)}</text>` : ''}
  <path d="${path}" fill="none" stroke="#6C4BF4" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${x(mn.i)}" cy="${y(mn.p)}" r="4.5" fill="#B8F36B" stroke="#2f6a00"/>
  <text x="${L}" y="${H - 6}">${label(0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${label(s.length - 1)}</text></svg>`;
}

async function productView(id) {
  loading();
  let d; const wl = store.get(id);
  try { d = await loadProduct(id, wl?.target ?? null); } catch { main.innerHTML = errorView("We couldn't load this product."); return; }
  if (!d) { main.innerHTML = errorView("We couldn't find that product."); return; }
  const { product: p, offers, assessment: a, best } = d, s = a.stats, news = offers.filter((o) => o.condition === 'new');
  const cheapUsed = d.used.length ? [...d.used].sort((x, y) => x.price - y.price)[0] : null;
  main.innerHTML = `<p><a href="#/search">← Back to search</a></p>
  <div class="prod"><section class="card row" style="align-items:flex-start;flex-wrap:nowrap"><img class="hero-img" style="width:140px;flex:none" src="${p.image}" alt="" width="140" height="140"><div><h1 style="font-size:1.6rem">${esc(p.title)}</h1><p class="mute">${esc(p.brand)} · ${esc(p.category)} ${demoTag(p)}</p>
  ${best ? `<div class="price big">${money(best.price)}</div><p class="mute">${esc(best.retailer)} · ${STOCK[best.availability]}<br>${shipTxt(best)} · <span class="tag${best.isDemo ? ' demo' : ''}">${best.isDemo ? 'Demo price, not live' : 'Checked ' + ago(best.observedAt)}</span></p>` : '<p class="mute">No retailer currently has this in stock.</p>'}</div></section>
  <section class="card assess" aria-labelledby="ad"><div class="row sp"><h2 id="ad">Is this actually a good deal?</h2>${badge(a.status)}</div><p><b>${esc(a.headline)}</b></p><ul>${a.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
  <p class="mute">${esc(a.caveat)}</p>
  <form class="tgt" data-form="target" data-id="${esc(id)}"><label for="tp">Target price (£)</label><input id="tp" name="t" type="number" min="1" step="0.01" inputmode="decimal" value="${wl?.target ?? ''}" placeholder="e.g. 55"><button class="btn sm">Set target</button></form>
  <p style="margin:.8rem 0 0"><button class="btn" data-act="${wl ? 'unsave' : 'save'}" data-id="${esc(id)}" data-price="${best?.price ?? ''}">${wl ? 'Saved to wishlist ✓' : 'Save to wishlist'}</button></p></section>
  <section class="card full"><div class="row sp"><h2>Price history</h2>${demoTag(p) ? '<span class="tag demo">Simulated history</span>' : ''}</div>${chart(d.history, wl?.target ?? null)}
  <p class="mute">Lowest daily price across retailers (new items). ${s ? `${s.n} days of data${s.limited ? ' · Limited price history' : ''}.` : ''} Green dot = lowest recorded.</p></section>
  <section class="card"><h2>Best time to buy</h2>${d.seasonal.map((x) => `<p>${esc(x.text)}</p>`).join('')}<p class="mute">Based only on the history above. Sales don't repeat on a schedule. <a href="#/calendar">See the shopping calendar</a>.</p></section>
  <section class="card"><h2>Total cost by retailer</h2><div class="scroll"><table><thead><tr><th>Retailer</th><th>Item</th><th>Shipping</th><th>Total</th></tr></thead><tbody>
  ${news.sort((x, y) => offerTotal(x).amount - offerTotal(y).amount).map((o) => `<tr><td>${esc(o.retailer)}<br><span class="mute">${STOCK[o.availability]}</span></td><td>${money(o.price)}${o.originalPrice ? `<br><s class="mute">${money(o.originalPrice)}</s>` : ''}</td><td>${o.shippingCost == null ? '<span class="tag est">Calculated at checkout</span>' : o.shippingCost === 0 ? 'Free' : money(o.shippingCost)}</td><td><b>${money(offerTotal(o).amount)}</b>${offerTotal(o).exact ? '' : '<br><span class="mute">Shipping not included</span>'}</td></tr>`).join('')}</tbody></table></div>
  <p class="mute">Where shipping is unknown, the total excludes it and may be higher.</p></section>
  <section class="card"><h2>Second-hand</h2>${d.used.length ? `${d.used.map((u) => `<div class="row sp"><span>${esc(u.retailer)} · ${esc(u.conditionNote || '')}</span><b>${money(u.price)}</b></div>`).join('')}${best && cheapUsed.price < best.price ? `<p><span class="save">Potential saving ${money(best.price - cheapUsed.price)}</span></p>` : ''}<p class="mute">Condition and postage vary per listing. Check before buying.</p>`
    : '<p class="mute">No second-hand listings from a connected source. We only show real listings from authorised sources.</p>'}</section>
  <section class="card full"><h2>Cheaper alternatives</h2>${d.alts.length ? `<div class="grid g3">${d.alts.map((x) => `<div class="pc"><img src="${x.image}" alt="" width="64" height="64" style="width:64px;height:64px"><div><div class="t">${esc(x.title)}</div><div class="mute">${esc(x.retailer)}</div><div class="price" style="font-size:1.2rem">${money(x.price)} ${best && x.price < best.price ? `<span class="save">${money(best.price - x.price)} less</span>` : ''}</div><span class="tag est">${KIND[x.kind]} · est. similarity ${Math.round(x.similarity * 100)}%</span></div></div>`).join('')}</div><p class="mute">These are different products. Similarity is an estimate, not a guarantee they're the same quality or style.</p>` : '<p class="mute">No alternatives found from connected sources.</p>'}</section></div>`;
}

async function wishlistView() {
  loading();
  const items = store.all();
  if (!items.length) { main.innerHTML = `<h1 style="font-size:1.8rem">Wishlist</h1><div class="card empty"><h2>Nothing saved yet</h2><p>Save a product to track it and set a target price.</p><a class="btn" href="#/search">Find a product</a></div>`; return; }
  const rows = (await Promise.all(items.map(async (w) => { try { const d = await loadProduct(w.productId, w.target); return d && { ...d, w, best: d.assessment.best, stats: d.assessment.stats, startPrice: w.startPrice }; } catch { return null; } }))).filter(Boolean);
  const ins = insights(rows), hit = rows.filter((r) => r.assessment.status === STATUS.TARGET);
  main.innerHTML = `<h1 style="font-size:1.8rem">Wishlist</h1>
  ${hit.map((r) => `<div class="alert" role="alert">🎉 Target reached: ${esc(r.product.title)} is now ${money(r.best.price)}, ${money(r.w.target - r.best.price)} below your target.</div>`).join('')}
  <p class="mute">Alerts are checked when you open SavinYa. Alerts while your browser is closed need a backend (planned).</p>
  <div class="grid g3" style="margin-bottom:1rem"><div class="card stat"><b>${money(ins.saved)}</b>price drops since you saved items</div><div class="card stat"><b>${ins.targetsReached}</b>of ${ins.count} targets reached</div>
  <div class="card stat"><b>${money(ins.secondHand)}</b>possible via second-hand</div></div>
  <div class="grid">${rows.map((r) => { const b = r.best, hi = r.stats?.max; return `<article class="card"><div class="row sp"><a class="pc" href="#/product/${esc(r.product.id)}"><img src="${r.product.image}" alt="" width="84" height="84"><div><div class="t">${esc(r.product.title)}</div><div class="mute">${b ? `${esc(b.retailer)} · ${STOCK[b.availability]} · ${shipTxt(b)}` : 'No in-stock price'}</div>
  ${b ? `<div class="price">${money(b.price)} ${hi && hi > b.price ? `<span class="save">${money(hi - b.price)} below highest known ${money(hi)}</span>` : ''}</div><div class="mute">${totalTxt(b)} · ${b.isDemo ? 'Demo price' : 'Checked ' + ago(b.observedAt)}</div>` : ''}</div></a>${badge(r.assessment.status)}</div>
  <p class="mute" style="margin:.5rem 0">${esc(r.assessment.reasons[0] || r.assessment.headline)}</p>
  <div class="row sp"><form class="tgt" data-form="target" data-id="${esc(r.product.id)}"><label for="t-${esc(r.product.id)}">Target £</label><input id="t-${esc(r.product.id)}" name="t" type="number" min="1" step="0.01" value="${r.w.target ?? ''}"><button class="btn ghost sm">Update</button></form>
  <button class="btn ghost sm" data-act="unsave" data-id="${esc(r.product.id)}">Remove</button></div></article>`; }).join('')}</div>`;
}

async function calendarView() {
  const items = store.all(); const cats = {};
  await Promise.all(items.map(async (w) => { const d = await loadProduct(w.productId, w.target).catch(() => null); if (d) cats[w.productId] = d; }));
  const ev = calendar(new Date());
  main.innerHTML = `<h1 style="font-size:1.8rem">Shopping calendar</h1><p class="mute">Typical sale timing in the UK. Dates and discounts vary by retailer, and a sale isn't always a low price.</p><div class="grid">
  ${ev.map((e) => { const m = Object.values(cats).filter((d) => e.cats.includes(d.product.category)); return `<article class="card"><div class="row sp"><h2 style="margin:0">${esc(e.name)}</h2><span class="tag">${e.days === 0 ? 'Today' : `in ${e.days} days`}</span></div><p class="mute">${e.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} · ${esc(e.note)}</p>
  ${m.length ? `<p><b>Your wishlist items in these categories:</b></p>${m.map((d) => `<p style="margin:.2rem 0"><a href="#/product/${esc(d.product.id)}">${esc(d.product.title)}</a> <span class="mute">· ${esc(d.seasonal[0].window ? d.seasonal[0].text : 'no reliable seasonal pattern found yet')}</span></p>`).join('')}` : '<p class="mute">None of your saved items match yet.</p>'}</article>`; }).join('')}</div>`;
}

async function route() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?'), params = new URLSearchParams(qs || '');
  const seg = path.split('/').filter(Boolean);
  const name = seg[0] || 'home';
  updateChrome(name);
  try {
    if (name === 'search') await searchView(params);
    else if (name === 'product') await productView(decodeURIComponent(seg[1] || ''));
    else if (name === 'wishlist') await wishlistView();
    else if (name === 'calendar') await calendarView();
    else await home();
  } catch { main.innerHTML = errorView('Please try again.'); }
  updateChrome(name);
}

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const fd = new FormData(f), kind = f.dataset.form;
  if (kind === 'search' || kind === 'filters') { const p = new URLSearchParams(); for (const [k, v] of fd) if (v) p.set(k, v); location.hash = `#/search?${p}`; }
  if (kind === 'target') { const v = parseFloat(fd.get('t')); const id = f.dataset.id; if (!(v > 0)) { toast('Enter a price above £0'); return; }
    if (!store.has(id)) store.add(id, v, null); else store.setTarget(id, v); toast(`Target set to ${money(v)}`); route(); }
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return; const id = b.dataset.id;
  if (b.dataset.act === 'save') { store.add(id, null, b.dataset.price ? Number(b.dataset.price) : null); toast('Saved to wishlist'); }
  else { store.remove(id); toast('Removed from wishlist'); }
  const y = scrollY; await route(); scrollTo(0, y);
});
window.addEventListener('hashchange', () => { route(); scrollTo(0, 0); });
route();
