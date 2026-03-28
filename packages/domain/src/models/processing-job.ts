import { z } from 'zod';

export const processingJobSchema = z.object({
  jobId: z.string().uuid(),
  fragmentId: z.string().uuid(),
  jobType: z.string(),
  status: z.enum(['queued', 'running', 'failed', 'completed']),
  attemptCount: z.number().int().nonnegative(),
  provider: z.string(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});

export type ProcessingJob = z.infer<typeof processingJobSchema>;
