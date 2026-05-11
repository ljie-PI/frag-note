import type { PipelineStep } from '../processing-pipeline.js';
import { mapAssetRow } from '../../runtime/supabase-records.js';

export const fetchAssetsStep: PipelineStep = {
  name: 'fetch-assets',
  async execute(ctx) {
    const assetResponse = await ctx.serviceClient
      .from('assets')
      .select('*')
      .eq('fragment_id', ctx.fragment.fragmentId);

    if (assetResponse.error) {
      throw new Error(assetResponse.error.message);
    }

    ctx.assets = await Promise.all(
      (assetResponse.data ?? []).map(async (row) => {
        const mapped = mapAssetRow(row);
        const download = await ctx.serviceClient.storage
          .from(mapped.storagePath.bucket)
          .download(mapped.storagePath.key);

        if (download.error) {
          throw new Error(`Failed to download asset ${mapped.storagePath.key}: ${download.error.message}`);
        }

        return {
          fileName:
            mapped.fileNameOptional ??
            mapped.storagePath.key.split('/').at(-1) ??
            'asset.bin',
          storageKey: mapped.storagePath.key,
          storageBucket: mapped.storagePath.bucket,
          mimeType: mapped.mimeType,
          byteSize: mapped.byteSize,
          bytes: download.data ?? undefined,
        };
      }),
    );
  },
};
