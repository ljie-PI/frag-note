import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export type RegionScreenshotPayload = {
  base64Data: string;
  width: number;
  height: number;
  mimeType: string;
  requestId?: string | null;
  targetLabel?: string | null;
};

export type RegionScreenshotCancelledPayload = {
  requestId?: string | null;
  targetLabel?: string | null;
};

let requestSequence = 0;

export async function requestRegionScreenshot(): Promise<LocalAssetPointer | null> {
  const requestId = `region-screenshot-${Date.now()}-${++requestSequence}`;
  const targetLabel = getCurrentWindow().label;

  return new Promise((resolve) => {
    let resolved = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const resolveOnce = (asset: LocalAssetPointer | null) => {
      if (resolved) return;
      resolved = true;
      if (timeout) clearTimeout(timeout);
      void unlistenCaptured.then((fn) => fn());
      void unlistenCancelled.then((fn) => fn());
      resolve(asset);
    };

    const unlistenCaptured = listen<RegionScreenshotPayload>(
      'screenshot-captured',
      (event) => {
        if (event.payload.requestId !== requestId) return;
        resolveOnce(screenshotPayloadToAsset(event.payload));
      },
    );

    const unlistenCancelled = listen<RegionScreenshotCancelledPayload>(
      'screenshot-cancelled',
      (event) => {
        if (event.payload?.requestId !== requestId) return;
        resolveOnce(null);
      },
    );

    timeout = setTimeout(() => resolveOnce(null), 60_000);

    void Promise.all([unlistenCaptured, unlistenCancelled])
      .then(() => invoke('show_screenshot_overlay', { requestId, targetLabel }))
      .catch((error) => {
        console.error('Failed to request region screenshot', error);
        resolveOnce(null);
      });
  });
}

export function screenshotPayloadToAsset(
  payload: RegionScreenshotPayload,
): LocalAssetPointer {
  return {
    fileName: `screenshot-${Date.now()}.png`,
    mimeType: payload.mimeType,
    byteSize: byteSizeForBase64(payload.base64Data),
    base64Data: payload.base64Data,
  };
}

function byteSizeForBase64(base64Data: string) {
  const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
  return (base64Data.length / 4) * 3 - padding;
}
