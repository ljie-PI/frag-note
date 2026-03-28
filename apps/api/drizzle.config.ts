const localDatabaseUrl =
  'postgresql://postgres:postgres@127.0.0.1:5432/sui_note';

const drizzleConfig = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
  verbose: true,
  strict: true,
} as const;

export default drizzleConfig;
