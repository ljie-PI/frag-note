import { describe, expect, it } from 'bun:test';
import {
  createCaptureStore,
  createInMemoryDesktopAdapter,
} from '../../apps/desktop/src/features/capture/capture-store.ts';

describe('desktop capture store', () => {
  it('saves a local fragment immediately with queued_upload status', async () => {
    const adapter = createInMemoryDesktopAdapter();
    const store = createCaptureStore({ adapter });

    const fragment = await store.saveFragment({
      sourceType: 'text',
      rawText: 'OCR scratch note',
      titleOptional: 'OCR local capture',
    });

    expect(fragment.status).toBe('queued_upload');
    expect(fragment.rawTextOptional).toBe('OCR scratch note');

    const stored = await store.listFragments();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.fragmentId).toBe(fragment.fragmentId);
  });
});
