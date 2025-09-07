import { Pool, PoolConfig } from 'pg';

function buildConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;
  if (host && user && password && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  return undefined;
}

const connectionString = buildConnectionString();

const config: PoolConfig = connectionString
  ? { connectionString }
  : {};

// Railway/Postgres geralmente exige SSL em produção
if (process.env.NODE_ENV === 'production') {
  (config as any).ssl = { rejectUnauthorized: false };
}

export const pgPool = new Pool(config);

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>
{
  const result = await pgPool.query(text, params);
  return { rows: result.rows as T[] };
}


