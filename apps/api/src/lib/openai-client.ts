import { parseEnv } from './env.js';

type StructuredSummary = {
  summary: string;
  tags: string[];
};

type OpenAiInputPart =
  | {
      type: 'input_text';
      text: string;
    }
  | {
      type: 'input_image';
      image_url: string;
    }
  | {
      type: 'input_file';
      filename: string;
      file_data: string;
    };

export async function createSummaryAndTags(
  sourceText: string,
  inputEnv: Record<string, string | undefined> = process.env,
): Promise<StructuredSummary | null> {
  const env = parseEnv(inputEnv);

  if (!env.ai.openAiApiKey || sourceText.trim().length === 0) {
    return null;
  }

  const responseText = await invokeOpenAiJsonResponse(
    [
      {
        type: 'input_text',
        text: [
          'Return JSON with exactly two keys: summary and tags.',
          'summary must be a concise paragraph under 80 words.',
          'tags must be an array of 3 to 6 short lowercase tags.',
          'Do not include markdown or any extra keys.',
        ].join(' '),
      },
      {
        type: 'input_text',
        text: sourceText,
      },
    ],
    env.ai.summaryModel,
    env.ai.openAiApiKey,
    env.ai.openAiBaseUrl,
  );

  if (!responseText) {
    return null;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      summary?: unknown;
      tags?: unknown;
    };

    if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.tags)) {
      return null;
    }

    return {
      summary: parsed.summary.trim(),
      tags: parsed.tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0)
        .slice(0, 6),
    };
  } catch {
    return null;
  }
}

export async function createEmbeddingVector(
  sourceText: string,
  inputEnv: Record<string, string | undefined> = process.env,
): Promise<number[] | null> {
  const env = parseEnv(inputEnv);

  if (!env.ai.openAiApiKey || sourceText.trim().length === 0) {
    return null;
  }

  const response = await fetch(`${trimTrailingSlash(env.ai.openAiBaseUrl)}/embeddings`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.ai.openAiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ai.embeddingModel,
      input: sourceText,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embedding = payload.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : null;
}

export async function transcribeAudioBytes(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
  inputEnv: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const env = parseEnv(inputEnv);

  if (!env.ai.openAiApiKey || bytes.length === 0) {
    return null;
  }

  const formData = new FormData();
  formData.append(
    'file',
    new File([bytes], fileName, { type: mimeType || 'audio/webm' }),
  );
  formData.append('model', env.ai.transcriptionModel);

  const response = await fetch(
    `${trimTrailingSlash(env.ai.openAiBaseUrl)}/audio/transcriptions`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.ai.openAiApiKey}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as { text?: string };
  return typeof payload.text === 'string' ? payload.text.trim() : null;
}

export async function extractTextFromVisualAsset(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string,
  inputEnv: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const env = parseEnv(inputEnv);

  if (!env.ai.openAiApiKey || bytes.length === 0) {
    return null;
  }

  const inputParts: OpenAiInputPart[] = [
    {
      type: 'input_text',
      text:
        'Extract all visible text from this asset. Return plain text only. If there is no readable text, return an empty string.',
    },
  ];

  if (mimeType.startsWith('image/')) {
    inputParts.push({
      type: 'input_image',
      image_url: `data:${mimeType};base64,${toBase64(bytes)}`,
    });
  } else {
    inputParts.push({
      type: 'input_file',
      filename: fileName,
      file_data: toBase64(bytes),
    });
  }

  const responseText = await invokeOpenAiTextResponse(
    inputParts,
    env.ai.ocrModel,
    env.ai.openAiApiKey,
    env.ai.openAiBaseUrl,
  );

  return responseText?.trim() || null;
}

async function invokeOpenAiJsonResponse(
  input: OpenAiInputPart[],
  model: string,
  apiKey: string,
  baseUrl: string,
): Promise<string | null> {
  const response = await fetch(`${trimTrailingSlash(baseUrl)}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: input,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'fragment_understanding',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['summary', 'tags'],
            properties: {
              summary: {
                type: 'string',
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };

  return typeof payload.output_text === 'string' ? payload.output_text : null;
}

async function invokeOpenAiTextResponse(
  input: OpenAiInputPart[],
  model: string,
  apiKey: string,
  baseUrl: string,
): Promise<string | null> {
  const response = await fetch(`${trimTrailingSlash(baseUrl)}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'user',
          content: input,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = (await response.json()) as {
    output_text?: string;
  };

  return typeof payload.output_text === 'string' ? payload.output_text : null;
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}
