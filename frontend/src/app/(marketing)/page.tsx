import { formatMoney, type ApiSuccess, type PublicPlatformInfo } from '@matjari/shared';
import { Check, MessageCircle, Palette, ShoppingBag, Smartphone, Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { PLATFORM_TAG } from '@/lib/public-api';
import { serverEnv } from '@/lib/server-env';
import { cn } from '@/lib/utils';

export const revalidate = 300;

async function getPlatformInfo(): Promise<PublicPlatformInfo | null> {
  try {
    const res = await fetch(`${serverEnv.apiInternalUrl}/public/platform`, { next: { revalidate, tags: [PLATFORM_TAG] } });
    return res.ok ? ((await res.json()) as ApiSuccess<PublicPlatformInfo>).data : null;
  } catch {
    return null;
  }
}

const steps = [
  { icon: Store, title: 'أنشئ متجرك', text: 'اسم المتجر، رابط خاص فيك، ورقم واتساب. خلال دقيقتين.' },
  { icon: ShoppingBag, title: 'أضف منتجاتك', text: 'صور، أسعار، مقاسات وألوان. كلها من موبايلك.' },
  { icon: MessageCircle, title: 'استقبل الطلبات', text: 'الزبون يطلب، والطلب يوصلك جاهز على واتساب برقم واضح.' },
];

const PLAN_FEATURES = ['منتجات وطلبات بلا حدود', '3 قوالب وألوانك الخاصة', 'طلبات مباشرة على واتساب', 'مناطق توصيل وإحصائيات', 'دعم عبر واتساب'];

const features = [
  { icon: Smartphone, title: 'مصمم للموبايل', text: 'متجرك ولوحة التحكم يشتغلوا بسلاسة على أي هاتف.' },
  { icon: Palette, title: '3 قوالب وألوانك', text: 'اختر القالب والألوان المناسبة لهوية متجرك بدون أي كود.' },
  { icon: Truck, title: 'مناطق التوصيل', text: 'حدد أسعار التوصيل لكل منطقة وتُحسب تلقائياً للزبون.' },
  { icon: MessageCircle, title: 'واتساب مجاني', text: 'بدون اشتراكات واتساب مدفوعة. روابط wa.me مباشرة.' },
];

export default async function HomePage() {
  const platform = await getPlatformInfo();
  const trialDays = platform?.trialDays ?? 14;
  const plans = platform?.plans ?? [];
  const currency = platform?.currency ?? 'USD';
  // Highlight the longest plan that saves money, else the middle one.
  const featuredId = [...plans].reverse().find((p) => p.savingsPercent > 0)?.id ?? plans[Math.floor(plans.length / 2)]?.id;
  return (
    <div className="min-h-dvh bg-n-0">
      <header className="sticky top-0 z-30 border-b border-n-200 bg-n-0/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-h3 font-bold text-brand-700">
            <span className="flex size-9 items-center justify-center rounded-md bg-brand-700 text-n-0">
              <Store className="size-5" aria-hidden />
            </span>
            متجري
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              دخول
            </Link>
            <Link href="/register" className={buttonVariants({ size: 'sm' })}>
              ابدأ مجاناً
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-brand-50 to-n-0">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
            <div className="flex flex-col gap-5">
              <span className="w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                تجربة مجانية {trialDays} يوماً — بدون بطاقة
              </span>
              <h1 className="text-h1 font-bold text-n-900 md:text-display">
                متجرك الإلكتروني جاهز، <span className="text-brand-700">والطلبات على واتساب</span>
              </h1>
              <p className="text-body-lg text-n-600">
                اعرض منتجاتك برابط واحد تشاركه على إنستغرام وفيسبوك. الزبون يختار ويطلب، وأنت تستلم الطلب مرتباً على واتساب — والدفع عند
                التسليم.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/register" className={buttonVariants({ size: 'lg' })}>
                  أنشئ متجرك الآن
                </Link>
                <Link href="/s/demo" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                  شاهد متجراً تجريبياً
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-n-700">
                {['بدون عمولة على الطلبات', 'بدون دفع إلكتروني', 'عربي بالكامل'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-4 text-brand-700" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mx-auto w-full max-w-xs rounded-xl border border-n-200 bg-n-0 p-3 shadow-xl" aria-hidden>
              <div className="rounded-lg bg-brand-700 p-4 text-n-0">
                <p className="text-xs opacity-90">متجر الياسمين</p>
                <p className="text-h3 font-bold">تشكيلة الخريف وصلت</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {['قميص قطني', 'حقيبة جلدية', 'ساعة يد', 'نظارة شمسية'].map((n, i) => (
                  <div key={n} className="rounded-md border border-n-200 p-2">
                    <div className={cn('aspect-square rounded-sm', ['bg-brand-100', 'bg-accent-100', 'bg-n-100', 'bg-brand-50'][i])} />
                    <p className="mt-1 truncate text-caption font-semibold">{n}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-md bg-whatsapp-strong text-sm font-semibold text-n-0">
                <MessageCircle className="size-4" />
                إرسال الطلب عبر واتساب
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-h2 font-bold">ثلاث خطوات وبتبلّش تبيع</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-n-200 bg-n-0 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{i + 1}</span>
                  <s.icon className="size-6 text-brand-700" aria-hidden />
                </div>
                <h3 className="mt-3 text-h3 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-n-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-n-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-center text-h2 font-bold">كل اللي بتحتاجه، بدون تعقيد</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <li key={f.title} className="rounded-lg bg-n-0 p-5 shadow-sm">
                  <f.icon className="size-7 text-brand-700" aria-hidden />
                  <h3 className="mt-3 font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-n-600">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-h" className="bg-gradient-to-b from-n-0 to-brand-50/60">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 id="pricing-h" className="text-center text-h2 font-bold md:text-h1">
              باقات بسيطة، بكل المزايا
            </h2>
            <p className="mt-2 text-center text-n-600">ابدأ بتجربة مجانية {trialDays} يوماً، واختر الباقة المناسبة بعدها.</p>

            {plans.length ? (
              <ul className="mx-auto mt-10 grid max-w-5xl items-stretch gap-4 md:grid-cols-3">
                {plans.map((p) => {
                  const featured = p.id === featuredId;
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        'relative flex flex-col rounded-xl border bg-n-0 p-6 shadow-sm',
                        featured ? 'border-2 border-brand-600 shadow-lg md:-my-3 md:py-9' : 'border-n-200',
                      )}
                    >
                      {featured && (
                        <span className="absolute -top-3.5 start-1/2 w-max -translate-x-1/2 rounded-full bg-brand-700 px-3 py-1 text-caption font-bold text-n-0 rtl:translate-x-1/2">
                          الأكثر توفيراً
                        </span>
                      )}
                      <p className="font-bold text-n-700">{p.name}</p>
                      <p className="mt-3 flex items-baseline gap-1">
                        <span className="text-display font-bold text-n-900">{formatMoney(p.price, currency)}</span>
                        <span className="text-sm text-n-600">/ {p.months === 1 ? 'شهر' : `${p.months} ${p.months <= 10 ? 'أشهر' : 'شهراً'}`}</span>
                      </p>
                      <p className="mt-1 min-h-6 text-sm text-n-600">
                        {p.months > 1 ? `≈ ${formatMoney(p.monthlyEquivalent, currency)} شهرياً` : 'مرونة كاملة، ألغِ متى شئت'}
                        {p.savingsPercent > 0 && (
                          <span className="ms-2 rounded-full bg-status-delivered-bg px-2 py-0.5 text-caption font-bold text-status-delivered-fg">وفّر {p.savingsPercent}%</span>
                        )}
                      </p>
                      <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-n-700">
                        {PLAN_FEATURES.map((t) => (
                          <li key={t} className="flex items-center gap-2">
                            <Check className="size-4 shrink-0 text-brand-700" aria-hidden />
                            {t}
                          </li>
                        ))}
                      </ul>
                      <Link href="/register" className={cn(buttonVariants({ size: 'lg', block: true, variant: featured ? 'primary' : 'secondary' }), 'mt-6')}>
                        ابدأ التجربة المجانية
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-8 text-center font-semibold text-n-700">تواصل معنا لمعرفة الأسعار.</p>
            )}
            <p className="mt-8 text-center text-sm text-n-600">الدفع عبر شام كاش، USDT، أو تسليم باليد — ويتم تفعيل اشتراكك من لوحة متجرك.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 text-center">
          <h2 className="text-h2 font-bold">جاهز تفتح متجرك؟</h2>
          <p className="mt-2 text-n-600">{trialDays} يوم تجربة مجانية بكل المزايا.</p>
          <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'mt-6')}>
            ابدأ مجاناً
          </Link>
        </section>
      </main>

      <footer className="border-t border-n-200 py-6 text-center text-xs text-n-600">© {new Date().getFullYear()} متجري</footer>
    </div>
  );
}
