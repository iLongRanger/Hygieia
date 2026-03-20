import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import rateLimit from 'express-rate-limit';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';
import {
  acceptResidentialQuotePublic,
  declineResidentialQuotePublic,
  getResidentialQuoteByPublicToken,
  markResidentialQuotePublicViewed,
} from '../services/residentialService';
import {
  publicAcceptResidentialQuoteSchema,
  publicDeclineResidentialQuoteSchema,
} from '../schemas/residential';
import { getDefaultBranding, getGlobalSettings } from '../services/globalSettingsService';

const router: Router = Router();

const publicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests, please try again later.' },
});

router.use(publicRateLimiter);

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

async function getBrandingSafe() {
  try {
    return await getGlobalSettings();
  } catch {
    return getDefaultBranding();
  }
}

router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quote = await getResidentialQuoteByPublicToken(req.params.token);
    if (!quote) {
      throw new NotFoundError('Residential quote not found or link has expired');
    }

    await markResidentialQuotePublicViewed(req.params.token, req.ip);
    const branding = await getBrandingSafe();
    res.json({ data: quote, branding });
  } catch (error) {
    next(error);
  }
});

router.post('/:token/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = publicAcceptResidentialQuoteSchema.safeParse(req.body);
    if (!parsed.success) throw handleZodError(parsed.error);

    const result = await acceptResidentialQuotePublic(req.params.token, parsed.data.signatureName, req.ip);
    res.json({
      data: result.quote,
      message: result.acceptedNow
        ? 'Residential quote accepted successfully'
        : 'Residential quote already accepted',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:token/decline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = publicDeclineResidentialQuoteSchema.safeParse(req.body);
    if (!parsed.success) throw handleZodError(parsed.error);

    const result = await declineResidentialQuotePublic(req.params.token, parsed.data.reason, req.ip);
    res.json({
      data: result.quote,
      message: result.declinedNow
        ? 'Residential quote declined'
        : 'Residential quote already declined',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
