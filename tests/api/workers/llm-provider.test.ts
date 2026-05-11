import { describe, expect, it } from 'bun:test';
import { generateSummaryAndTags } from '../../../apps/api/src/workers/providers/llm-provider.ts';
import type { Fragment } from '@frag-note/domain';

function makeFragment(rawText: string | null, title: string | null = null): Fragment {
  return {
    fragmentId: 'f1',
    userId: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    sourceType: 'text',
    originKind: 'user_capture',
    titleOptional: title,
    rawTextOptional: rawText,
    status: 'ready',
    deviceMetadata: { platform: 'desktop', captureMethod: 'test' },
    languageHintOptional: 'en',
  };
}

describe('generateSummaryAndTags', () => {
  it('generates summary from fragment text', () => {
    const result = generateSummaryAndTags(makeFragment('OCR helps convert screenshots into searchable text'));
    expect(result.summary).toBe('OCR helps convert screenshots into searchable text');
  });

  it('tags are first 5 keywords', () => {
    const result = generateSummaryAndTags(
      makeFragment('alpha bravo charlie delta echo foxtrot golf hotel'),
    );
    expect(result.tags).toHaveLength(5);
    expect(result.tags).toEqual(result.embeddingKeywords.slice(0, 5));
  });

  it('embeddingKeywords contains all keywords', () => {
    const result = generateSummaryAndTags(
      makeFragment('alpha bravo charlie delta echo foxtrot golf hotel'),
    );
    expect(result.embeddingKeywords.length).toBeGreaterThanOrEqual(result.tags.length);
  });

  it('uses title fallback when text is empty', () => {
    const result = generateSummaryAndTags(makeFragment(null, 'My Title'));
    expect(result.summary).toContain('My Title');
  });
});
