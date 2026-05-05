import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { getInvoiceByPublicToken } from '../services/invoiceService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';
import { publicTokenRateLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

router.use(publicTokenRateLimiter);

// Get invoice by public token
router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await getInvoiceByPublicToken(req.params.token);
    const branding = await getGlobalSettings().catch(() => getDefaultBranding());
    res.json({ data: invoice, branding });
  } catch (error) {
    next(error);
  }
});

export default router;
