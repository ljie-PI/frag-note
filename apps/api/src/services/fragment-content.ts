import type { Fragment } from '@sui-note/domain';

export type FragmentAssetPointer = {
  fileName: string;
  localPath?: string;
  storageKey?: string;
  storageBucket?: string;
  mimeType: string;
  byteSize?: number;
  base64Data?: string;
};

type ParsedFragmentPayload = {
  rawText: string | null;
  assets: FragmentAssetPointer[];
};

export function parseFragmentPayload(
  rawText: string | null | undefined,
): ParsedFragmentPayload {
  if (!rawText) {
    return {
      rawText: null,
      assets: [],
    };
  }

  try {
    const parsed = JSON.parse(rawText) as {
      rawText?: unknown;
      assets?: unknown;
    };

    if (!Array.isArray(parsed.assets)) {
      return {
        rawText,
        assets: [],
      };
    }

    return {
      rawText:
        typeof parsed.rawText === 'string' && parsed.rawText.trim().length > 0
          ? parsed.rawText
          : null,
      assets: parsed.assets
        .filter(
          (asset): asset is FragmentAssetPointer =>
            Boolean(
              asset &&
                typeof asset === 'object' &&
                typeof (asset as { fileName?: unknown }).fileName === 'string' &&
                typeof (asset as { mimeType?: unknown }).mimeType === 'string',
            ),
        )
        .map((asset) => ({
          fileName: asset.fileName,
          localPath:
            typeof asset.localPath === 'string' ? asset.localPath : undefined,
          storageKey:
            typeof asset.storageKey === 'string' ? asset.storageKey : undefined,
          storageBucket:
            typeof asset.storageBucket === 'string'
              ? asset.storageBucket
              : undefined,
          mimeType: asset.mimeType,
          byteSize:
            typeof asset.byteSize === 'number' && Number.isFinite(asset.byteSize)
              ? asset.byteSize
              : undefined,
          base64Data:
            typeof asset.base64Data === 'string' ? asset.base64Data : undefined,
        })),
    };
  } catch {
    return {
      rawText,
      assets: [],
    };
  }
}

export function extractFragmentSearchText(fragment: Fragment): string {
  const parsed = parseFragmentPayload(fragment.rawTextOptional);

  return [fragment.titleOptional, parsed.rawText]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
}
