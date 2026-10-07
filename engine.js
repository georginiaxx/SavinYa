// Pure business logic: no DOM, no provider code. Everything here is explainable and unit-testable.
export const money = (n) => n == null ? '–' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
export const DAY = 864e5;

export function offerTotal(o) { return o.shippingCost == null ? { amount: o.price, exact: false } : { amount: o.price + o.shippingCost, exact: true }; }
export function newInStock(offers) { return offers.filter((o) => o.condition === 'new' && o.availability !== 'out_of_stock'); }
export function bestOffer(offers) {
  const n = newInStock(offers); if (!n.length) return null;
  return [...n].sort((a, b) => offerTotal(a).amount - offerTotal(b).amount)[0];
}

// Cheapest item price per calendar day across retailers (new items only).
export function dailySeries(history) {
  const m = new Map();
  for (const h of history) { const d = h.t.slice(0, 10); if (!m.has(d) || h.price < m.get(d)) m.set(d, h.price); }
  return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([date, price]) => ({ date, price }));
}
export function stats(series) {
  if (!series.length) return null;
  const v = series.map((s) => s.price).sort((a, b) => a - b), n = v.length;
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const span = Math.round((new Date(series[n - 1].date) - new Date(series[0].date)) / DAY) + 1;
  return { n, min: v[0], max: v[n - 1], median, span, limited: n < 60 || span < 90 };
}

const T = { BUY: 'BUY NOW', WAIT: 'WAIT', TARGET: 'TARGET REACHED', GOOD: 'GOOD DEAL', NO: "DON'T BUY", DATA: 'NOT ENOUGH DATA' };
export const STATUS = T;

export function assess({ offers, history, target }) {
  const best = bestOffer(offers);
  const series = dailySeries(history), s = stats(series);
  const base = { stats: s, best, caveat: 'An estimate from past prices – not a prediction.' };
  if (!best) return { ...base, status: T.DATA, headline: 'No in-stock price right now', reasons: ['No retailer we check lists this as available.'] };
  const cur = best.price, reasons = [];
  if (s) reasons.push(`Typical price ${money(s.median)} · lowest recorded ${money(s.min)} · highest ${money(s.max)}, over ${s.span} days${s.limited ? ' (limited price history)' : ''}.`);
  const vsLow = s ? cur - s.min : null;
  if (target != null && cur <= target) {
    reasons.unshift(`${money(cur)} is ${money(target - cur)} ${cur === target ? 'at' : 'below'} your target of ${money(target)}.`);
    if (s && vsLow > 0) reasons.push(`It has been ${money(vsLow)} cheaper before, but you set this target.`);
    return { ...base, status: T.TARGET, headline: 'Your target price has been reached', reasons };
  }
  if (!s || s.n < 14) return { ...base, status: T.DATA, headline: 'Not enough data yet', reasons: ['We have too little price history to judge this price – so we won’t guess.', ...reasons] };
  const vsMed = (s.median - cur) / s.median;
  if (cur <= s.min * 1.03) {
    reasons.unshift(`${money(cur)} is at or within 3% of the lowest price we've recorded.`);
    if (target != null) reasons.push(`Your target (${money(target)}) is lower than anything seen, so it may never be hit.`);
    return { ...base, status: T.BUY, headline: 'This is about as low as it has been', reasons };
  }
  if (target != null) {
    const hits = series.filter((x) => x.price <= target).length;
    reasons.unshift(`Your target is ${money(target)}; it's ${money(cur)} now (${money(cur - target)} above).`);
    reasons.push(hits ? `Prices were at or below your target on ${hits} of ${s.n} recorded days, so waiting may pay off.` : 'Prices have never reached your target in our history – consider whether it is realistic.');
    return { ...base, status: T.WAIT, headline: 'Above your target – waiting may be worthwhile', reasons };
  }
  if (vsMed >= 0.1) { reasons.unshift(`${money(cur)} is ${Math.round(vsMed * 100)}% below the typical price.`); if (vsLow > 0) reasons.push(`You'd still pay ${money(vsLow)} more than the lowest recorded price.`); return { ...base, status: T.GOOD, headline: 'Meaningfully below the usual price', reasons }; }
  if (vsMed <= -0.05) { reasons.unshift(`${money(cur)} is ${Math.round(-vsMed * 100)}% above the typical price.`); return { ...base, status: T.NO, headline: 'Poor value on current evidence', reasons }; }
  reasons.unshift(`${money(cur)} is close to the typical price – a decent price, not an exceptional deal.`, vsLow > 0 ? `You'd pay ${money(vsLow)} more than the lowest recorded price.` : '');
  return { ...base, status: T.WAIT, headline: 'Fair price, not a standout', reasons: reasons.filter(Boolean) };
}

// Seasonal pattern: only reported when observed history actually shows a dip inside the window.
const WINDOWS = [
  { name: 'Black Friday', test: (d) => (d.getUTCMonth() === 10 && d.getUTCDate() >= 20) || (d.getUTCMonth() === 11 && d.getUTCDate() <= 2) },
  { name: 'January sales', test: (d) => d.getUTCMonth() === 0 && d.getUTCDate() >= 2 && d.getUTCDate() <= 18 }
];
export function seasonal(history) {
  const series = dailySeries(history), found = [];
  for (const w of WINDOWS) {
    const inW = series.filter((x) => w.test(new Date(x.date))), out = series.filter((x) => !w.test(new Date(x.date)));
    if (inW.length < 5 || out.length < 60) continue;
    const med = stats(out).median, low = Math.min(...inW.map((x) => x.price)), drop = (med - low) / med;
    if (drop >= 0.1) found.push({ window: w.name, text: `In the ${w.name} period we've recorded, the lowest price was ${money(low)} – ${Math.round(drop * 100)}% below the usual ${money(med)}.`, drop });
  }
  return found.length ? found : [{ window: null, text: 'No reliable seasonal pattern found yet.' }];
}

// Shopping calendar (typical timing; retailers vary). Returns next occurrence of each event.
function nthWeekday(y, m, wd, n) { const d = new Date(Date.UTC(y, m, 1)); const off = (wd - d.getUTCDay() + 7) % 7; return new Date(Date.UTC(y, m, 1 + off + (n - 1) * 7)); }
export function calendar(now = new Date()) {
  const defs = (y) => [
    { name: 'Summer clearance', date: new Date(Date.UTC(y, 6, 1)), cats: ['Clothing', 'Footwear', 'Bags'], note: 'End-of-season markdowns on summer stock.' },
    { name: 'Back to school', date: new Date(Date.UTC(y, 7, 15)), cats: ['Bags', 'Electronics', 'Footwear'], note: 'Stationery, bags, laptops and school shoes.' },
    { name: 'Black Friday', date: new Date(nthWeekday(y, 10, 4, 4).getTime() + DAY), cats: ['Electronics', 'Home', 'Footwear', 'Clothing', 'Bags'], note: 'The biggest broad sale; check whether prices were truly lower before.' },
    { name: 'Cyber Monday', date: new Date(nthWeekday(y, 10, 4, 4).getTime() + 4 * DAY), cats: ['Electronics', 'Home'], note: 'Tech and home deals.' },
    { name: 'Boxing Day sales', date: new Date(Date.UTC(y, 11, 26)), cats: ['Clothing', 'Footwear', 'Home', 'Electronics'], note: 'Post-Christmas clearance.' },
    { name: 'January sales', date: new Date(Date.UTC(y + 1, 0, 2)), cats: ['Clothing', 'Footwear', 'Bags', 'Home'], note: 'Winter clearance, e.g. coats.' }
  ];
  const y = now.getUTCFullYear(), today = Date.UTC(y, now.getUTCMonth(), now.getUTCDate());
  return [...defs(y - 1), ...defs(y), ...defs(y + 1)].filter((e) => e.date.getTime() >= today).sort((a, b) => a.date - b.date)
    .filter((e, i, a) => a.findIndex((x) => x.name === e.name) === i).map((e) => ({ ...e, days: Math.round((e.date.getTime() - today) / DAY) }));
}

// Lightweight insights computed from the user's wishlist rows.
export function insights(rows) {
  const priced = rows.filter((r) => r.best);
  const saved = priced.reduce((t, r) => t + Math.max(0, (r.startPrice ?? r.best.price) - r.best.price), 0);
  const belowHigh = priced.map((r) => r.stats ? (r.stats.max - r.best.price) / r.stats.max : null).filter((x) => x != null);
  const secondHand = priced.reduce((t, r) => { const u = r.used.length ? Math.min(...r.used.map((x) => x.price)) : null; return t + (u != null && u < r.best.price ? r.best.price - u : 0); }, 0);
  return { count: rows.length, saved, targetsReached: rows.filter((r) => r.assessment.status === T.TARGET).length, avgBelowHigh: belowHigh.length ? belowHigh.reduce((a, b) => a + b, 0) / belowHigh.length : null, secondHand };
}

export function ago(iso, now = Date.now()) {
  const m = Math.max(1, Math.round((now - new Date(iso)) / 6e4));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
