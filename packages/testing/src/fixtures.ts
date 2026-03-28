export const seedFragments = {
  topicCluster: [
    {
      fragmentId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999',
      createdAt: '2026-03-28T10:00:00.000Z',
      sourceType: 'text',
      originKind: 'user_capture',
      titleOptional: 'OCR research notes',
      rawTextOptional: 'OCR helps convert screenshots into searchable text.',
      status: 'ready',
      deviceMetadata: {
        platform: 'macos',
        captureMethod: 'palette_text',
        appVersion: '0.1.0',
        deviceName: 'MacBook Pro',
      },
      languageHintOptional: 'en',
    },
    {
      fragmentId: '11111111-1111-4111-8111-111111111112',
      userId: '99999999-9999-4999-8999-999999999999',
      createdAt: '2026-03-28T10:01:00.000Z',
      sourceType: 'link',
      originKind: 'user_capture',
      titleOptional: 'OCR reference article',
      rawTextOptional: 'https://example.com/ocr-reference',
      status: 'processing',
      deviceMetadata: {
        platform: 'macos',
        captureMethod: 'palette_link',
      },
      languageHintOptional: 'en',
    },
    {
      fragmentId: '11111111-1111-4111-8111-111111111113',
      userId: '99999999-9999-4999-8999-999999999999',
      createdAt: '2026-03-28T10:02:00.000Z',
      sourceType: 'pdf',
      originKind: 'user_capture',
      titleOptional: 'OCR whitepaper',
      rawTextOptional: null,
      status: 'partially_processed',
      deviceMetadata: {
        platform: 'macos',
        captureMethod: 'palette_file',
      },
      languageHintOptional: 'en',
    },
  ],
} as const;

export const seedAsset = {
  assetId: '88888888-8888-4888-8888-888888888888',
  fragmentId: '11111111-1111-4111-8111-111111111111',
  assetType: 'original',
  mimeType: 'image/png',
  storagePath: {
    bucket: 'captures',
    key: 'users/99999999-9999-4999-8999-999999999999/fragments/11111111-1111-4111-8111-111111111111/original.png',
  },
  fileNameOptional: 'ocr-research.png',
  checksum: 'sha256:abc123',
  byteSize: 204800,
  createdAt: '2026-03-28T10:03:00.000Z',
} as const;

export const seedDerivedArtifact = {
  artifactId: '44444444-4444-4444-8444-444444444444',
  fragmentId: '11111111-1111-4111-8111-111111111111',
  artifactType: 'summary',
  version: '2026-03-28.1',
  content: {
    text: 'OCR notes summarize screenshot extraction results.',
  },
  providerMetadata: {
    provider: 'openai',
    model: 'gpt-5',
  },
  createdAt: '2026-03-28T10:05:00.000Z',
  citations: [
    {
      fragmentId: '11111111-1111-4111-8111-111111111111',
      artifactId: '44444444-4444-4444-8444-444444444444',
      locator: {
        kind: 'text_span',
        value: '0:42',
      },
      supportPath: 'direct',
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

export const seedRelation = {
  relationId: '77777777-7777-4777-8777-777777777777',
  sourceObjectType: 'derived_object',
  sourceObjectId: '22222222-2222-4222-8222-222222222222',
  targetObjectType: 'fragment',
  targetObjectId: '11111111-1111-4111-8111-111111111111',
  relationType: 'supported_by',
  confidence: 0.92,
  explanation: 'Fragments support the candidate object.',
  createdAt: '2026-03-28T10:06:00.000Z',
  algorithmVersion: 'v1',
} as const;

export const seedProcessingJob = {
  jobId: '66666666-6666-4666-8666-666666666666',
  fragmentId: '11111111-1111-4111-8111-111111111111',
  jobType: 'ocr',
  status: 'queued',
  attemptCount: 0,
  provider: 'openai',
  errorCode: null,
  errorMessage: null,
  startedAt: null,
  completedAt: null,
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
