import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function ScreenshotButton({
  onCaptured,
}: {
  onCaptured: (asset: LocalAssetPointer) => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);

        try {
          const captured = await captureScreenshot();
          onCaptured(captured);
        } finally {
          setBusy(false);
        }
      }}
      type="button"
    >
      {busy ? 'Capturing…' : 'Screenshot'}
    </button>
  );
}

async function captureScreenshot(): Promise<LocalAssetPointer> {
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

  const localPath =
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
      ? await invoke<string>('create_screenshot_placeholder')
      : '/tmp/placeholder-screenshot.png';

  return {
    fileName: 'placeholder-screenshot.png',
    localPath,
    mimeType: 'image/png',
  };
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
