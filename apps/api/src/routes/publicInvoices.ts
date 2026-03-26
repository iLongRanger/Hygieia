import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getInvoiceByPublicToken } from '../services/invoiceService';

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
    res.json({ data: invoice });
  } catch (error) {
    next(error);
  }
});

export default router;
