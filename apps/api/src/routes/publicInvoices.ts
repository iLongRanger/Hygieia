import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getInvoiceByPublicToken } from '../services/invoiceService';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';

const router: Router = Router();

// Rate limiting for public endpoints
const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { message: 'Too many requests, please try again later.' },
});

router.use(publicRateLimiter);

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
