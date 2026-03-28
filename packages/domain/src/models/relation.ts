import { z } from 'zod';

export const relationObjectTypeSchema = z.enum([
  'fragment',
  'artifact',
  'derived_object',
  'answer',
]);

export const relationSchema = z.object({
  relationId: z.string().uuid(),
  sourceObjectType: relationObjectTypeSchema,
  sourceObjectId: z.string().uuid(),
  targetObjectType: relationObjectTypeSchema,
  targetObjectId: z.string().uuid(),
  relationType: z.string(),
  confidence: z.number(),
  explanation: z.string(),
  algorithmVersion: z.string().optional(),
});

export type Relation = z.infer<typeof relationSchema>;
