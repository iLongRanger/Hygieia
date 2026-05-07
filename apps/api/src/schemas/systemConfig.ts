import { z } from 'zod';

export const importSystemConfigurationSchema = z.object({
  data: z.record(z.unknown()),
  dryRun: z.boolean().optional().default(false),
});

export type ImportSystemConfigurationInput = z.infer<
  typeof importSystemConfigurationSchema
>;
