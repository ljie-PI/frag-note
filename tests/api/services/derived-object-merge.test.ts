import { describe, expect, it } from 'bun:test';
import { mergeDerivedObjects } from '../../../apps/api/src/services/derived-object-merge.ts';
import { createAppState } from '../../../apps/api/src/services/app-state.ts';
import type { DerivedObject } from '@frag-note/domain';

function makeDerivedObject(overrides: Partial<DerivedObject> & { objectId: string }): DerivedObject {
  return {
    objectType: 'topic',
    status: 'candidate',
    title: 'Test',
    summary: 'Summary',
    keyEntities: [],
    citations: [],
    relationEdges: [],
    ruleVersion: 'v1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('mergeDerivedObjects', () => {
  it('combines citations and deduplicates edges', () => {
    const state = createAppState();
    const source = makeDerivedObject({
      objectId: 'src',
      citations: [{ fragmentId: 'f2', locator: { kind: 'text_span', value: '0:10' }, supportPath: 'direct' }],
      relationEdges: ['e1', 'e2'],
    });
    const target = makeDerivedObject({
      objectId: 'tgt',
      citations: [{ fragmentId: 'f1', locator: { kind: 'text_span', value: '0:5' }, supportPath: 'direct' }],
      relationEdges: ['e2', 'e3'],
    });
    state.derivedObjects.set('src', source);
    state.derivedObjects.set('tgt', target);

    const result = mergeDerivedObjects(state, 'src', 'tgt');
    expect(result).not.toBeNull();
    expect(result!.citations).toHaveLength(2);
    expect(result!.relationEdges).toEqual(['e2', 'e3', 'e1']);
  });

  it('returns null when source not found', () => {
    const state = createAppState();
    state.derivedObjects.set('tgt', makeDerivedObject({ objectId: 'tgt' }));
    expect(mergeDerivedObjects(state, 'missing', 'tgt')).toBeNull();
  });

  it('returns null when target not found', () => {
    const state = createAppState();
    state.derivedObjects.set('src', makeDerivedObject({ objectId: 'src' }));
    expect(mergeDerivedObjects(state, 'src', 'missing')).toBeNull();
  });

  it('merges fragment associations', () => {
    const state = createAppState();
    state.derivedObjects.set('src', makeDerivedObject({ objectId: 'src' }));
    state.derivedObjects.set('tgt', makeDerivedObject({ objectId: 'tgt' }));
    state.derivedObjectFragments.set('src', new Set(['f1', 'f2']));
    state.derivedObjectFragments.set('tgt', new Set(['f2', 'f3']));

    mergeDerivedObjects(state, 'src', 'tgt');
    const merged = state.derivedObjectFragments.get('tgt');
    expect(merged).toEqual(new Set(['f1', 'f2', 'f3']));
  });

  it('deletes source from state after merge', () => {
    const state = createAppState();
    state.derivedObjects.set('src', makeDerivedObject({ objectId: 'src' }));
    state.derivedObjects.set('tgt', makeDerivedObject({ objectId: 'tgt' }));
    state.derivedObjectFragments.set('src', new Set(['f1']));

    mergeDerivedObjects(state, 'src', 'tgt');
    expect(state.derivedObjects.has('src')).toBe(false);
    expect(state.derivedObjectFragments.has('src')).toBe(false);
  });
});
