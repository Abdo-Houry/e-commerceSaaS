import type { StoreFont, StoreTemplate } from '@matjari/shared';

export const PREVIEW_MESSAGE = 'matjari:preview';
export const PREVIEW_READY = 'matjari:preview-ready';

export interface PreviewTheme {
  template: StoreTemplate;
  primaryColor: string;
  secondaryColor: string;
  font: StoreFont;
  bannerTitle: string | null;
  bannerSubtitle: string | null;
}

export interface PreviewMessage {
  type: typeof PREVIEW_MESSAGE;
  theme: PreviewTheme;
}
