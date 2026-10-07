// Wishlist persistence. localStorage for the MVP (per device). Phase 2: replace with an account-backed API.
const KEY = 'savinya.wishlist.v1';
const mem = { v: [] };
function read() { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return mem.v; } }
function write(v) { mem.v = v; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked: stays in memory */ } }
export const store = {
  all: read,
  has: (id) => read().some((x) => x.productId === id),
  get: (id) => read().find((x) => x.productId === id),
  add(productId, target, startPrice) { if (!this.has(productId)) write([...read(), { productId, target: target ?? null, startPrice: startPrice ?? null, addedAt: new Date().toISOString() }]); },
  setTarget(productId, target) { write(read().map((x) => x.productId === productId ? { ...x, target } : x)); },
  remove(productId) { write(read().filter((x) => x.productId !== productId)); }
};
