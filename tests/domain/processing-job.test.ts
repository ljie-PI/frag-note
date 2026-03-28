import { describe, expect, it } from 'bun:test';
import { processingJobSchema } from '../../packages/domain/src/index';

describe('processingJobSchema', () => {
  it('captures lifecycle state for processing jobs', () => {
    const parsed = processingJobSchema.parse({
      jobId: '66666666-6666-4666-8666-666666666666',
      fragmentId: '11111111-1111-1111-8111-111111111111',
      jobType: 'ocr',
      status: 'queued',
      attemptCount: 0,
      provider: 'openai',
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    });

    expect(parsed.status).toBe('queued');
    expect(parsed.attemptCount).toBe(0);
  });

  it('rejects negative attempt counts', () => {
    expect(() =>
      processingJobSchema.parse({
        jobId: '66666666-6666-4666-8666-666666666666',
        fragmentId: '11111111-1111-1111-8111-111111111111',
        jobType: 'ocr',
        status: 'queued',
        attemptCount: -1,
        provider: 'openai',
        errorCode: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      }),
    ).toThrow();
  });
});
