import type { DesktopAdapter } from '../features/capture/capture-store.ts';
import { createDesktopAdapter } from './desktop-adapter.ts';

export function createDesktopDb(): DesktopAdapter {
  return createDesktopAdapter();
}
