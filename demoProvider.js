// DEMO PROVIDER – all products, retailers, prices and histories are SIMULATED for development.
// Retailer names are fictional. Nothing here is live or real. Delete once a real provider is connected.
import { ProductDataProvider } from './provider.js';

const RETAILERS = ['Northline Sports', 'Gridmart', 'Highstreet & Co', 'Parcelo'];
const USED = 'Second-hand partner (demo)';
const DAY = 864e5, HISTORY_DAYS = 420, SRC = 'SavinYa demo data';

// offers: [retailerIndex, priceFactor, shipping|null(unknown), stock]
const CATALOGUE = [
  { id: 'd1', title: 'Court Runner trainers – black', brand: 'Nike', category: 'Footwear', base: 78, now: 0.92, sea: true, color: '#2a2a35',
    offers: [[0, 1, 4.5, 'in_stock'], [1, 1.04, 0, 'in_stock'], [2, 0.98, null, 'low_stock'], [3, 1.1, 3.99, 'in_stock']],
    used: [[38, 'Very good'], [46, 'Like new']],
    alts: [{ title: 'Street Lite trainers – black', brand: 'Gridmart own', retailer: 'Gridmart', price: 34, kind: 'lookalike', sim: 0.7 }, { title: 'Daily Run shoes – black', brand: 'Urbo', retailer: 'Parcelo', price: 45, kind: 'alternative', sim: 0.6 }] },
  { id: 'd2', title: 'Noise-cancelling headphones', brand: 'Sonara', category: 'Electronics', base: 329, now: 0.78, sea: true, color: '#3b3470',
    offers: [[1, 1, 0, 'in_stock'], [2, 1.03, 0, 'in_stock'], [3, 0.99, 5.99, 'in_stock']],
    used: [[189, 'Good']], alts: [{ title: 'ANC over-ear headphones', brand: 'Quietly', retailer: 'Gridmart', price: 129, kind: 'alternative', sim: 0.65 }] },
  { id: 'd3', title: '501 straight jeans – mid wash', brand: "Levi's", category: 'Clothing', base: 95, now: 1.12, sea: false, color: '#4a6fa5',
    offers: [[2, 1, 3.99, 'in_stock'], [1, 0.97, null, 'in_stock'], [3, 1.05, 3.5, 'in_stock']],
    used: [[28, 'Good']], alts: [{ title: 'Straight jeans – mid wash', brand: 'Highstreet own', retailer: 'Highstreet & Co', price: 39, kind: 'dupe', sim: 0.75 }] },
  { id: 'd4', title: 'Dual-zone air fryer 9L', brand: 'Crispa', category: 'Home', base: 149, now: 0.85, sea: true, color: '#1f6f6a',
    offers: [[1, 1, 0, 'in_stock'], [2, 1.06, 6, 'in_stock'], [0, 1.02, null, 'out_of_stock']],
    used: [], alts: [{ title: 'Digital air fryer 7L', brand: 'Heatly', retailer: 'Parcelo', price: 79, kind: 'alternative', sim: 0.6 }] },
  { id: 'd5', title: 'Everyday rucksack 24L – black', brand: 'Trailhead', category: 'Bags', base: 65, now: 1.0, sea: false, color: '#444a3d',
    offers: [[0, 1, 3.99, 'in_stock'], [3, 0.96, 4.99, 'in_stock']], used: [[24, 'Good']], alts: [] },
  { id: 'd6', title: 'Bean-to-cup coffee machine', brand: 'Brewline', category: 'Home', base: 410, now: 0.7, sea: true, color: '#6b4a2e',
    offers: [[1, 1, 0, 'in_stock'], [2, 1.05, 0, 'in_stock']], used: [[230, 'Good']],
    alts: [{ title: 'Compact filter + grinder set', brand: 'Heatly', retailer: 'Gridmart', price: 119, kind: 'alternative', sim: 0.45 }] },
  { id: 'd7', title: 'GPS running watch', brand: 'Stridely', category: 'Electronics', base: 249, now: 1.0, sea: false, color: '#c2410c',
    offers: [[0, 1, 0, 'in_stock'], [1, 1.02, 4.99, 'low_stock']], used: [], alts: [] },
  { id: 'd8', title: 'Wool-blend overcoat – camel', brand: 'Maren', category: 'Clothing', base: 140, now: 0.9, sea: true, color: '#a67c52',
    offers: [[2, 1, 4.99, 'in_stock'], [3, 1.08, null, 'in_stock']], used: [[55, 'Very good']],
    alts: [{ title: 'Wool-look coat – camel', brand: 'Urbo', retailer: 'Parcelo', price: 59, kind: 'lookalike', sim: 0.72 }] }
];

function rng(seed) { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function hash(str) { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
const img = (c, label) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="${c}"/><text x="100" y="120" font-family="sans-serif" font-size="64" font-weight="700" fill="#fff" fill-opacity=".85" text-anchor="middle">${label}</text></svg>`);

// Deterministic SIMULATED history. A real provider returns only genuinely recorded observations.
function buildHistory(p, now) {
  const out = [], r = rng(hash(p.id)), end = Math.floor(now / DAY) * DAY;
  p.offers.forEach(([ri, f, ship, stock]) => {
    for (let d = HISTORY_DAYS; d >= 0; d--) {
      const t = end - d * DAY, dt = new Date(t), m = dt.getUTCMonth(), day = dt.getUTCDate();
      let k = 1 + (r() - 0.5) * 0.06;
      if (r() < 0.04) k *= 0.93;
      if (p.sea && ((m === 10 && day >= 20) || (m === 11 && day <= 2))) k *= 0.8;
      if (p.sea && m === 0 && day >= 2 && day <= 18) k *= 0.88;
      let price = p.base * f * k;
      if (d < 12) price = p.base * f * (1 + (p.now - 1) * (1 - d / 12)) * (1 + (r() - 0.5) * 0.01);
      out.push({ productId: p.id, retailer: RETAILERS[ri], price: Math.round(price), currency: 'GBP', availability: stock, shippingCost: ship, t: new Date(t + 252e5).toISOString(), source: SRC, isDemo: true });
    }
  });
  return out;
}

export class DemoProvider extends ProductDataProvider {
  constructor() { super('demo', 'Demo data (simulated)', { isDemo: true }); this.now = Date.now(); this.cache = {}; }
  _find(id) { return CATALOGUE.find((x) => x.id === id); }
  _product(p) { return { id: p.id, title: p.title, brand: p.brand, category: p.category, image: img(p.color, p.brand[0]), source: SRC, isDemo: true }; }
  _hist(p) { return this.cache[p.id] || (this.cache[p.id] = buildHistory(p, this.now)); }
  async searchProducts(query) {
    const toks = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
    return CATALOGUE.filter((p) => { const hay = `${p.title} ${p.brand} ${p.category}`.toLowerCase(); return toks.every((t) => hay.includes(t)); }).map((p) => this._product(p));
  }
  async getProduct(id) { const p = this._find(id); return p ? this._product(p) : null; }
  async getPrices(id) {
    const p = this._find(id); if (!p) return [];
    const r = rng(hash(id + 'now'));
    return p.offers.map(([ri, , ship, stock]) => {
      const price = this._hist(p).filter((h) => h.retailer === RETAILERS[ri]).pop().price;
      return { productId: id, retailer: RETAILERS[ri], url: '', price, originalPrice: r() < 0.5 ? Math.round(price * 1.18) : null, currency: 'GBP', availability: stock, shippingCost: ship, condition: 'new', observedAt: new Date(this.now - Math.floor(r() * 50 + 3) * 6e4).toISOString(), source: SRC, isDemo: true };
    });
  }
  async getAvailability(id) { return (await this.getPrices(id)).map((o) => ({ retailer: o.retailer, availability: o.availability })); }
  async getShipping(id) { return (await this.getPrices(id)).map((o) => ({ retailer: o.retailer, shippingCost: o.shippingCost })); }
  async getPriceHistory(id) { const p = this._find(id); return p ? this._hist(p) : []; }
  async getSecondHand(id) {
    const p = this._find(id); if (!p) return [];
    return p.used.map(([price, note], i) => ({ productId: id, retailer: USED, url: '', price, originalPrice: null, currency: 'GBP', availability: 'in_stock', shippingCost: null, condition: 'used', conditionNote: note, observedAt: new Date(this.now - (i + 1) * 9e5).toISOString(), source: SRC, isDemo: true }));
  }
  async getAlternatives(id) {
    const p = this._find(id); if (!p) return [];
    return p.alts.map((a, i) => ({ id: `${id}-alt${i}`, title: a.title, brand: a.brand, retailer: a.retailer, url: '', image: img('#8a85a8', a.kind[0].toUpperCase()), price: a.price, currency: 'GBP', kind: a.kind, similarity: a.sim, source: SRC, isDemo: true }));
  }
}
export const demoProvider = new DemoProvider();
