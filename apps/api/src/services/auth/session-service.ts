import { randomUUID } from 'node:crypto';

export interface DeviceSessionIdentity {
  userId: string;
  deviceSessionId: string;
  createdAt: string;
}

export function createDeviceSession(): DeviceSessionIdentity {
  return {
    userId: randomUUID(),
    deviceSessionId: randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
