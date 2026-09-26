import { WHATSAPP_URL_MAX_LENGTH } from '../constants';
import { formatMoney } from './money';

export interface WhatsappOrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: Record<string, string>;
}

export interface WhatsappOrderInput {
  storeName: string;
  orderNumber: number;
  currency: string;
  items: WhatsappOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  zoneName: string;
  customerAddress: string;
  notes?: string | null;
}

/** `encodeURIComponent` is applied once, to the whole message. */
export function buildWhatsappUrl(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function itemLine(item: WhatsappOrderItem, currency: string): string {
  const options = Object.values(item.selectedOptions ?? {}).filter(Boolean);
  const opts = options.length ? ` (${options.join('، ')})` : '';
  const lineTotal = formatMoney(item.unitPrice * item.quantity, currency);
  return `- ${item.productName}${opts} × ${item.quantity} — ${lineTotal}`;
}

function compose(input: WhatsappOrderInput, itemLines: string[]): string {
  const m = (v: number) => formatMoney(v, input.currency);
  const notes = input.notes && input.notes.trim() ? input.notes.trim() : '—';
  return [
    `مرحباً، طلب جديد من ${input.storeName}`,
    `رقم الطلب: #${input.orderNumber}`,
    '',
    ...itemLines,
    '',
    `المجموع: ${m(input.subtotal)}`,
    `التوصيل: ${m(input.deliveryFee)}`,
    `الإجمالي: ${m(input.total)}`,
    '',
    `الاسم: ${input.customerName}`,
    `الهاتف: ${input.customerPhone}`,
    `المنطقة: ${input.zoneName}`,
    `العنوان: ${input.customerAddress}`,
    `ملاحظات: ${notes}`,
  ].join('\n');
}

/**
 * Builds the order message and wa.me link. If the encoded URL would exceed
 * ~1800 chars, trailing items are dropped and summarised in one line.
 */
export function buildOrderMessage(
  input: WhatsappOrderInput,
  whatsappNumber: string,
  maxUrlLength: number = WHATSAPP_URL_MAX_LENGTH,
): { message: string; url: string; truncatedItems: number } {
  const lines = input.items.map((i) => itemLine(i, input.currency));

  for (let keep = lines.length; keep >= 0; keep--) {
    const dropped = lines.length - keep;
    const shown = lines.slice(0, keep);
    if (dropped > 0) shown.push(`… و${dropped} منتجات أخرى — التفاصيل الكاملة برقم الطلب`);
    const message = compose(input, shown);
    const url = buildWhatsappUrl(whatsappNumber, message);
    if (url.length <= maxUrlLength || keep === 0) {
      return { message, url, truncatedItems: dropped };
    }
  }

  // Unreachable: the loop always returns at keep === 0.
  const message = compose(input, []);
  return { message, url: buildWhatsappUrl(whatsappNumber, message), truncatedItems: lines.length };
}
