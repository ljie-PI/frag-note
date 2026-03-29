import { corsHeaders } from '../_shared/cors.ts';
import { createServiceHeaders, requireAuth } from '../_shared/auth.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(request);
    const { queryText, queryType } = (await request.json()) as {
      queryText?: string;
      queryType?: 'keyword' | 'natural_language';
    };

    if (!queryText || queryText.trim().length === 0) {
      throw new Error('queryText is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    const headers = createServiceHeaders();
    const fragmentsResponse = await fetch(
      `${supabaseUrl}/rest/v1/fragments?select=*&user_id=eq.${auth.userId}&status=eq.ready&order=created_at.desc`,
      { headers },
    );

    if (!fragmentsResponse.ok) {
      throw new Error(await fragmentsResponse.text());
    }

    const fragments = (await fragmentsResponse.json()) as Array<{
      fragment_id: string;
      title_optional: string | null;
      raw_text_optional: string | null;
      source_type: string;
    }>;
    const artifactsResponse = await fetch(
      `${supabaseUrl}/rest/v1/derived_artifacts?select=fragment_id,artifact_type,content&user_id=eq.${auth.userId}&order=created_at.desc`,
      { headers },
    );

    if (!artifactsResponse.ok) {
      throw new Error(await artifactsResponse.text());
    }

    const artifacts = (await artifactsResponse.json()) as Array<{
      fragment_id: string;
      artifact_type: string;
      content: Record<string, unknown> | null;
    }>;
    const embeddingsByFragmentId = buildEmbeddingsByFragmentId(artifacts);
    const queryTokens = tokenize(queryText);
    const queryEmbedding = await buildQueryEmbedding(
      queryText,
      queryTokens,
    );

    const ranked = fragments
      .map((fragment) => ({
        fragment,
        score: scoreFragment(
          fragment,
          queryText,
          queryTokens,
          queryEmbedding,
          embeddingsByFragmentId.get(fragment.fragment_id) ?? null,
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);

    const answerId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const citations = ranked.map((entry) => ({
      fragmentId: entry.fragment.fragment_id,
      locator: {
        kind: 'text_span',
        value: '0:200',
      },
      supportPath: 'direct',
    }));
    const answerBody = await buildAnswerBody(queryText, ranked);

    const answer = {
      answerId,
      queryText,
      queryType: queryType ?? 'natural_language',
      answerBody,
      answerFormat: ranked.length > 0 ? 'bullets' : 'summary',
      retrievalBundle: ranked.map((entry) => entry.fragment.fragment_id),
      modelMetadata: {
        provider: Deno.env.get('OPENAI_API_KEY') ? 'openai' : 'supabase-edge',
        model: Deno.env.get('OPENAI_API_KEY')
          ? Deno.env.get('OPENAI_SUMMARY_MODEL') ?? 'gpt-4.1-mini'
          : 'heuristic',
      },
      citations,
      provenance: {
        sourceQuery: queryText,
        citedFragmentIds: citations.map((citation) => citation.fragmentId),
      },
      savedAsFragment: false,
      createdAt,
    };

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/answers`, {
      method: 'POST',
      headers: {
        ...headers,
        prefer: 'return=minimal',
      },
      body: JSON.stringify({
        answer_id: answer.answerId,
        user_id: auth.userId,
        query_text: answer.queryText,
        query_type: answer.queryType,
        answer_body: answer.answerBody,
        answer_format: answer.answerFormat,
        retrieval_bundle: answer.retrievalBundle,
        model_metadata: answer.modelMetadata,
        citations: answer.citations,
        provenance: answer.provenance,
        saved_as_fragment: answer.savedAsFragment,
        created_at: answer.createdAt,
      }),
    });

    if (!insertResponse.ok) {
      throw new Error(await insertResponse.text());
    }

    return Response.json(answer, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }
});

function scoreFragment(
  fragment: { title_optional: string | null; raw_text_optional: string | null },
  queryText: string,
  queryTokens: string[],
  queryEmbedding: number[] | null,
  fragmentEmbedding: number[] | null,
) {
  const haystack = `${fragment.title_optional ?? ''} ${extractSearchableText(fragment.raw_text_optional)}`
    .toLowerCase();
  const keywordScore = queryTokens.reduce((score, token) => {
    return haystack.includes(token) ? score + 1 : score;
  }, 0);
  const embeddingScore =
    queryEmbedding && fragmentEmbedding
      ? cosineSimilarity(queryEmbedding, fragmentEmbedding) * 4
      : 0;
  return keywordScore + embeddingScore + (queryText.length > 0 ? 0.001 : 0);
}

async function buildAnswerBody(
  queryText: string,
  ranked: Array<{
    fragment: {
      fragment_id: string;
      title_optional: string | null;
      raw_text_optional: string | null;
      source_type: string;
    };
  }>,
) {
  if (ranked.length === 0) {
    return `No relevant fragments were found for "${queryText}".`;
  }

  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const openAiBaseUrl = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';
  const openAiSummaryModel =
    Deno.env.get('OPENAI_SUMMARY_MODEL') ?? 'gpt-4.1-mini';

  if (!openAiApiKey) {
    return ranked
      .map((entry) => {
        const text =
          entry.fragment.title_optional ??
          extractSearchableText(entry.fragment.raw_text_optional) ??
          entry.fragment.source_type;
        return `- ${text}`;
      })
      .join('\n');
  }

  const context = ranked
    .map(
      (entry, index) =>
        `Fragment ${index + 1}\nTitle: ${entry.fragment.title_optional ?? ''}\nContent: ${extractSearchableText(entry.fragment.raw_text_optional) ?? entry.fragment.source_type}`,
    )
    .join('\n\n');

  const response = await fetch(`${trimTrailingSlash(openAiBaseUrl)}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${openAiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiSummaryModel,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Answer the user query using only the provided fragments.',
                'Be concise, structured, and grounded.',
                'Do not invent facts beyond the fragment context.',
                `User query: ${queryText}`,
                context,
              ].join('\n\n'),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return ranked
      .map((entry) => {
        const text =
          entry.fragment.title_optional ??
          extractSearchableText(entry.fragment.raw_text_optional) ??
          entry.fragment.source_type;
        return `- ${text}`;
      })
      .join('\n');
  }

  const payload = (await response.json()) as { output_text?: string };
  return payload.output_text?.trim() || `No relevant fragments were found for "${queryText}".`;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 1);
}

function extractSearchableText(rawText: string | null) {
  if (!rawText) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawText) as { rawText?: unknown };
    return typeof parsed.rawText === 'string' ? parsed.rawText : rawText;
  } catch {
    return rawText;
  }
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function buildEmbeddingsByFragmentId(
  artifacts: Array<{
    fragment_id: string;
    artifact_type: string;
    content: Record<string, unknown> | null;
  }>,
) {
  const map = new Map<string, number[]>();

  for (const artifact of artifacts) {
    if (artifact.artifact_type !== 'embedding') {
      continue;
    }

    const vector = artifact.content?.vector;

    if (!Array.isArray(vector)) {
      continue;
    }

    map.set(
      artifact.fragment_id,
      vector.filter((value): value is number => typeof value === 'number'),
    );
  }

  return map;
}

async function buildQueryEmbedding(queryText: string, queryTokens: string[]) {
  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const openAiBaseUrl = Deno.env.get('OPENAI_BASE_URL') ?? 'https://api.openai.com/v1';
  const openAiEmbeddingModel =
    Deno.env.get('OPENAI_EMBEDDING_MODEL') ?? 'text-embedding-3-small';

  if (!openAiApiKey) {
    return queryTokens.map((token, index) => token.length + index);
  }

  const response = await fetch(`${trimTrailingSlash(openAiBaseUrl)}/embeddings`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${openAiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiEmbeddingModel,
      input: queryText,
    }),
  });

  if (!response.ok) {
    return queryTokens.map((token, index) => token.length + index);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embedding = payload.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : queryTokens.map((token, index) => token.length + index);
}

function cosineSimilarity(left: number[], right: number[]) {
  const dimension = Math.max(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < dimension; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
