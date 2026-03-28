export const seedFragments = {
  topicCluster: [
    {
      fragmentId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999',
      sourceType: 'text',
      originKind: 'user_capture',
    },
    {
      fragmentId: '11111111-1111-4111-8111-111111111112',
      userId: '99999999-9999-4999-8999-999999999999',
      sourceType: 'link',
      originKind: 'user_capture',
    },
    {
      fragmentId: '11111111-1111-4111-8111-111111111113',
      userId: '99999999-9999-4999-8999-999999999999',
      sourceType: 'pdf',
      originKind: 'user_capture',
    },
  ],
} as const;

export const seedCandidate = {
  objectId: '22222222-2222-4222-8222-222222222222',
  objectType: 'topic',
  title: 'OCR research',
  status: 'candidate',
  summary: 'Research notes and artifacts related to OCR workflows.',
  keyEntities: ['OCR', 'screenshots', 'transcripts'],
  supportingFragmentIds: [
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111113',
  ],
  citations: [
    {
      fragmentId: '11111111-1111-4111-8111-111111111111',
      locator: {
        kind: 'text_span',
        value: '0:42',
      },
      supportPath: 'direct',
    },
  ],
  relationEdges: ['55555555-5555-4555-8555-555555555555'],
  ruleVersion: 'v1',
} as const;

export const seedAnswer = {
  answerId: '33333333-3333-4333-8333-333333333333',
  queryText: 'What is OCR useful for?',
  queryType: 'natural_language',
  answerFormat: 'summary',
  retrievalBundle: [
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111113',
  ],
  modelMetadata: {
    provider: 'openai',
    model: 'gpt-5',
  },
  citations: [
    {
      fragmentId: '11111111-1111-4111-8111-111111111111',
      locator: {
        kind: 'text_span',
        value: '0:42',
      },
      supportPath: 'direct',
    },
  ],
} as const;
