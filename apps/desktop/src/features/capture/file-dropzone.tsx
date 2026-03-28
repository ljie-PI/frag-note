import type { LocalAssetPointer } from '../storage/local-assets.ts';

export function FileDropzone({
  assets,
  onAddAsset,
}: {
  assets: LocalAssetPointer[];
  onAddAsset: (asset: LocalAssetPointer) => void;
}) {
  return (
    <section>
      <p>Drop files</p>
      <button
        onClick={() =>
          onAddAsset({
            fileName: 'placeholder.pdf',
            localPath: '/tmp/placeholder.pdf',
            mimeType: 'application/pdf',
          })
        }
        type="button"
      >
        Add File Placeholder
      </button>
      <ul>
        {assets.map((asset) => (
          <li key={`${asset.localPath}-${asset.fileName}`}>{asset.fileName}</li>
        ))}
      </ul>
    </section>
  );
}
