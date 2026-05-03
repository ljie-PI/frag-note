import { useCallback, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function useVoiceRecorder(onRecorded: (asset: LocalAssetPointer) => void) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    ) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = async () => {
        // WKWebView records audio/mp4; Chromium/WebView2 records audio/webm;
        // some runtimes leave recorder.mimeType empty when no type is requested.
        const recorderMime = mediaRecorder.mimeType;
        const blob = new Blob(chunksRef.current, {
          type: recorderMime || 'audio/webm',
        });
        const metadata = resolveAudioAssetMime(recorderMime, blob.type);
        onRecorded({
          fileName: `voice-${Date.now()}${metadata.extension}`,
          mimeType: metadata.mimeType,
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

    // Fallback: Tauri placeholder
    const localPath =
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
        ? await invoke<string>('create_voice_placeholder')
        : '/tmp/placeholder-voice.webm';
    onRecorded({
      fileName: 'placeholder-voice.webm',
      localPath,
      mimeType: 'audio/webm',
    });
  }, [onRecorded]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (recording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  return { recording, startRecording, stopRecording, toggleRecording };
}

function audioExtensionForMimeType(mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.startsWith('audio/webm')) {
    return '.webm';
  }

  if (normalizedMimeType.startsWith('audio/mp4')) {
    return '.m4a';
  }

  if (normalizedMimeType.startsWith('audio/ogg')) {
    return '.ogg';
  }

  return '.bin';
}

export function resolveAudioAssetMime(recorderMime: string, blobType: string) {
  const mimeType = recorderMime || blobType || 'audio/webm';

  return {
    mimeType,
    extension: audioExtensionForMimeType(mimeType),
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
