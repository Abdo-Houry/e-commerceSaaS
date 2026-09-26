export interface CreatedOrder {
  id: string;
  orderNumber: number;
  whatsappUrl: string;
}

export interface CheckoutFlowDeps<TInput> {
  createOrder: (input: TInput) => Promise<CreatedOrder>;
  onCreated: (order: CreatedOrder) => void;
  markWhatsappOpened: (orderId: string) => void;
  openWhatsapp: (url: string) => void;
}

/**
 * Enforces the order-first rule: the order row must exist (and we must hold
 * its number) before WhatsApp opens. If creation throws, nothing else runs.
 */
export async function placeOrderThenOpenWhatsapp<TInput>(
  input: TInput,
  deps: CheckoutFlowDeps<TInput>,
): Promise<CreatedOrder> {
  const order = await deps.createOrder(input);
  deps.onCreated(order);
  deps.markWhatsappOpened(order.id);
  deps.openWhatsapp(order.whatsappUrl);
  return order;
}
