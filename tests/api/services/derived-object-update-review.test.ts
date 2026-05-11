import { describe, expect, it } from 'bun:test';
import { reviewDerivedObjectUpdates } from '../../../apps/api/src/services/derived-object-update-review.ts';
import { createAppState } from '../../../apps/api/src/services/app-state.ts';
import type { DerivedObject, Fragment } from '@frag-note/domain';

function makeFragment(id: string, overrides: Partial<Fragment> = {}): Fragment {
  return {
    fragmentId: id,
    userId: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    sourceType: 'text',
    originKind: 'user_capture',
    titleOptional: null,
    rawTextOptional: 'some text',
    status: 'ready',
    deviceMetadata: { platform: 'desktop', captureMethod: 'test' },
    languageHintOptional: 'en',
    ...overrides,
  };
}

function makeObject(id: string): DerivedObject {
  return {
    objectId: id,
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
  };
}

describe('reviewDerivedObjectUpdates', () => {
  it('returns empty when object not found', () => {
    const state = createAppState();
    expect(reviewDerivedObjectUpdates(state, 'missing')).toEqual([]);
  });

  it('returns empty when no unseen fragments exist', () => {
    const state = createAppState();
    state.derivedObjects.set('o1', makeObject('o1'));
    state.fragments.set('f1', makeFragment('f1'));
    state.derivedObjectFragments.set('o1', new Set(['f1']));

    expect(reviewDerivedObjectUpdates(state, 'o1')).toEqual([]);
  });

  it('returns suggestions when new ready fragments exist', () => {
    const state = createAppState();
    state.derivedObjects.set('o1', makeObject('o1'));
    state.fragments.set('f1', makeFragment('f1'));
    state.fragments.set('f2', makeFragment('f2'));
    state.derivedObjectFragments.set('o1', new Set(['f1']));

    const results = reviewDerivedObjectUpdates(state, 'o1');
    expect(results).toHaveLength(1);
    expect(results[0].suggestedSupportingFragmentIds).toEqual(['f2']);
  });

  it('ignores fragments that are not ready or not user_capture', () => {
    const state = createAppState();
    state.derivedObjects.set('o1', makeObject('o1'));
    state.fragments.set('f1', makeFragment('f1', { status: 'processing' }));
    state.fragments.set('f2', makeFragment('f2', { originKind: 'system_derived' }));
    state.derivedObjectFragments.set('o1', new Set());

    expect(reviewDerivedObjectUpdates(state, 'o1')).toEqual([]);
  });
});
