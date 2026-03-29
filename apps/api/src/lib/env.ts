type EnvInput = Record<string, string | undefined>;

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
    openAiApiKey: string | null;
  };
};

type FieldParser<T> = (name: string, value: string | undefined) => T;

const envSchema = {
  SUPABASE_URL: requiredUrl(['https:', 'http:']),
  SUPABASE_ANON_KEY: requiredString(),
  SUPABASE_SERVICE_ROLE_KEY: requiredString(),
  SUPABASE_STORAGE_RAW_BUCKET: optionalString('captures-raw'),
  SUPABASE_STORAGE_DERIVED_BUCKET: optionalString('captures-derived'),
  OPENAI_API_KEY: nullableString(),
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
    ai: {
      openAiApiKey: envSchema.OPENAI_API_KEY(
        'OPENAI_API_KEY',
        input.OPENAI_API_KEY,
      ),
    },
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
