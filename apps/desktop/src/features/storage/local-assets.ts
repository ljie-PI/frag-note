export type LocalAssetPointer = {
  fileName: string;
  localPath: string;
  mimeType: string;
};

export function persistLocalAssetPointer(
  asset: LocalAssetPointer,
  existingAssets: LocalAssetPointer[],
) {
  return [...existingAssets, asset];
}
