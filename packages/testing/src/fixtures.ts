export const seedFragments = {
  topicCluster: [
    {
      fragmentId: '11111111-1111-4111-8111-111111111111',
      sourceType: 'text',
      originKind: 'user_capture',
    },
    {
      fragmentId: '11111111-1111-4111-8111-111111111112',
      sourceType: 'link',
      originKind: 'user_capture',
    },
    {
      fragmentId: '11111111-1111-4111-8111-111111111113',
      sourceType: 'pdf',
      originKind: 'user_capture',
    },
  ],
} as const;

export const seedCandidate = {
  objectId: '22222222-2222-4222-8222-222222222222',
  title: 'OCR research',
  status: 'candidate',
} as const;

export const seedAnswer = {
  answerId: '33333333-3333-4333-8333-333333333333',
  answerBody: 'OCR helps convert screenshots into text.',
  citations: [],
  savedAsFragment: false,
} as const;
