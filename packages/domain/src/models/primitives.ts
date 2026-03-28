import { z } from 'zod';

const ISO_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const isoUtcTimestampSchema = z.string().refine((value) => {
  if (!ISO_UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(value);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}, 'Expected a valid ISO-8601 UTC timestamp with millisecond precision');
