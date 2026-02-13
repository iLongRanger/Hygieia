import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errorHandler';

/**
 * Express middleware that validates request against a Zod schema.
 * The schema should have `body`, `query`, and/or `params` keys.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      throw new ValidationError(firstError.message, {
        field: firstError.path.join('.'),
        errors: result.error.errors.map((e: ZodError['errors'][number]) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Replace req fields with parsed data
    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query;
    if (result.data.params) req.params = result.data.params;

    next();
  };
}
