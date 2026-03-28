import { z } from 'zod';

export const fragmentContractSchema = z.object({
  fragmentId: z.string().uuid(),
  userId: z.string().uuid(),
  sourceType: z.enum([
    'text',
    'image',
    'link',
    'screenshot',
    'pdf',
    'voice',
    'answer',
  ]),
  originKind: z.enum(['user_capture', 'answer_promotion']),
});

export type FragmentContract = z.infer<typeof fragmentContractSchema>;
