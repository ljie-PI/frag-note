import type { AnswerArtifact, DerivedObject } from '@sui-note/domain';
import type { DesktopApiClient } from '../features/sync/sync-service.ts';

type FragmentDetailResponse = Awaited<
  ReturnType<DesktopApiClient['getFragmentDetail']>
>;

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';

export function createDesktopApiClient(
  baseUrl = DEFAULT_API_BASE_URL,
): DesktopApiClient & {
  listCandidates(): Promise<DerivedObject[]>;
  search(input: {
    queryText: string;
    queryType: 'keyword' | 'natural_language';
  }): Promise<AnswerArtifact>;
  saveAnswerAsFragment(answerId: string, input: {
    sourceQuery: string;
    citedFragmentIds: string[];
  }): Promise<{ fragmentId: string; originKind: 'answer_promotion'; sourceAnswerId: string }>;
} {
  return {
    async ingestFragment(payload) {
      return requestJson(`${baseUrl}/v1/fragments`, {
        method: 'POST',
        body: JSON.stringify({
          sourceType: payload.sourceType,
          rawText: payload.rawText,
          titleOptional: payload.titleOptional,
        }),
      });
    },
    async getFragmentDetail(fragmentId) {
      return requestJson<FragmentDetailResponse>(
        `${baseUrl}/v1/fragments/${fragmentId}`,
      );
    },
    async listCandidates() {
      return requestJson(`${baseUrl}/v1/derived-objects/candidates`);
    },
    async search(input) {
      return requestJson(`${baseUrl}/v1/search`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    async saveAnswerAsFragment(answerId, input) {
      return requestJson(`${baseUrl}/v1/answers/${answerId}/save-as-fragment`, {
        method: 'POST',
        body: JSON.stringify({
          originKind: 'answer_promotion',
          sourceQuery: input.sourceQuery,
          citedFragmentIds: input.citedFragmentIds,
        }),
      });
    },
  };
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
