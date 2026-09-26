import type { Metadata } from 'next';
import { ThankYouView } from './thank-you-view';

export const metadata: Metadata = { title: 'تم تسجيل طلبك', robots: { index: false } };

export default async function ThankYouPage({ params }: { params: Promise<{ slug: string; orderNumber: string }> }) {
  const { orderNumber } = await params;
  return <ThankYouView orderNumber={orderNumber} />;
}
