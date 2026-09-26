export const RESERVED_SLUGS = [
  'admin',
  'api',
  'dashboard',
  'login',
  'register',
  'static',
  '_next',
  's',
  'public',
  'settings',
  // The platform's showcase store (seeded, never expires, can't take real orders).
  'demo',
] as const;

export const DEMO_STORE_SLUG = 'demo';

export const ORDER_STATUSES = ['new', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed status transitions. `delivered` and `cancelled` are terminal. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  preparing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const STORE_TEMPLATES = ['classic', 'visual', 'catalog'] as const;
export type StoreTemplate = (typeof STORE_TEMPLATES)[number];

export const STORE_TEMPLATE_LABELS: Record<StoreTemplate, { name: string; description: string }> = {
  classic: { name: 'كلاسيكي', description: 'شبكة منتجات متوازنة تناسب أغلب المتاجر' },
  visual: { name: 'بصري', description: 'صور كبيرة للمنتجات — مثالي للأزياء والإكسسوارات' },
  catalog: { name: 'كتالوج', description: 'قائمة مختصرة — مناسبة للمتاجر ذات المنتجات الكثيرة' },
};

export const STORE_FONTS = ['cairo', 'tajawal', 'almarai'] as const;
export type StoreFont = (typeof STORE_FONTS)[number];

export const STORE_FONT_LABELS: Record<StoreFont, string> = {
  cairo: 'القاهرة (Cairo)',
  tajawal: 'تجوال (Tajawal)',
  almarai: 'المراعي (Almarai)',
};

export const USER_ROLES = ['merchant', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUBSCRIPTION_PLANS = ['trial', 'basic', 'pro'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const TRIAL_DAYS = 14;
export const MAX_PRODUCT_IMAGES = 5;
export const DEFAULT_PRIMARY_COLOR = '#059669';
export const DEFAULT_SECONDARY_COLOR = '#F59E0B';
export const DEFAULT_COUNTRY_CODE = '963';
export const WHATSAPP_URL_MAX_LENGTH = 1800;
export const LOW_STOCK_THRESHOLD = 5;
