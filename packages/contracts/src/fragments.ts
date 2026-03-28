import { fragmentSchema } from '@sui-note/domain';
import { z } from 'zod';

export const fragmentContractSchema = fragmentSchema.pick({
  fragmentId: true,
  userId: true,
  sourceType: true,
  originKind: true,
}).strict();

export type FragmentContract = z.infer<typeof fragmentContractSchema>;
