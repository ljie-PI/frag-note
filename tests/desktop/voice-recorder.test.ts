import { describe, expect, it } from 'bun:test';
import { resolveAudioAssetMime } from '../../apps/desktop/src/features/capture/use-voice-recorder.ts';

describe('resolveAudioAssetMime', () => {
  it('keeps the recorder MIME type and webm extension when MediaRecorder reports webm codecs', () => {
    const metadata = resolveAudioAssetMime('audio/webm; codecs=opus', '');

    expect(metadata.mimeType).toBe('audio/webm; codecs=opus');
    expect(metadata.extension).toBe('.webm');
  });

  it('uses the webm audio fallback and extension when MediaRecorder reports an empty MIME type', () => {
    const metadata = resolveAudioAssetMime('', '');

    expect(metadata.mimeType).toBe('audio/webm');
    expect(metadata.extension).toBe('.webm');
  });
});
