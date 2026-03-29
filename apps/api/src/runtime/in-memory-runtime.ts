import {
  createDeviceSession,
} from '../services/auth/session-service.js';
import { createAppState } from '../services/app-state.js';
import {
  createFragment,
  getFragmentDetail,
  listFragments,
  processFragment,
} from '../services/fragment-ingestion.js';
import {
  mergeDerivedObjects,
} from '../services/derived-object-merge.js';
import {
  getDerivedObjectDetail,
  listDerivedObjectCandidates,
} from '../services/derived-object-query.js';
import {
  confirmDerivedObject,
  dismissDerivedObject,
  postponeDerivedObject,
} from '../services/derived-object-review.js';
import { reviewDerivedObjectUpdates } from '../services/derived-object-update-review.js';
import { saveAnswerAsFragment, searchKnowledgeBase } from '../services/search-service.js';
import type { ApiRuntime } from './runtime.js';

export function createInMemoryRuntime(): ApiRuntime {
  const state = createAppState();

  return {
    mode: 'in-memory',
    async createDeviceSession() {
      return createDeviceSession();
    },
    async listFragments() {
      return listFragments(state);
    },
    async getFragmentDetail(fragmentId) {
      return getFragmentDetail(state, fragmentId);
    },
    async ingestFragment(input) {
      const fragment = createFragment(state, input);
      processFragment(state, fragment.fragmentId);

      return {
        fragmentId: fragment.fragmentId,
        status: 'processing',
      };
    },
    async listDerivedObjectCandidates() {
      return listDerivedObjectCandidates(state);
    },
    async getDerivedObjectDetail(objectId) {
      return getDerivedObjectDetail(state, objectId);
    },
    async reviewDerivedObject(objectId, action) {
      switch (action) {
        case 'confirm':
          return confirmDerivedObject(state, objectId);
        case 'dismiss':
          return dismissDerivedObject(state, objectId);
        case 'postpone':
          return postponeDerivedObject(state, objectId);
      }
    },
    async reviewDerivedObjectUpdates(objectId) {
      return reviewDerivedObjectUpdates(state, objectId).map((suggestion) => ({
        objectId,
        suggestedSummary: suggestion.suggestedSummary,
        suggestedSupportingFragmentIds:
          suggestion.suggestedSupportingFragmentIds,
      }));
    },
    async mergeDerivedObjects(sourceId, targetId) {
      return mergeDerivedObjects(state, sourceId, targetId);
    },
    async searchKnowledgeBase(input) {
      return searchKnowledgeBase(state, input);
    },
    async saveAnswerAsFragment(answerId) {
      return saveAnswerAsFragment(state, answerId);
    },
  };
}
