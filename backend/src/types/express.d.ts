import 'express';
import type { AccessInfo } from '@matjari/shared';

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. */
      userId?: string;
      /** Set by `requireStore` — every merchant query must be scoped by it. */
      storeId?: string;
      /** Set by `requireStore` — subscription access for the store. */
      access?: AccessInfo;
    }
  }
}
