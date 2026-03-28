import { describe, expect, it } from 'vitest';

describe('parseEnv', () => {
  it('requires database and redis configuration', async () => {
    const { parseEnv } = await import('../env');

    expect(
      parseEnv({
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/sui_note',
        REDIS_URL: 'redis://127.0.0.1:6379',
      }),
    ).toMatchObject({
      database: {
        url: 'postgresql://postgres:postgres@127.0.0.1:5432/sui_note',
      },
      redis: {
        url: 'redis://127.0.0.1:6379',
      },
    });

    expect(() =>
      parseEnv({
        REDIS_URL: 'redis://127.0.0.1:6379',
      }),
    ).toThrow(/DATABASE_URL/i);

    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/sui_note',
      }),
    ).toThrow(/REDIS_URL/i);
  });
});
