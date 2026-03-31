type EnvInput = Record<string, string | undefined>;

export type AiProviderConfig = {
  apiKey: string | null;
  baseUrl: string;
  model: string;
};

export type ParsedEnv = {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    storage: {
      rawBucket: string;
      derivedBucket: string;
    };
  };
  ai: {
    summary: AiProviderConfig;
    embedding: AiProviderConfig;
    transcription: AiProviderConfig;
    ocr: AiProviderConfig;
  };
};

type FieldParser<T> = (name: string, value: string | undefined) => T;

const envSchema = {
  SUPABASE_URL: requiredUrl(['https:', 'http:']),
  SUPABASE_ANON_KEY: requiredString(),
  SUPABASE_SERVICE_ROLE_KEY: requiredString(),
  SUPABASE_STORAGE_RAW_BUCKET: optionalString('captures-raw'),
  SUPABASE_STORAGE_DERIVED_BUCKET: optionalString('captures-derived'),
  LLM_API_KEY: nullableString(),
  LLM_BASE_URL: optionalUrl('https://api.openai.com/v1', ['https:', 'http:']),
  SUMMARY_MODEL: optionalString('gpt-4.1-mini'),
  SUMMARY_API_KEY: nullableString(),
  SUMMARY_BASE_URL: optionalUrlOrEmpty(['https:', 'http:']),
  EMBEDDING_MODEL: optionalString('text-embedding-3-small'),
  EMBEDDING_API_KEY: nullableString(),
  EMBEDDING_BASE_URL: optionalUrlOrEmpty(['https:', 'http:']),
  TRANSCRIPTION_MODEL: optionalString('gpt-4o-mini-transcribe'),
  TRANSCRIPTION_API_KEY: nullableString(),
  TRANSCRIPTION_BASE_URL: optionalUrlOrEmpty(['https:', 'http:']),
  OCR_MODEL: optionalString('gpt-4.1-mini'),
  OCR_API_KEY: nullableString(),
  OCR_BASE_URL: optionalUrlOrEmpty(['https:', 'http:']),
} satisfies Record<string, FieldParser<unknown>>;

export function parseEnv(input: EnvInput = process.env): ParsedEnv {
  return {
    supabase: {
      url: envSchema.SUPABASE_URL('SUPABASE_URL', input.SUPABASE_URL),
      anonKey: envSchema.SUPABASE_ANON_KEY(
        'SUPABASE_ANON_KEY',
        input.SUPABASE_ANON_KEY,
      ),
      serviceRoleKey: envSchema.SUPABASE_SERVICE_ROLE_KEY(
        'SUPABASE_SERVICE_ROLE_KEY',
        input.SUPABASE_SERVICE_ROLE_KEY,
      ),
      storage: {
        rawBucket: envSchema.SUPABASE_STORAGE_RAW_BUCKET(
          'SUPABASE_STORAGE_RAW_BUCKET',
          input.SUPABASE_STORAGE_RAW_BUCKET,
        ),
        derivedBucket: envSchema.SUPABASE_STORAGE_DERIVED_BUCKET(
          'SUPABASE_STORAGE_DERIVED_BUCKET',
          input.SUPABASE_STORAGE_DERIVED_BUCKET,
        ),
      },
    },
    ai: (() => {
      const globalApiKey = envSchema.LLM_API_KEY(
        'LLM_API_KEY',
        input.LLM_API_KEY,
      );
      const globalBaseUrl = envSchema.LLM_BASE_URL(
        'LLM_BASE_URL',
        input.LLM_BASE_URL,
      );

      return {
        summary: {
          apiKey:
            envSchema.SUMMARY_API_KEY(
              'SUMMARY_API_KEY',
              input.SUMMARY_API_KEY,
            ) ?? globalApiKey,
          baseUrl:
            envSchema.SUMMARY_BASE_URL(
              'SUMMARY_BASE_URL',
              input.SUMMARY_BASE_URL,
            ) || globalBaseUrl,
          model: envSchema.SUMMARY_MODEL(
            'SUMMARY_MODEL',
            input.SUMMARY_MODEL,
          ),
        },
        embedding: {
          apiKey:
            envSchema.EMBEDDING_API_KEY(
              'EMBEDDING_API_KEY',
              input.EMBEDDING_API_KEY,
            ) ?? globalApiKey,
          baseUrl:
            envSchema.EMBEDDING_BASE_URL(
              'EMBEDDING_BASE_URL',
              input.EMBEDDING_BASE_URL,
            ) || globalBaseUrl,
          model: envSchema.EMBEDDING_MODEL(
            'EMBEDDING_MODEL',
            input.EMBEDDING_MODEL,
          ),
        },
        transcription: {
          apiKey:
            envSchema.TRANSCRIPTION_API_KEY(
              'TRANSCRIPTION_API_KEY',
              input.TRANSCRIPTION_API_KEY,
            ) ?? globalApiKey,
          baseUrl:
            envSchema.TRANSCRIPTION_BASE_URL(
              'TRANSCRIPTION_BASE_URL',
              input.TRANSCRIPTION_BASE_URL,
            ) || globalBaseUrl,
          model: envSchema.TRANSCRIPTION_MODEL(
            'TRANSCRIPTION_MODEL',
            input.TRANSCRIPTION_MODEL,
          ),
        },
        ocr: {
          apiKey:
            envSchema.OCR_API_KEY(
              'OCR_API_KEY',
              input.OCR_API_KEY,
            ) ?? globalApiKey,
          baseUrl:
            envSchema.OCR_BASE_URL(
              'OCR_BASE_URL',
              input.OCR_BASE_URL,
            ) || globalBaseUrl,
          model: envSchema.OCR_MODEL(
            'OCR_MODEL',
            input.OCR_MODEL,
          ),
        },
      };
    })(),
  };
}

export function hasSupabaseRuntimeEnv(input: EnvInput = process.env): boolean {
  return Boolean(
    input.SUPABASE_URL &&
      input.SUPABASE_ANON_KEY &&
      input.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function requiredUrl(allowedProtocols: string[]): FieldParser<string> {
  return (name, value) => {
    const normalizedValue = requiredString()(name, value);
    assertAllowedUrl(name, normalizedValue, allowedProtocols);
    return normalizedValue;
  };
}

function requiredString(): FieldParser<string> {
  return (name, value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${name} is required`);
    }

    return value;
  };
}

function optionalString(defaultValue: string): FieldParser<string> {
  return (_name, value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return defaultValue;
    }

    return value;
  };
}

function optionalUrl(
  defaultValue: string,
  allowedProtocols: string[],
): FieldParser<string> {
  return (name, value) => {
    const normalizedValue = optionalString(defaultValue)(name, value);
    assertAllowedUrl(name, normalizedValue, allowedProtocols);
    return normalizedValue;
  };
}

function optionalUrlOrEmpty(
  allowedProtocols: string[],
): FieldParser<string> {
  return (name, value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return '';
    }
    assertAllowedUrl(name, value, allowedProtocols);
    return value;
  };
}

function nullableString(): FieldParser<string | null> {
  return (_name, value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }

    return value;
  };
}

function assertAllowedUrl(
  name: string,
  value: string,
  allowedProtocols: string[],
): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    throw new Error(
      `${name} must use one of: ${allowedProtocols.join(', ')}`,
    );
  }
}
