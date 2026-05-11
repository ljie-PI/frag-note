import { describe, expect, it } from 'bun:test';
import { tokenizeText, summarizeText } from '../../../apps/api/src/services/text-utils.ts';

describe('tokenizeText', () => {
  it('splits text into lowercase tokens of length >= 3', () => {
    expect(tokenizeText('Hello World')).toEqual(['hello', 'world']);
  });

  it('filters out tokens shorter than 3 characters', () => {
    expect(tokenizeText('I am OK hi yes')).toEqual(['yes']);
  });

  it('removes stop words', () => {
    expect(tokenizeText('the note about later')).toEqual([]);
  });

  it('deduplicates tokens', () => {
    expect(tokenizeText('test test Test')).toEqual(['test']);
  });

  it('handles null and undefined values', () => {
    expect(tokenizeText(null, undefined, 'valid')).toEqual(['valid']);
  });

  it('joins multiple string arguments', () => {
    expect(tokenizeText('hello', 'world')).toEqual(['hello', 'world']);
  });

  it('splits on non-alphanumeric characters', () => {
    expect(tokenizeText('hello-world_foo.bar')).toEqual(['hello', 'world', 'foo', 'bar']);
  });
});

describe('summarizeText', () => {
  it('returns short text as-is', () => {
    expect(summarizeText('Short text')).toBe('Short text');
  });

  it('returns text at exactly 120 chars as-is', () => {
    const text = 'x'.repeat(120);
    expect(summarizeText(text)).toBe(text);
  });

  it('truncates text longer than 120 chars', () => {
    const text = 'a'.repeat(200);
    const result = summarizeText(text);
    expect(result).toBe('a'.repeat(117) + '...');
    expect(result.length).toBe(120);
  });

  it('returns fallback with title when text is empty', () => {
    expect(summarizeText('', 'My Title')).toBe('Captured fragment for My Title');
  });

  it('returns generic fallback when text is empty and no title', () => {
    expect(summarizeText('')).toBe('Captured fragment');
  });

  it('returns generic fallback when text is empty and title is null', () => {
    expect(summarizeText('', null)).toBe('Captured fragment');
  });
});
