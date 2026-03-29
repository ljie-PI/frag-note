import type { AnswerArtifact, DerivedObject, Fragment } from '@sui-note/domain';
import type { CreateDeviceSessionResponse } from '@sui-note/contracts/auth';
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
  createDeviceSession(): Promise<CreateDeviceSessionResponse>;
  listFragments(): Promise<Fragment[]>;
  getFragmentDetail(fragmentId: string): Promise<FragmentDetail | null>;
  ingestFragment(input: CreateFragmentInput): Promise<{
    fragmentId: string;
    status: 'processing' | 'ready';
  }>;
  listDerivedObjectCandidates(): Promise<DerivedObject[]>;
  getDerivedObjectDetail(objectId: string): Promise<DerivedObject | null>;
  reviewDerivedObject(
    objectId: string,
    action: 'confirm' | 'dismiss' | 'postpone',
  ): Promise<DerivedObject | null>;
  reviewDerivedObjectUpdates(
    objectId: string,
  ): Promise<DerivedObjectUpdateSuggestion[]>;
  mergeDerivedObjects(
    sourceId: string,
    targetId: string,
  ): Promise<DerivedObject | null>;
  searchKnowledgeBase(input: SearchInput): Promise<AnswerArtifact>;
  saveAnswerAsFragment(answerId: string): Promise<SaveAnswerResult | null>;
}
