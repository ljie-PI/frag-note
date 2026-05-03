import type { AnswerArtifact, DerivedObject, Fragment } from '@frag-note/domain';
import type { CreateDeviceSessionResponse } from '@frag-note/contracts/auth';
import type { RequestAuthContext } from '../lib/request-auth.js';
import type { FragmentDetail, CreateFragmentInput } from '../services/fragment-ingestion.js';

export type DerivedObjectUpdateSuggestion = {
  objectId: string;
  suggestedSummary: string;
  suggestedSupportingFragmentIds: string[];
};

export type SearchInput = {
  queryText: string;
  queryType: 'keyword' | 'natural_language';
};

export type SaveAnswerResult = {
  fragmentId: string;
  originKind: 'answer_promotion';
  sourceAnswerId: string;
};

export interface ApiRuntime {
  mode: 'supabase';
  createDeviceSession(auth: RequestAuthContext): Promise<CreateDeviceSessionResponse>;
  listFragments(auth: RequestAuthContext): Promise<Fragment[]>;
  getFragmentDetail(
    auth: RequestAuthContext,
    fragmentId: string,
  ): Promise<FragmentDetail | null>;
  ingestFragment(
    auth: RequestAuthContext,
    input: CreateFragmentInput,
  ): Promise<{
    fragmentId: string;
    status: 'processing' | 'ready';
  }>;
  retryFragmentProcessing(
    auth: RequestAuthContext,
    fragmentId: string,
  ): Promise<{
    fragmentId: string;
    status: 'processing';
  } | null>;
  listDerivedObjectCandidates(auth: RequestAuthContext): Promise<DerivedObject[]>;
  getDerivedObjectDetail(
    auth: RequestAuthContext,
    objectId: string,
  ): Promise<DerivedObject | null>;
  reviewDerivedObject(
    auth: RequestAuthContext,
    objectId: string,
    action: 'confirm' | 'dismiss' | 'postpone',
  ): Promise<DerivedObject | null>;
  reviewDerivedObjectUpdates(
    auth: RequestAuthContext,
    objectId: string,
  ): Promise<DerivedObjectUpdateSuggestion[]>;
  mergeDerivedObjects(
    auth: RequestAuthContext,
    sourceId: string,
    targetId: string,
  ): Promise<DerivedObject | null>;
  searchKnowledgeBase(
    auth: RequestAuthContext,
    input: SearchInput,
  ): Promise<AnswerArtifact>;
  saveAnswerAsFragment(
    auth: RequestAuthContext,
    answerId: string,
  ): Promise<SaveAnswerResult | null>;
}
