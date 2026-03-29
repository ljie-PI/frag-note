import { describe, expect, it } from 'bun:test';
import { createTestApp } from '../support/test-app.js';

describe('search and answer routes', () => {
  it('returns a cited answer and supports promotion into a new fragment', async () => {
    const app = createTestApp();

    const ingestResponse = await app.inject({
      method: 'POST',
      url: '/v1/fragments',
      payload: {
        sourceType: 'text',
        rawText: 'OCR helps convert screenshots into searchable text for later retrieval.',
        titleOptional: 'OCR search source',
      },
    });

    expect(ingestResponse.statusCode).toBe(202);

    const searchResponse = await app.inject({
      method: 'POST',
      url: '/v1/search',
      payload: {
        queryText: 'What did I note about OCR?',
        queryType: 'natural_language',
      },
    });

    expect(searchResponse.statusCode).toBe(200);

    const answer = searchResponse.json() as {
      answerId: string;
      answerBody: string;
      citations: Array<{ fragmentId: string }>;
      savedAsFragment: boolean;
    };

    expect(answer.answerBody).toContain('OCR');
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.savedAsFragment).toBe(false);

    const saveResponse = await app.inject({
      method: 'POST',
      url: `/v1/answers/${answer.answerId}/save-as-fragment`,
      payload: {
        originKind: 'answer_promotion',
        sourceQuery: 'What did I note about OCR?',
        citedFragmentIds: answer.citations.map((citation) => citation.fragmentId),
      },
    });

    expect(saveResponse.statusCode).toBe(201);
    expect(saveResponse.json()).toEqual(
      expect.objectContaining({
        originKind: 'answer_promotion',
        sourceAnswerId: answer.answerId,
      }),
    );

    await app.close();
  });
});
