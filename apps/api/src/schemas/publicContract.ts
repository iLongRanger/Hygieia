import { z } from 'zod';

export const publicSignContractSchema = z.object({
  signedByName: z.string().min(1, 'Signer name is required').max(255),
  signedByEmail: z.string().email('Valid email is required'),
});

export type PublicSignContractInput = z.infer<typeof publicSignContractSchema>;
