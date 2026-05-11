import type {
  AnswerArtifact,
  Asset,
  DerivedArtifact,
  DerivedObject,
  Fragment,
  ProcessingJob,
  Relation,
} from '@frag-note/domain';

export type AppState = {
  fragments: Map<string, Fragment>;
  assetsByFragmentId: Map<string, Asset[]>;
  artifactsByFragmentId: Map<string, DerivedArtifact[]>;
  relationsBySourceId: Map<string, Relation[]>;
  relationsByTargetId: Map<string, Relation[]>;
  processingJobsByFragmentId: Map<string, ProcessingJob[]>;
  derivedObjects: Map<string, DerivedObject>;
  derivedObjectFragments: Map<string, Set<string>>;
  answers: Map<string, AnswerArtifact>;
  dismissedCandidateKeys: Set<string>;
};

export function createAppState(): AppState {
  return {
    fragments: new Map(),
    assetsByFragmentId: new Map(),
    artifactsByFragmentId: new Map(),
    relationsBySourceId: new Map(),
    relationsByTargetId: new Map(),
    processingJobsByFragmentId: new Map(),
    derivedObjects: new Map(),
    derivedObjectFragments: new Map(),
    answers: new Map(),
    dismissedCandidateKeys: new Set(),
  };
}
