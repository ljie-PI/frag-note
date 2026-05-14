import { describe, expect, it } from 'bun:test';

const capturePalettePath = new URL(
  '../../apps/desktop/src/features/capture/CapturePalette.tsx',
  import.meta.url,
);

describe('CapturePalette draft publish guards', () => {
  it('uses skipNextDraftPublishRef instead of a microtask-reset remote guard', async () => {
    const source = await Bun.file(capturePalettePath).text();

    expect(source).toContain('skipNextDraftPublishRef.current = true;');
    expect(source).not.toContain('queueMicrotask');
    expect(source).not.toContain('isApplyingRemoteRef');
  });

  it('suppresses the initial empty draft publish after mount', async () => {
    const source = await Bun.file(capturePalettePath).text();

    expect(source).toContain('const isFirstPublishRef = useRef(true);');
    expect(source).toContain('if (isFirstPublishRef.current)');
    expect(source).toContain('isFirstPublishRef.current = false;');
  });
});
