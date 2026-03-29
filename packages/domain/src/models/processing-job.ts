import { z } from 'zod';
import { isoUtcTimestampSchema } from './primitives.ts';

export const processingJobSchema = z.strictObject({
  jobId: z.string().uuid(),
  fragmentId: z.string().uuid(),
  jobType: z.string(),
  status: z.enum(['queued', 'running', 'failed', 'completed']),
  attemptCount: z.number().int().nonnegative(),
  provider: z.string(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  claimedAt: isoUtcTimestampSchema.nullable(),
  leaseExpiresAt: isoUtcTimestampSchema.nullable(),
  startedAt: isoUtcTimestampSchema.nullable(),
  completedAt: isoUtcTimestampSchema.nullable(),
});

export type ProcessingJob = z.infer<typeof processingJobSchema>;
