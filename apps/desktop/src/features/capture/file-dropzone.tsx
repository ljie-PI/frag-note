import { useRef } from 'react';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function FileDropzone({
  assets,
  onAddAsset,
}: {
  assets: LocalAssetPointer[];
  onAddAsset: (asset: LocalAssetPointer) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const pointers = await Promise.all(
      Array.from(files).map(async (file) => ({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        byteSize: file.size,
        base64Data: await toBase64(file),
      })),
    );

    for (const pointer of pointers) {
      onAddAsset(pointer);
    }
  };

  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <p>Drop files</p>
      <button
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        Choose Files
      </button>
      <input
        hidden
        multiple
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.currentTarget.value = '';
        }}
        ref={inputRef}
        type="file"
      />
      <ul>
        {assets.map((asset) => (
          <li key={`${asset.localPath ?? asset.base64Data ?? asset.fileName}-${asset.fileName}`}>
            {asset.fileName}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
