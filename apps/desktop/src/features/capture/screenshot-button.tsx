import { useState } from 'react';
import { Camera } from 'lucide-react';
import type { LocalAssetPointer } from '../storage/local-assets.ts';
import { requestRegionScreenshot } from './region-screenshot.ts';

export function ScreenshotButton({
  onCaptured,
}: {
  onCaptured: (asset: LocalAssetPointer) => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      disabled={busy}
      onClick={async () => {
        setBusy(true);

        try {
          const captured = await captureScreenshot();
          if (captured) {
            onCaptured(captured);
          }
        } finally {
          setBusy(false);
        }
      }}
      title="截图"
      type="button"
    >
      <Camera size={18} />
    </button>
  );
}

export async function captureScreenshot(): Promise<LocalAssetPointer | null> {
  if (hasTauriRuntime()) {
    return requestRegionScreenshot();
  }

  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });

    try {
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('2D canvas context is unavailable');
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );

      if (!blob) {
        throw new Error('Failed to create screenshot blob');
      }

      return {
        fileName: `screenshot-${Date.now()}.png`,
        mimeType: 'image/png',
        byteSize: blob.size,
        base64Data: await blobToBase64(blob),
      };
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }
  }

  return null;
}

function hasTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
