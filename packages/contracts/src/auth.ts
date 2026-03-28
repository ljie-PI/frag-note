import { z } from 'zod';

export const createDeviceSessionRequestSchema = z.strictObject({});

export const createDeviceSessionResponseSchema = z.strictObject({
  userId: z.string().uuid(),
  deviceSessionId: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
});

export type CreateDeviceSessionRequest = z.infer<
  typeof createDeviceSessionRequestSchema
>;
export type CreateDeviceSessionResponse = z.infer<
  typeof createDeviceSessionResponseSchema
>;
