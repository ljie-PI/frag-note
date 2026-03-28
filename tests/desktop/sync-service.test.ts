import { describe, expect, it } from 'bun:test';
import {
  createCaptureStore,
  createInMemoryDesktopAdapter,
} from '../../apps/desktop/src/features/capture/capture-store.ts';
import { createSyncService } from '../../apps/desktop/src/features/sync/sync-service.ts';

describe('desktop sync service', () => {
  it('uploads queued fragments and writes back processing results', async () => {
    const adapter = createInMemoryDesktopAdapter();
    const store = createCaptureStore({ adapter });

    const fragment = await store.saveFragment({
      sourceType: 'text',
      rawText: 'OCR note for sync',
      titleOptional: 'OCR sync',
    });

    const syncService = createSyncService({
      store,
      apiClient: {
        async ingestFragment(payload) {
          return {
            fragmentId: payload.fragmentId,
            status: 'processing',
          };
        },
        async getFragmentDetail(fragmentId) {
          return {
            fragment: {
              fragmentId,
              userId: '99999999-9999-4999-8999-999999999999',
              createdAt: '2026-03-28T10:00:00.000Z',
              sourceType: 'text',
              originKind: 'user_capture',
              titleOptional: 'OCR sync',
              rawTextOptional: 'OCR note for sync',
              status: 'ready',
              deviceMetadata: {
                platform: 'desktop',
                captureMethod: 'palette_text',
                appVersion: '0.1.0',
                deviceName: 'desktop',
              },
              languageHintOptional: 'en',
            },
            assets: [],
            derivedArtifacts: [
              {
                artifactId: '44444444-4444-4444-8444-444444444444',
                fragmentId,
                artifactType: 'summary',
                version: 'v1',
                content: {
                  text: 'OCR note for sync',
                },
                providerMetadata: {
                  provider: 'in-memory',
                  model: 'heuristic',
                },
                createdAt: '2026-03-28T10:01:00.000Z',
                citations: [
                  {
                    fragmentId,
                    locator: {
                      kind: 'text_span',
                      value: '0:42',
                    },
                    supportPath: 'direct',
                  },
                ],
              },
            ],
            relatedFragments: [],
            processingJobs: [],
          };
        },
      },
    });

    await syncService.flushQueue();

    const stored = await store.getFragment(fragment.fragmentId);
    expect(stored?.fragment.status).toBe('ready');
    expect(stored?.derivedArtifacts[0]?.artifactType).toBe('summary');
  });
});
