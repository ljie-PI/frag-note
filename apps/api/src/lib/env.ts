type EnvInput = Record<string, string | undefined>;

export type ParsedEnv = {
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
};

type FieldParser<T> = (name: string, value: string | undefined) => T;

const envSchema = {
  DATABASE_URL: requiredUrl(['postgres:', 'postgresql:']),
  REDIS_URL: requiredUrl(['redis:']),
} satisfies Record<string, FieldParser<unknown>>;

export function parseEnv(input: EnvInput = process.env): ParsedEnv {
  return {
    database: {
      url: envSchema.DATABASE_URL('DATABASE_URL', input.DATABASE_URL),
    },
    redis: {
      url: envSchema.REDIS_URL('REDIS_URL', input.REDIS_URL),
    },
  };
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
