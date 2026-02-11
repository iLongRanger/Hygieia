import { z } from 'zod';

export const publicAcceptSchema = z.object({
  signatureName: z.string().min(1, 'Signature name is required').max(255),
});

export const publicRejectSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(5000),
});

export type PublicAcceptInput = z.infer<typeof publicAcceptSchema>;
export type PublicRejectInput = z.infer<typeof publicRejectSchema>;
