import { describe, expect, it } from 'bun:test';
import { buildProjectCandidates } from '../../../apps/api/src/services/object-candidates/project-candidate-service.ts';
import type { Fragment } from '@frag-note/domain';

function makeFragment(id: string, title: string | null, rawText: string | null = null): Fragment {
  return {
    fragmentId: id,
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

describe('buildProjectCandidates', () => {
  it('returns empty when fewer than 2 project fragments', () => {
    const fragments = [makeFragment('f1', 'My Project')];
    expect(buildProjectCandidates(fragments)).toEqual([]);
  });

  it('returns candidate when 2+ fragments mention project', () => {
    const fragments = [
      makeFragment('f1', 'Project Alpha'),
      makeFragment('f2', 'Project Beta'),
    ];
    const results = buildProjectCandidates(fragments);
    expect(results).toHaveLength(1);
    expect(results[0].object.objectType).toBe('project');
    expect(results[0].fragmentIds).toEqual(['f1', 'f2']);
  });

  it('matches case-insensitively', () => {
    const fragments = [
      makeFragment('f1', 'PROJECT notes'),
      makeFragment('f2', null, 'my project plan'),
    ];
    const results = buildProjectCandidates(fragments);
    expect(results).toHaveLength(1);
  });

  it('caps citations at 3', () => {
    const fragments = [
      makeFragment('f1', 'Project A'),
      makeFragment('f2', 'Project B'),
      makeFragment('f3', 'Project C'),
      makeFragment('f4', 'Project D'),
    ];
    const results = buildProjectCandidates(fragments);
    expect(results[0].object.citations).toHaveLength(3);
    expect(results[0].fragmentIds).toHaveLength(4);
  });
});
