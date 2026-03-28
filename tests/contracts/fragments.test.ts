import { describe, expect, it } from 'bun:test';
import { fragmentSchema } from '@sui-note/domain';
import { fragmentContractSchema } from '../../packages/contracts/src/fragments';
import { seedFragments } from '@sui-note/testing';

describe('fragmentContractSchema', () => {
  it('accepts the exact fragment contract payload', () => {
    const fragment = seedFragments.topicCluster[0];
    const contractPayload = {
      fragmentId: fragment.fragmentId,
      userId: fragment.userId,
      sourceType: fragment.sourceType,
      originKind: fragment.originKind,
    };

    const domainFragment = fragmentSchema.parse(fragment);
    const contractFragment = fragmentContractSchema.parse(contractPayload);

    expect(contractFragment.fragmentId).toBe(domainFragment.fragmentId);
    expect(contractFragment.sourceType).toBe(domainFragment.sourceType);
    expect('createdAt' in contractFragment).toBe(false);
  });

  it('rejects undeclared fragment fields at the contract boundary', () => {
    const fragment = seedFragments.topicCluster[0];

    expect(() =>
      fragmentContractSchema.parse({
        fragmentId: fragment.fragmentId,
        userId: fragment.userId,
        sourceType: fragment.sourceType,
        originKind: fragment.originKind,
        createdAt: fragment.createdAt,
      }),
    ).toThrow();
  });
});
