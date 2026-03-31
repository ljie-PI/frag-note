import { useRef, type ReactNode } from 'react';
import { Paperclip } from 'lucide-react';
import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function FileDropzone({
  assets,
  onAddAsset,
  children,
}: {
  assets: LocalAssetPointer[];
  onAddAsset: (asset: LocalAssetPointer) => void;
  children?: ReactNode;
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
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-colors hover:border-purple-300 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        void handleFiles(event.dataTransfer.files);
      }}
    >
      {children}
      <input
        hidden
        id="capture-file-input"
        multiple
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.currentTarget.value = '';
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}

FileDropzone.PickerButton = function PickerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
      onClick={onClick}
      title="添加文件"
      type="button"
    >
      <Paperclip size={18} />
    </button>
  );
};

async function toBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
