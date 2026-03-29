export type LocalAssetPointer = {
  fileName: string;
  localPath?: string;
  mimeType: string;
  byteSize?: number;
  base64Data?: string;
};

export function persistLocalAssetPointer(
  asset: LocalAssetPointer,
  existingAssets: LocalAssetPointer[],
) {
  return [...existingAssets, asset];
}
