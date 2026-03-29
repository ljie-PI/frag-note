import { buildApp } from '../../../apps/api/src/app.js';
import { createTestAuthResolver, createTestRuntime } from './test-runtime.js';

export function createTestApp() {
  return buildApp({
    runtime: createTestRuntime(),
    authResolver: createTestAuthResolver(),
  });
}
