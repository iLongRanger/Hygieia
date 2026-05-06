import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import type { ZodError } from 'zod';
import { authenticate } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import {
  completePhotoUploadSchema,
  createPhotoUploadSchema,
  listPhotoAssetsQuerySchema,
  updatePhotoAssetSchema,
} from '../schemas/photoAsset';
import {
  archivePhotoAsset,
  completePhotoUpload,
  createPhotoUpload,
  createPhotoViewUrl,
  listPhotoAssets,
  updatePhotoAsset,
} from '../services/photoStorageService';

const router: Router = Router();

function handleZodError(error: ZodError): ValidationError {
  const firstError = error.errors[0];
  return new ValidationError(firstError.message, {
    field: firstError.path.join('.'),
    errors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  });
}

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listPhotoAssetsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw handleZodError(parsed.error);
    if (!req.user) throw new ValidationError('User not authenticated');

    const photos = await listPhotoAssets(req.user, parsed.data);
    res.json({ data: photos });
  } catch (error) {
    next(error);
  }
});

router.post('/upload-url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPhotoUploadSchema.safeParse(req.body);
    if (!parsed.success) throw handleZodError(parsed.error);
    if (!req.user) throw new ValidationError('User not authenticated');

    const result = await createPhotoUpload(req.user, parsed.data);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/complete', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = completePhotoUploadSchema.safeParse(req.body);
    if (!parsed.success) throw handleZodError(parsed.error);
    if (!req.user) throw new ValidationError('User not authenticated');

    const photo = await completePhotoUpload(req.user, req.params.id, parsed.data.sizeBytes);
    res.json({ data: photo });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updatePhotoAssetSchema.safeParse(req.body);
    if (!parsed.success) throw handleZodError(parsed.error);
    if (!req.user) throw new ValidationError('User not authenticated');

    const photo = await updatePhotoAsset(req.user, req.params.id, parsed.data);
    res.json({ data: photo });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/view-url', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new ValidationError('User not authenticated');
    const result = await createPhotoViewUrl(req.user, req.params.id);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new ValidationError('User not authenticated');
    const photo = await archivePhotoAsset(req.user, req.params.id);
    res.json({ data: photo });
  } catch (error) {
    next(error);
  }
});

export default router;
