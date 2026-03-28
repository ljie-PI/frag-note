import { z } from 'zod';

export const isoUtcTimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    'Expected an ISO-8601 UTC timestamp with millisecond precision',
  );
