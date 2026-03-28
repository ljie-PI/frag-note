type EnvInput = Record<string, string | undefined>;

export type ParsedEnv = {
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  objectStore: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  };
};

type FieldParser<T> = (name: string, value: string | undefined) => T;

const localObjectStoreDefaults = {
  endpoint: 'http://127.0.0.1:9000',
  region: 'us-east-1',
  bucket: 'sui-note-dev',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  forcePathStyle: true,
} as const;

const envSchema = {
  DATABASE_URL: requiredUrl(['postgres:', 'postgresql:']),
  REDIS_URL: requiredUrl(['redis:']),
  OBJECT_STORE_ENDPOINT: optionalUrl(
    ['http:', 'https:'],
    localObjectStoreDefaults.endpoint,
  ),
  OBJECT_STORE_REGION: optionalString(localObjectStoreDefaults.region),
  OBJECT_STORE_BUCKET: optionalString(localObjectStoreDefaults.bucket),
  OBJECT_STORE_ACCESS_KEY_ID: optionalString(
    localObjectStoreDefaults.accessKeyId,
  ),
  OBJECT_STORE_SECRET_ACCESS_KEY: optionalString(
    localObjectStoreDefaults.secretAccessKey,
  ),
  OBJECT_STORE_FORCE_PATH_STYLE: optionalBoolean(
    localObjectStoreDefaults.forcePathStyle,
  ),
} satisfies Record<string, FieldParser<unknown>>;

export function parseEnv(input: EnvInput = process.env): ParsedEnv {
  return {
    database: {
      url: envSchema.DATABASE_URL('DATABASE_URL', input.DATABASE_URL),
    },
    redis: {
      url: envSchema.REDIS_URL('REDIS_URL', input.REDIS_URL),
    },
    objectStore: {
      endpoint: envSchema.OBJECT_STORE_ENDPOINT(
        'OBJECT_STORE_ENDPOINT',
        input.OBJECT_STORE_ENDPOINT,
      ),
      region: envSchema.OBJECT_STORE_REGION(
        'OBJECT_STORE_REGION',
        input.OBJECT_STORE_REGION,
      ),
      bucket: envSchema.OBJECT_STORE_BUCKET(
        'OBJECT_STORE_BUCKET',
        input.OBJECT_STORE_BUCKET,
      ),
      accessKeyId: envSchema.OBJECT_STORE_ACCESS_KEY_ID(
        'OBJECT_STORE_ACCESS_KEY_ID',
        input.OBJECT_STORE_ACCESS_KEY_ID,
      ),
      secretAccessKey: envSchema.OBJECT_STORE_SECRET_ACCESS_KEY(
        'OBJECT_STORE_SECRET_ACCESS_KEY',
        input.OBJECT_STORE_SECRET_ACCESS_KEY,
      ),
      forcePathStyle: envSchema.OBJECT_STORE_FORCE_PATH_STYLE(
        'OBJECT_STORE_FORCE_PATH_STYLE',
        input.OBJECT_STORE_FORCE_PATH_STYLE,
      ),
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

function optionalUrl(
  allowedProtocols: string[],
  defaultValue: string,
): FieldParser<string> {
  return (name, value) => {
    const normalizedValue = optionalString(defaultValue)(name, value);
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

function optionalBoolean(defaultValue: boolean): FieldParser<boolean> {
  return (name, value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return defaultValue;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    throw new Error(`${name} must be "true" or "false"`);
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
