/** The last placed order, kept for the thank-you page so the customer can reopen WhatsApp. */
export interface PlacedOrder {
  id: string;
  orderNumber: number;
  whatsappUrl: string;
  total: number;
  currency: string;
}

const key = (slug: string, orderNumber: number | string) => `order:${slug}:${orderNumber}`;

export function savePlacedOrder(slug: string, order: PlacedOrder) {
  try {
    window.sessionStorage.setItem(key(slug, order.orderNumber), JSON.stringify(order));
  } catch {
    /* private mode — the thank-you page still shows the order number */
  }
}

export function readPlacedOrder(slug: string, orderNumber: string): PlacedOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(slug, orderNumber));
    return raw ? (JSON.parse(raw) as PlacedOrder) : null;
  } catch {
    return null;
  }
}
