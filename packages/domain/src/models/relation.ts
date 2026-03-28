import { z } from 'zod';
import { isoUtcTimestampSchema } from './primitives.ts';

export const relationObjectTypeSchema = z.enum([
  'fragment',
  'artifact',
  'derived_object',
  'answer',
]);

export const relationSchema = z.strictObject({
  relationId: z.string().uuid(),
  sourceObjectType: relationObjectTypeSchema,
  sourceObjectId: z.string().uuid(),
  targetObjectType: relationObjectTypeSchema,
  targetObjectId: z.string().uuid(),
  relationType: z.string(),
  confidence: z.number(),
  explanation: z.string(),
  createdAt: isoUtcTimestampSchema,
  algorithmVersion: z.string().optional(),
});

export type Relation = z.infer<typeof relationSchema>;
