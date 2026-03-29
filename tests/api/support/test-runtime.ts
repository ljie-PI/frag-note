import {
  createDeviceSession,
} from '../../../apps/api/src/services/auth/session-service.js';
import { createAppState } from '../../../apps/api/src/services/app-state.js';
import {
  createFragment,
  getFragmentDetail,
  listFragments,
  processFragment,
} from '../../../apps/api/src/services/fragment-ingestion.js';
import {
  mergeDerivedObjects,
} from '../../../apps/api/src/services/derived-object-merge.js';
import {
  getDerivedObjectDetail,
  listDerivedObjectCandidates,
} from '../../../apps/api/src/services/derived-object-query.js';
import {
  confirmDerivedObject,
  dismissDerivedObject,
  postponeDerivedObject,
} from '../../../apps/api/src/services/derived-object-review.js';
import { reviewDerivedObjectUpdates } from '../../../apps/api/src/services/derived-object-update-review.js';
import {
  saveAnswerAsFragment,
  searchKnowledgeBase,
} from '../../../apps/api/src/services/search-service.js';
import type { AuthResolver } from '../../../apps/api/src/lib/request-auth.js';
import type { ApiRuntime } from '../../../apps/api/src/runtime/runtime.js';

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

export function createTestRuntime(): ApiRuntime {
  const state = createAppState();

  return {
    mode: 'supabase',
    async createDeviceSession(auth) {
      return {
        ...createDeviceSession(),
        userId: auth.userId,
      };
    },
    async listFragments() {
      return listFragments(state);
    },
    async getFragmentDetail(_auth, fragmentId) {
      return getFragmentDetail(state, fragmentId);
    },
    async ingestFragment(auth, input) {
      const fragment = createFragment(state, {
        ...input,
        userId: auth.userId,
      });
      processFragment(state, fragment.fragmentId);

      return {
        fragmentId: fragment.fragmentId,
        status: 'processing',
      };
    },
    async retryFragmentProcessing(_auth, fragmentId) {
      processFragment(state, fragmentId);
      return {
        fragmentId,
        status: 'processing',
      };
    },
    async listDerivedObjectCandidates() {
      return listDerivedObjectCandidates(state);
    },
    async getDerivedObjectDetail(_auth, objectId) {
      return getDerivedObjectDetail(state, objectId);
    },
    async reviewDerivedObject(_auth, objectId, action) {
      switch (action) {
        case 'confirm':
          return confirmDerivedObject(state, objectId);
        case 'dismiss':
          return dismissDerivedObject(state, objectId);
        case 'postpone':
          return postponeDerivedObject(state, objectId);
      }
    },
    async reviewDerivedObjectUpdates(_auth, objectId) {
      return reviewDerivedObjectUpdates(state, objectId).map((suggestion) => ({
        objectId,
        suggestedSummary: suggestion.suggestedSummary,
        suggestedSupportingFragmentIds:
          suggestion.suggestedSupportingFragmentIds,
      }));
    },
    async mergeDerivedObjects(_auth, sourceId, targetId) {
      return mergeDerivedObjects(state, sourceId, targetId);
    },
    async searchKnowledgeBase(_auth, input) {
      return searchKnowledgeBase(state, input);
    },
    async saveAnswerAsFragment(_auth, answerId) {
      return saveAnswerAsFragment(state, answerId);
    },
  };
}

export function createTestAuthResolver(): AuthResolver {
  return async () => ({
    userId: TEST_USER_ID,
    accessToken: 'test-access-token',
  });
}
