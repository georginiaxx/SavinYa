// Aggregation layer: talks to all providers, merges results, never to the UI. Failures are reported, not hidden.
import { providers } from './providers/index.js';
import { assess, bestOffer, seasonal } from './engine.js';

const settled = async (fn) => {
  const res = await Promise.allSettled(providers.map(fn));
  return { ok: res.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value ?? []), failed: res.filter((r) => r.status === 'rejected').length };
};
const one = async (fn) => { for (const p of providers) { try { const v = await fn(p); if (v) return v; } catch { /* try next */ } } return null; };

export const isDemo = () => providers.some((p) => p.isDemo);

export async function search(query) {
  const r = await settled((p) => p.searchProducts(query));
  const products = await Promise.all(r.ok.map(async (p) => {
    const [offers, history, used] = await Promise.all([getAll('getPrices', p.id), getAll('getPriceHistory', p.id), getAll('getSecondHand', p.id)]);
    return { product: p, offers, history, used, assessment: assess({ offers, history, target: null }) };
  }));
  return { products, failed: r.failed, total: providers.length };
}
const getAll = async (m, id) => (await settled((p) => p[m](id))).ok;

export async function loadProduct(id, target) {
  const product = await one((p) => p.getProduct(id));
  if (!product) return null;
  const [offers, history, used, alts] = await Promise.all(['getPrices', 'getPriceHistory', 'getSecondHand', 'getAlternatives'].map((m) => getAll(m, id)));
  return { product, offers, history, used, alts, assessment: assess({ offers, history, target }), seasonal: seasonal(history), best: bestOffer(offers) };
}
