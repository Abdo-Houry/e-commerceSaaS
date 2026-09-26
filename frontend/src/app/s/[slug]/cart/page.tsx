import type { Metadata } from 'next';
import { CartView } from './cart-view';

export const metadata: Metadata = { title: 'السلة', robots: { index: false } };

export default function CartPage() {
  return <CartView />;
}
