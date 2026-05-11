import type { DerivedObject } from '@frag-note/domain';

export type CandidateResult = {
  object: DerivedObject;
  fragmentIds: string[];
};
