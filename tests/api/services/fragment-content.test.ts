import { describe, expect, it } from 'bun:test';
import {
  parseFragmentPayload,
  extractFragmentSearchText,
} from '../../../apps/api/src/services/fragment-content.ts';
import type { Fragment } from '@frag-note/domain';

const baseFragment: Fragment = {
  fragmentId: 'f1',
  userId: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  sourceType: 'text',
  originKind: 'user_capture',
  titleOptional: null,
  rawTextOptional: null,
  status: 'ready',
  deviceMetadata: { platform: 'desktop', captureMethod: 'supabase_direct' },
  languageHintOptional: 'en',
};

describe('parseFragmentPayload', () => {
  it('returns empty for null input', () => {
    expect(parseFragmentPayload(null)).toEqual({ rawText: null, assets: [] });
  });

  it('returns empty for undefined input', () => {
    expect(parseFragmentPayload(undefined)).toEqual({ rawText: null, assets: [] });
  });

  it('returns rawText as-is for plain string (non-JSON)', () => {
    const result = parseFragmentPayload('hello world');
    expect(result).toEqual({ rawText: 'hello world', assets: [] });
  });

  it('extracts assets from valid JSON', () => {
    const payload = JSON.stringify({
      rawText: 'some text',
      assets: [{ fileName: 'test.png', mimeType: 'image/png' }],
    });
    const result = parseFragmentPayload(payload);
    expect(result.rawText).toBe('some text');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].fileName).toBe('test.png');
  });

  it('returns rawText string and empty assets when JSON has no assets array', () => {
    const payload = JSON.stringify({ rawText: 'text only' });
    const result = parseFragmentPayload(payload);
    expect(result.rawText).toBe(payload);
    expect(result.assets).toEqual([]);
  });

  it('returns rawText as-is for malformed JSON', () => {
    const result = parseFragmentPayload('{bad json');
    expect(result).toEqual({ rawText: '{bad json', assets: [] });
  });

  it('filters out assets missing fileName or mimeType', () => {
    const payload = JSON.stringify({
      rawText: 'text',
      assets: [
        { fileName: 'good.png', mimeType: 'image/png' },
        { fileName: 'no-mime' },
        { mimeType: 'image/png' },
        {},
      ],
    });
    const result = parseFragmentPayload(payload);
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].fileName).toBe('good.png');
  });
});

describe('extractFragmentSearchText', () => {
  it('joins title and rawText', () => {
    const result = extractFragmentSearchText({
      ...baseFragment,
      titleOptional: 'My Title',
      rawTextOptional: 'body text',
    });
    expect(result).toBe('My Title body text');
  });

  it('returns title only when no rawText', () => {
    const result = extractFragmentSearchText({
      ...baseFragment,
      titleOptional: 'Title',
      rawTextOptional: null,
    });
    expect(result).toBe('Title');
  });

  it('returns rawText only when no title', () => {
    const result = extractFragmentSearchText({
      ...baseFragment,
      rawTextOptional: 'just text',
    });
    expect(result).toBe('just text');
  });

  it('returns empty string when both are null', () => {
    const result = extractFragmentSearchText(baseFragment);
    expect(result).toBe('');
  });
});
