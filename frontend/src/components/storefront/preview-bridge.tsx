'use client';

import { ensureContrastWithWhite, readableTextColor } from '@matjari/shared';
import { useEffect } from 'react';
import { storeFontVar } from '@/lib/font-vars';
import { PREVIEW_MESSAGE, PREVIEW_READY, type PreviewMessage } from '@/lib/preview';

/**
 * Only active inside the dashboard's design iframe (?preview=1). Applies unsaved
 * theme changes by swapping CSS variables and data attributes — no reload.
 */
export function PreviewBridge() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1' || window.parent === window) return;

    function onMessage(e: MessageEvent<PreviewMessage>) {
      if (e.origin !== window.location.origin || e.data?.type !== PREVIEW_MESSAGE) return;
      const t = e.data.theme;
      const root = document.querySelector<HTMLElement>('[data-store-root]');
      if (!root) return;
      root.dataset.template = t.template;
      root.style.setProperty('--brand', t.primaryColor);
      root.style.setProperty('--brand-strong', ensureContrastWithWhite(t.primaryColor));
      root.style.setProperty('--accent', t.secondaryColor);
      root.style.setProperty('--accent-contrast', readableTextColor(t.secondaryColor));
      root.style.setProperty('--store-font', storeFontVar[t.font] ?? storeFontVar.cairo);
      for (const [attr, value] of [
        ['bannerTitle', t.bannerTitle],
        ['bannerSubtitle', t.bannerSubtitle],
      ] as const) {
        document.querySelectorAll<HTMLElement>(`[data-preview="${attr}"]`).forEach((el) => {
          el.textContent = value || el.dataset.fallback || '';
          el.hidden = !value && !el.dataset.fallback;
        });
      }
    }

    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return null;
}
