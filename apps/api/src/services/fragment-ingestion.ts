import { randomUUID } from 'node:crypto';
import type {
  AnswerArtifact,
  Asset,
  DerivedArtifact,
  Fragment,
  ProcessingJob,
  Relation,
} from '@sui-note/domain';
import type { AppState } from './app-state.js';
import { buildUpdateSuggestions } from './object-candidates/update-suggestions.js';
import { runOrganizationWorker } from '../workers/organization-worker.js';
import { runFragmentProcessing } from '../workers/process-fragment.js';

export type CreateFragmentInput = {
  sourceType: Fragment['sourceType'];
  rawText?: string | null;
  titleOptional?: string | null;
  originKind?: Fragment['originKind'];
  userId?: string;
};

export type FragmentDetail = {
  fragment: Fragment;
  assets: Asset[];
  derivedArtifacts: DerivedArtifact[];
  relatedFragments: Relation[];
  processingJobs: ProcessingJob[];
};

const DEFAULT_USER_ID = '99999999-9999-4999-8999-999999999999';

export function createFragment(
  state: AppState,
  input: CreateFragmentInput,
): Fragment {
  const createdAt = new Date().toISOString();
  const fragment: Fragment = {
    fragmentId: randomUUID(),
    userId: input.userId ?? DEFAULT_USER_ID,
    createdAt,
    sourceType: input.sourceType,
    originKind: input.originKind ?? 'user_capture',
    titleOptional: input.titleOptional ?? null,
    rawTextOptional: input.rawText ?? null,
    status: 'processing',
    deviceMetadata: {
      platform: 'desktop',
      captureMethod: 'api_ingest',
      appVersion: '0.1.0',
      deviceName: 'api',
    },
    languageHintOptional: 'en',
  };

  state.fragments.set(fragment.fragmentId, fragment);
  state.assetsByFragmentId.set(
    fragment.fragmentId,
    extractAssets(fragment.fragmentId, input.rawText ?? null),
  );

  return fragment;
}

export function listFragments(state: AppState): Fragment[] {
  return [...state.fragments.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function getFragmentDetail(
  state: AppState,
  fragmentId: string,
): FragmentDetail | null {
  const fragment = state.fragments.get(fragmentId);

  if (!fragment) {
    return null;
  }

  const relatedFragments = [
    ...(state.relationsBySourceId.get(fragmentId) ?? []),
    ...(state.relationsByTargetId.get(fragmentId) ?? []),
  ].filter((relation) => relation.targetObjectType === 'fragment');

  return {
    fragment,
    assets: state.assetsByFragmentId.get(fragmentId) ?? [],
    derivedArtifacts: state.artifactsByFragmentId.get(fragmentId) ?? [],
    relatedFragments,
    processingJobs: state.processingJobsByFragmentId.get(fragmentId) ?? [],
  };
}

export function processFragment(state: AppState, fragmentId: string): FragmentDetail {
  const fragment = state.fragments.get(fragmentId);

  if (!fragment) {
    throw new Error(`Unknown fragment ${fragmentId}`);
  }

  const job = createJob(fragmentId, inferPrimaryJobType(fragment.sourceType));
  state.processingJobsByFragmentId.set(fragmentId, [job]);
  runFragmentProcessing(state, fragment, job);
  finalizeJob(state, fragmentId, job.jobId);
  recomputeDerivedObjects(state);

  return getFragmentDetail(state, fragmentId)!;
}

export function promoteAnswerToFragment(
  state: AppState,
  answer: AnswerArtifact,
): Fragment {
  const created = createFragment(state, {
    sourceType: 'answer',
    rawText: answer.answerBody,
    titleOptional: answer.queryText,
    originKind: 'answer_promotion',
  });

  const updatedAnswer: AnswerArtifact = {
    ...answer,
    savedAsFragment: true,
  };
  state.answers.set(answer.answerId, updatedAnswer);

  state.fragments.set(created.fragmentId, {
    ...created,
    status: 'ready',
  });
  state.artifactsByFragmentId.set(created.fragmentId, [
    createPromotedAnswerArtifact(created, {
      text: answer.answerBody,
      citations: answer.citations,
    }),
  ]);

  return state.fragments.get(created.fragmentId)!;
}

function createPromotedAnswerArtifact(
  fragment: Fragment,
  content: Record<string, unknown>,
): DerivedArtifact {
  return {
    artifactId: randomUUID(),
    fragmentId: fragment.fragmentId,
    artifactType: 'answer',
    version: 'v1',
    content,
    providerMetadata: {
      provider: 'in-memory',
      model: 'heuristic',
    },
    createdAt: new Date().toISOString(),
    citations: [
      {
        fragmentId: fragment.fragmentId,
        locator: {
          kind: 'text_span',
          value: '0:42',
        },
        supportPath: 'direct',
      },
    ],
  };
}

function extractAssets(fragmentId: string, rawText: string | null): Asset[] {
  if (!rawText) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawText) as {
      assets?: Array<{ fileName: string; localPath: string; mimeType: string }>;
    };

    if (!Array.isArray(parsed.assets)) {
      return [];
    }

    return parsed.assets.map((asset) => ({
      assetId: randomUUID(),
      fragmentId,
      assetType: 'attachment',
      mimeType: asset.mimeType,
      storagePath: {
        bucket: 'desktop-local',
        key: asset.localPath,
      },
      fileNameOptional: asset.fileName,
      checksum: null,
      byteSize: 0,
      createdAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function inferPrimaryJobType(sourceType: Fragment['sourceType']): string {
  switch (sourceType) {
    case 'image':
    case 'screenshot':
    case 'pdf':
      return 'ocr';
    case 'voice':
      return 'transcription';
    default:
      return 'understanding';
  }
}

function createJob(fragmentId: string, jobType: string): ProcessingJob {
  return {
    jobId: randomUUID(),
    fragmentId,
    jobType,
    status: 'running',
    attemptCount: 1,
    provider: 'in-memory',
    errorCode: null,
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

function finalizeJob(state: AppState, fragmentId: string, jobId: string) {
  const jobs = state.processingJobsByFragmentId.get(fragmentId) ?? [];
  state.processingJobsByFragmentId.set(
    fragmentId,
    jobs.map((job) =>
      job.jobId === jobId
        ? {
            ...job,
            status: 'completed',
            completedAt: new Date().toISOString(),
          }
        : job,
    ),
  );
}

function appendRelation(
  relationMap: Map<string, Relation[]>,
  key: string,
  relation: Relation,
) {
  const existing = relationMap.get(key) ?? [];
  relationMap.set(key, [...existing, relation]);
}

function recomputeDerivedObjects(state: AppState) {
  const readyFragments = [...state.fragments.values()].filter(
    (fragment) =>
      fragment.status === 'ready' &&
      fragment.sourceType !== 'answer' &&
      fragment.originKind === 'user_capture',
  );

  const candidates = runOrganizationWorker(state);
  for (const candidate of candidates) {
    const existing = [...state.derivedObjects.values()].find(
      (object) => object.title === candidate.title && object.objectType === candidate.objectType,
    );

    if (!existing) {
      continue;
    }

    const suggestions = buildUpdateSuggestions(existing, readyFragments);
    if (suggestions.length === 0) {
      continue;
    }

    state.derivedObjects.set(existing.objectId, {
      ...existing,
      summary: suggestions[0]!.suggestedSummary,
      supportingFragmentIds: [
        ...new Set([
          ...existing.supportingFragmentIds,
          ...suggestions[0]!.suggestedSupportingFragmentIds,
        ]),
      ],
      updatedAt: new Date().toISOString(),
    });
  }
}
