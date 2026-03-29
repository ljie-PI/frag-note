import { parseEnv, type ParsedEnv } from './env.js';

type QueryValue = string | number | boolean | null;
type Filter = [string, string, QueryValue | QueryValue[]];

type QueryResult = Promise<{
  data: Array<Record<string, unknown>> | null;
  error: Error | null;
}>;

export type SupabaseChainClient = {
  from(table: string): {
    select(columns?: string): QueryBuilder;
    insert(
      body: Record<string, unknown> | Array<Record<string, unknown>>,
    ): MutationBuilder;
    update(body: Record<string, unknown>): MutationBuilder;
    delete(): MutationBuilder;
    upsert(
      body: Record<string, unknown> | Array<Record<string, unknown>>,
    ): MutationBuilder;
  };
  functions: {
    invoke(
      name: string,
      options: { body: unknown },
    ): Promise<{ data: unknown; error: Error | null }>;
  };
  storage: {
    from(bucket: string): {
      upload(
        key: string,
        body: Uint8Array,
        options?: { upsert?: boolean; contentType?: string },
      ): Promise<{ error: Error | null }>;
      download(
        key: string,
      ): Promise<{ data: Uint8Array | null; error: Error | null }>;
    };
  };
};

export type SupabaseRuntimeClients = {
  env: ParsedEnv;
  serviceClient: SupabaseChainClient;
  userClient: SupabaseChainClient;
};

export function createSupabaseRuntimeClients(
  inputEnv: Record<string, string | undefined> = process.env,
): SupabaseRuntimeClients {
  const env = parseEnv(inputEnv);

  return {
    env,
    serviceClient: createChainClient(env.supabase.url, env.supabase.serviceRoleKey),
    userClient: createChainClient(env.supabase.url, env.supabase.anonKey),
  };
}

type QueryBuilder = {
  eq(column: string, value: QueryValue): QueryBuilder;
  lt(column: string, value: QueryValue): QueryBuilder;
  in(column: string, values: QueryValue[]): QueryBuilder;
  or(expression: string): QueryBuilder;
  order(
    column: string,
    options?: { ascending?: boolean },
  ): QueryBuilder;
  limit(count: number): QueryBuilder;
} & QueryResult;

type MutationBuilder = {
  eq(column: string, value: QueryValue): MutationBuilder;
  select(columns?: string): MutationBuilder;
  limit(count: number): MutationBuilder;
  single(): MutationBuilder;
} & QueryResult;

function createChainClient(url: string, apiKey: string): SupabaseChainClient {
  const headers = {
    apikey: apiKey,
    authorization: `Bearer ${apiKey}`,
  };

  return {
    from(table) {
      return {
        select(columns = '*') {
          return createQueryBuilder(url, table, headers, columns);
        },
        insert(body) {
          return createMutationBuilder(url, table, headers, 'POST', body);
        },
        update(body) {
          return createMutationBuilder(url, table, headers, 'PATCH', body);
        },
        delete() {
          return createMutationBuilder(url, table, headers, 'DELETE', null);
        },
        upsert(body) {
          return createMutationBuilder(url, table, headers, 'POST', body, {
            prefer: 'resolution=merge-duplicates,return=representation',
          });
        },
      };
    },
    functions: {
      async invoke(name, options) {
        try {
          const response = await fetch(`${url}/functions/v1/${name}`, {
            method: 'POST',
            headers: {
              ...headers,
              'content-type': 'application/json',
            },
            body: JSON.stringify(options.body),
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          return { data: await response.json(), error: null };
        } catch (error) {
          return { data: null, error: normalizeError(error) };
        }
      },
    },
    storage: {
      from(bucket) {
        return {
          async upload(key, body, options = {}) {
            try {
              const response = await fetch(
                `${url}/storage/v1/object/${bucket}/${encodePath(key)}`,
                {
                  method: 'POST',
                  headers: {
                    ...headers,
                    'content-type':
                      options.contentType ?? 'application/octet-stream',
                    'x-upsert': options.upsert ? 'true' : 'false',
                  },
                  body,
                },
              );

              if (!response.ok) {
                throw new Error(await response.text());
              }

              return { error: null };
            } catch (error) {
              return { error: normalizeError(error) };
            }
          },
          async download(key) {
            try {
              const response = await fetch(
                `${url}/storage/v1/object/${bucket}/${encodePath(key)}`,
                {
                  method: 'GET',
                  headers,
                },
              );

              if (!response.ok) {
                throw new Error(await response.text());
              }

              return {
                data: new Uint8Array(await response.arrayBuffer()),
                error: null,
              };
            } catch (error) {
              return {
                data: null,
                error: normalizeError(error),
              };
            }
          },
        };
      },
    },
  };
}

function createQueryBuilder(
  url: string,
  table: string,
  headers: Record<string, string>,
  columns: string,
): QueryBuilder {
  const filters = new URLSearchParams();
  filters.set('select', columns);

  const execute = async () => {
    try {
      const response = await fetch(
        `${url}/rest/v1/${table}?${filters.toString()}`,
        { headers },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  };

  const builder = {
    then(onFulfilled, onRejected) {
      return execute().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return execute().catch(onRejected);
    },
    finally(onFinally) {
      return execute().finally(onFinally);
    },
    eq(column: string, value: QueryValue) {
      filters.set(column, `eq.${String(value)}`);
      return builder;
    },
    lt(column: string, value: QueryValue) {
      filters.set(column, `lt.${String(value)}`);
      return builder;
    },
    in(column: string, values: QueryValue[]) {
      filters.set(column, `in.(${values.map((value) => String(value)).join(',')})`);
      return builder;
    },
    or(expression: string) {
      filters.set('or', `(${expression})`);
      return builder;
    },
    order(column: string, options: { ascending?: boolean } = {}) {
      filters.set('order', `${column}.${options.ascending === false ? 'desc' : 'asc'}`);
      return builder;
    },
    limit(count: number) {
      filters.set('limit', String(count));
      return builder;
    },
  };

  return builder as QueryBuilder;
}

function createMutationBuilder(
  url: string,
  table: string,
  headers: Record<string, string>,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: Record<string, unknown> | Array<Record<string, unknown>> | null,
  overrides: { prefer?: string } = {},
): MutationBuilder {
  const filters = new URLSearchParams();
  let selectColumns = '*';
  let returnRepresentation = true;

  const execute = async () => {
    try {
      if (returnRepresentation) {
        filters.set('select', selectColumns);
      }

      const response = await fetch(
        `${url}/rest/v1/${table}${filters.size > 0 ? `?${filters.toString()}` : ''}`,
        {
          method,
          headers: {
            ...headers,
            ...(body
              ? {
                  'content-type': 'application/json',
                }
              : {}),
            prefer:
              overrides.prefer ??
              (returnRepresentation ? 'return=representation' : 'return=minimal'),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (!returnRepresentation || response.status === 204) {
        return { data: [], error: null };
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [],
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: normalizeError(error),
      };
    }
  };

  const builder = {
    then(onFulfilled, onRejected) {
      return execute().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return execute().catch(onRejected);
    },
    finally(onFinally) {
      return execute().finally(onFinally);
    },
    eq(column: string, value: QueryValue) {
      filters.set(column, `eq.${String(value)}`);
      return builder;
    },
    select(columns = '*') {
      selectColumns = columns;
      returnRepresentation = true;
      return builder;
    },
    limit(count: number) {
      filters.set('limit', String(count));
      return builder;
    },
    single() {
      filters.set('limit', '1');
      return builder;
    },
  };

  return builder as MutationBuilder;
}

function encodePath(value: string) {
  return value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
