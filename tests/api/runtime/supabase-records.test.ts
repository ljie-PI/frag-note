import { describe, expect, it } from 'bun:test';
import {
  mapFragmentRow,
  mapAssetRow,
  mapRelationRow,
  mapDerivedObjectRow,
  mapAnswerRow,
  buildRelationRow,
  buildDerivedObjectRow,
  buildAssetRows,
} from '../../../apps/api/src/runtime/supabase-records.ts';
import {
  seedFragments,
  seedAsset,
  seedRelation,
  seedCandidate,
  seedAnswer,
} from '../../../packages/testing/src/fixtures.ts';

describe('mapFragmentRow', () => {
  it('maps snake_case DB row to camelCase domain object', () => {
    const row = {
      fragment_id: 'f1',
      user_id: 'u1',
      created_at: '2026-01-01',
      source_type: 'text',
      origin_kind: 'user_capture',
      title_optional: 'title',
      raw_text_optional: 'text',
      status: 'ready',
      device_metadata: { platform: 'desktop', captureMethod: 'test' },
      language_hint_optional: 'en',
    };
    const result = mapFragmentRow(row);
    expect(result.fragmentId).toBe('f1');
    expect(result.userId).toBe('u1');
    expect(result.titleOptional).toBe('title');
    expect(result.sourceType).toBe('text');
  });

  it('handles null fields', () => {
    const row = {
      fragment_id: 'f1',
      user_id: 'u1',
      created_at: '2026-01-01',
      source_type: 'text',
      origin_kind: 'user_capture',
      title_optional: null,
      raw_text_optional: null,
      status: 'ready',
      device_metadata: null,
      language_hint_optional: null,
    };
    const result = mapFragmentRow(row);
    expect(result.titleOptional).toBeNull();
    expect(result.rawTextOptional).toBeNull();
    expect(result.languageHintOptional).toBeNull();
  });
});

describe('mapAssetRow', () => {
  it('maps storage path correctly', () => {
    const row = {
      asset_id: 'a1',
      fragment_id: 'f1',
      asset_type: 'original',
      mime_type: 'image/png',
      storage_bucket: 'captures',
      storage_key: 'path/to/file.png',
      file_name_optional: 'file.png',
      checksum: 'sha256:abc',
      byte_size: 1024,
      created_at: '2026-01-01',
    };
    const result = mapAssetRow(row);
    expect(result.storagePath.bucket).toBe('captures');
    expect(result.storagePath.key).toBe('path/to/file.png');
    expect(result.byteSize).toBe(1024);
  });
});

describe('mapRelationRow', () => {
  it('converts confidence from basis points', () => {
    const row = {
      relation_id: 'r1',
      source_object_type: 'fragment',
      source_object_id: 's1',
      target_object_type: 'fragment',
      target_object_id: 't1',
      relation_type: 'similar_to',
      confidence_basis_points: 9200,
      explanation: 'test',
      created_at: '2026-01-01',
      algorithm_version: 'v1',
    };
    const result = mapRelationRow(row);
    expect(result.confidence).toBe(0.92);
    expect(result.algorithmVersion).toBe('v1');
  });

  it('handles missing algorithmVersion', () => {
    const row = {
      relation_id: 'r1',
      source_object_type: 'fragment',
      source_object_id: 's1',
      target_object_type: 'fragment',
      target_object_id: 't1',
      relation_type: 'similar_to',
      confidence_basis_points: 5000,
      explanation: 'test',
      created_at: '2026-01-01',
    };
    const result = mapRelationRow(row);
    expect(result.confidence).toBe(0.5);
    expect(result.algorithmVersion).toBeUndefined();
  });
});

describe('mapDerivedObjectRow', () => {
  it('handles arrays correctly', () => {
    const row = {
      object_id: 'o1',
      object_type: 'topic',
      status: 'candidate',
      title: 'Test',
      summary: 'Summary',
      key_entities: ['a', 'b'],
      citations: [{ fragmentId: 'f1' }],
      relation_edges: ['e1'],
      rule_version: 'v1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const result = mapDerivedObjectRow(row);
    expect(result.keyEntities).toEqual(['a', 'b']);
    expect(result.relationEdges).toEqual(['e1']);
  });
});

describe('mapAnswerRow', () => {
  it('provides provenance fallback when missing', () => {
    const row = {
      answer_id: 'a1',
      query_text: 'What is OCR?',
      query_type: 'natural_language',
      answer_body: 'OCR converts images to text',
      answer_format: 'summary',
      retrieval_bundle: [],
      model_metadata: {},
      citations: [],
      provenance: null,
      saved_as_fragment: false,
      created_at: '2026-01-01',
    };
    const result = mapAnswerRow(row);
    expect(result.provenance).toEqual({
      sourceQuery: 'What is OCR?',
      citedFragmentIds: [],
    });
  });
});

describe('buildRelationRow', () => {
  it('converts confidence to basis points', () => {
    const row = buildRelationRow('u1', seedRelation as any);
    expect(row.confidence_basis_points).toBe(9200);
    expect(row.user_id).toBe('u1');
  });
});

describe('buildDerivedObjectRow', () => {
  it('includes supportingFragmentCount', () => {
    const row = buildDerivedObjectRow('u1', seedCandidate as any, 5);
    expect(row.supporting_fragment_count).toBe(5);
    expect(row.user_id).toBe('u1');
  });
});

describe('buildAssetRows', () => {
  it('parses JSON rawText with assets', () => {
    const fragment = {
      ...seedFragments.topicCluster[0],
      rawTextOptional: JSON.stringify({
        assets: [{ fileName: 'test.png', mimeType: 'image/png', byteSize: 100 }],
      }),
    };
    const rows = buildAssetRows(fragment as any);
    expect(rows).toHaveLength(1);
    expect(rows[0].asset.mimeType).toBe('image/png');
  });

  it('returns empty for non-JSON rawText', () => {
    const fragment = { ...seedFragments.topicCluster[0] };
    const rows = buildAssetRows(fragment as any);
    expect(rows).toEqual([]);
  });

  it('returns empty for null rawText', () => {
    const fragment = { ...seedFragments.topicCluster[2] };
    const rows = buildAssetRows(fragment as any);
    expect(rows).toEqual([]);
  });

  it('returns empty for malformed JSON', () => {
    const fragment = {
      ...seedFragments.topicCluster[0],
      rawTextOptional: '{bad',
    };
    const rows = buildAssetRows(fragment as any);
    expect(rows).toEqual([]);
  });
});
