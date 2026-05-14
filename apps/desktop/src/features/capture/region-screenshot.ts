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
const REGION_SCREENSHOT_TIMEOUT_MS = 60_000;

export async function requestRegionScreenshot(): Promise<LocalAssetPointer | null> {
  return requestRegionScreenshotWithTimeout(REGION_SCREENSHOT_TIMEOUT_MS);
}

export async function requestRegionScreenshotWithTimeout(
  timeoutMs: number,
): Promise<LocalAssetPointer | null> {
  const callerWindow = getCurrentWindow();
  const callerLabel = callerWindow.label;
  const wasVisible = (await callerWindow.isVisible?.().catch(() => false)) ?? false;
  const requestId = `region-screenshot-${Date.now()}-${++requestSequence}`;
  const targetLabel = callerLabel;

  return new Promise((resolve) => {
    let resolved = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cleanupListeners = () => {
      void unlistenCaptured.then((fn) => fn());
      void unlistenCancelled.then((fn) => fn());
    };

    const restoreCaller = async () => {
      if (!wasVisible) return;

      try {
        await callerWindow.show();
        await callerWindow.setFocus();
      } catch (error) {
        console.error('Failed to restore caller window after region screenshot', error);
      }
    };

    const resolveOnce = async (asset: LocalAssetPointer | null) => {
      if (resolved) return;
      resolved = true;
      if (timeout) clearTimeout(timeout);
      cleanupListeners();
      await restoreCaller();
      resolve(asset);
    };

    const resolveTimedOut = async () => {
      if (resolved) return;
      resolved = true;
      if (timeout) clearTimeout(timeout);
      await invoke('hide_screenshot_overlay').catch(() => {});
      cleanupListeners();
      await restoreCaller();
      resolve(null);
    };

    const unlistenCaptured = listen<RegionScreenshotPayload>(
      'screenshot-captured',
      (event) => {
        if (event.payload.requestId !== requestId) return;
        void resolveOnce(screenshotPayloadToAsset(event.payload));
      },
    );

    const unlistenCancelled = listen<RegionScreenshotCancelledPayload>(
      'screenshot-cancelled',
      (event) => {
        if (event.payload?.requestId !== requestId) return;
        void resolveOnce(null);
      },
    );

    timeout = setTimeout(() => {
      void resolveTimedOut();
    }, timeoutMs);

    void Promise.all([unlistenCaptured, unlistenCancelled])
      .then(async () => {
        if (wasVisible) {
          await callerWindow.hide().catch((error) => {
            console.error('Failed to hide caller window before region screenshot', error);
          });
        }
        await invoke('show_screenshot_overlay', { requestId, targetLabel });
      })
      .catch((error) => {
        console.error('Failed to request region screenshot', error);
        void resolveOnce(null);
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
