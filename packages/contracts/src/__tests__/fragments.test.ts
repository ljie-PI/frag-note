import { describe, expect, it } from 'vitest';
import { fragmentSchema } from '@sui-note/domain';
import { fragmentContractSchema } from '../fragments';
import { seedFragments } from '@sui-note/testing';

describe('fragmentContractSchema', () => {
  it('accepts canonical fragment fixtures while exposing the contract subset', () => {
    const fragment = seedFragments.topicCluster[0];

    const domainFragment = fragmentSchema.parse(fragment);
    const contractFragment = fragmentContractSchema.parse(fragment);

    expect(contractFragment.fragmentId).toBe(domainFragment.fragmentId);
    expect(contractFragment.sourceType).toBe(domainFragment.sourceType);
    expect('createdAt' in contractFragment).toBe(false);
  });
});
