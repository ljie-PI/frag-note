import type { AppState } from './app-state.js';
import { updateDerivedObjectStatus } from './derived-objects.js';

export function confirmDerivedObject(state: AppState, objectId: string) {
  return updateDerivedObjectStatus(state, objectId, 'confirmed');
}

export function dismissDerivedObject(state: AppState, objectId: string) {
  return updateDerivedObjectStatus(state, objectId, 'dismissed');
}

export function postponeDerivedObject(state: AppState, objectId: string) {
  return updateDerivedObjectStatus(state, objectId, 'postponed');
}
