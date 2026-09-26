'use client';

import type { DeliveryZoneDto, PublicProductDto } from '@matjari/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL } from '@/lib/env';

/** The subset of store data client components need (kept small: it's serialised into the page). */
export interface StorefrontInfo {
  name: string;
  slug: string;
  currency: string;
  whatsappNumber: string;
  minOrderAmount: number;
  deliveryZones: DeliveryZoneDto[];
}

export interface CartItem {
  /** productId + chosen options: the same product in two sizes is two lines. */
  key: string;
  productId: string;
  name: string;
  image: string | null;
  /** Display snapshot only — the server recomputes every price at checkout. */
  price: number;
  quantity: number;
  options: Record<string, string>;
  /** null when the product doesn't track stock. */
  maxQuantity: number | null;
}

interface CartState {
  store: StorefrontInfo;
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, 'key'>) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  reconcile: () => Promise<string[]>;
}

const Ctx = createContext<CartState | null>(null);

const MAX_QTY = 99;
export const cartStorageKey = (slug: string) => `cart:${slug}`;

export function lineKey(productId: string, options: Record<string, string>) {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('|');
  return `${productId}${opts ? `::${opts}` : ''}`;
}

function readCart(slug: string): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(cartStorageKey(slug));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => i && typeof i.productId === 'string' && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

function clampQty(quantity: number, max: number | null) {
  return Math.max(1, Math.min(quantity, max ?? MAX_QTY, MAX_QTY));
}

export function StorefrontProvider({ store, children }: { store: StorefrontInfo; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // localStorage is only read after mount, so server and client render the same markup first.
  useEffect(() => {
    setItems(readCart(store.slug));
    setReady(true);
  }, [store.slug]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(cartStorageKey(store.slug), JSON.stringify(items));
    } catch {
      /* storage full or disabled — cart still works for this visit */
    }
  }, [items, ready, store.slug]);

  // Keep tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === cartStorageKey(store.slug)) setItems(readCart(store.slug));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store.slug]);

  const add = useCallback((item: Omit<CartItem, 'key'>) => {
    const key = lineKey(item.productId, item.options);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, ...item, key, quantity: clampQty(i.quantity + item.quantity, item.maxQuantity) } : i));
      }
      return [...prev, { ...item, key, quantity: clampQty(item.quantity, item.maxQuantity) }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: clampQty(quantity, i.maxQuantity) } : i)));
  }, []);

  const remove = useCallback((key: string) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  /** Refreshes names, prices and stock from the live catalogue. Returns names of removed items. */
  const reconcile = useCallback(async () => {
    const res = await fetch(`${API_URL}/public/stores/${store.slug}/products`);
    if (!res.ok) return [];
    const { data } = (await res.json()) as { data: PublicProductDto[] };
    const byId = new Map(data.map((p) => [p.id, p]));
    const removed: string[] = [];
    const next = itemsRef.current.flatMap((i) => {
        const p = byId.get(i.productId);
        const optionsValid = p?.options.every((o) => o.values.includes(i.options[o.name] ?? ''));
        if (!p || !p.inStock || !optionsValid) {
          removed.push(i.name);
          return [];
        }
        const maxQuantity = p.trackStock ? p.stock : null;
        return [{ ...i, name: p.name, price: p.price, image: p.images[0] ?? null, maxQuantity, quantity: clampQty(i.quantity, maxQuantity) }];
    });
    setItems(next);
    return removed;
  }, [store.slug]);

  const value = useMemo<CartState>(
    () => ({
      store,
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      reconcile,
    }),
    [store, items, ready, add, setQuantity, remove, clear, reconcile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside StorefrontProvider');
  return ctx;
}
