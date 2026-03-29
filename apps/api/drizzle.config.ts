const drizzleConfig = {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.SUPABASE_DB_URL ??
      'postgresql://postgres:postgres@127.0.0.1:5432/sui_note',
  },
  verbose: true,
  strict: true,
} as const;

export default drizzleConfig;
