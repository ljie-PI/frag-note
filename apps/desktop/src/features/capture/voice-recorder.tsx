import { useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function VoiceRecorder({
  onRecorded,
}: {
  onRecorded: (asset: LocalAssetPointer) => void;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  return (
    <button
      onClick={async () => {
        if (
          typeof navigator !== 'undefined' &&
          navigator.mediaDevices?.getUserMedia &&
          typeof MediaRecorder !== 'undefined'
        ) {
          if (!recording) {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            const mediaRecorder = new MediaRecorder(stream);
            chunksRef.current = [];
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunksRef.current.push(event.data);
              }
            };
            mediaRecorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, {
                type: mediaRecorder.mimeType || 'audio/webm',
              });
              onRecorded({
                fileName: `voice-${Date.now()}.webm`,
                mimeType: blob.type || 'audio/webm',
                byteSize: blob.size,
                base64Data: await blobToBase64(blob),
              });
              stream.getTracks().forEach((track) => track.stop());
              chunksRef.current = [];
              mediaRecorderRef.current = null;
            };
            mediaRecorder.start();
            setRecording(true);
            return;
          }

          mediaRecorderRef.current?.stop();
          setRecording(false);
          return;
        }

        const localPath =
          typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
            ? await invoke<string>('create_voice_placeholder')
            : '/tmp/placeholder-voice.webm';
        onRecorded({
          fileName: 'placeholder-voice.webm',
          localPath,
          mimeType: 'audio/webm',
        });
      }}
      type="button"
    >
      {recording ? 'Stop Recording' : 'Record Voice'}
    </button>
  );
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
