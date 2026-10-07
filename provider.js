/**
 * ProductDataProvider contract. Every data source (retailer API, affiliate feed,
 * shopping-search API, second-hand partner) implements this and returns NORMALISED data.
 * Methods a source can't support should return [] / null so the UI shows
 * "not available" instead of inventing data.
 *
 * Product:      {id,title,brand,category,image,source,isDemo}
 * Offer:        {productId,retailer,url,price,originalPrice|null,currency,
 *                availability:'in_stock'|'low_stock'|'out_of_stock'|'unknown',
 *                shippingCost:number|null (null = unknown, "calculated at checkout"),
 *                condition:'new'|'used',observedAt:ISO,source,isDemo}
 * Observation:  {productId,retailer,price,currency,availability,shippingCost,t:ISO,source,isDemo}
 * Alternative:  {id,title,brand,retailer,url,image,price,currency,kind:'exact'|'alternative'|'lookalike'|'dupe',
 *                similarity:0-1 (ESTIMATED),source,isDemo}
 */
export class ProductDataProvider {
  constructor(id, label, { isDemo = false } = {}) { this.id = id; this.label = label; this.isDemo = isDemo; }
  async searchProducts(query) { return []; }
  async getProduct(id) { return null; }
  async getPrices(productId) { return []; }
  async getAvailability(productId) { return []; }
  async getShipping(productId) { return []; }
  async getPriceHistory(productId) { return []; }
  async getSecondHand(productId) { return []; }
  async getAlternatives(productId) { return []; }
}
