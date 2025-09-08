import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

async function main() {
  try {
    if (process.env.ALLOW_INSECURE_TLS === 'true') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf8');

    const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL não definida');
    }

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('✅ Schema aplicado com sucesso');
  } catch (err) {
    console.error('❌ Falha ao aplicar schema:', err);
    process.exit(1);
  }
}

await main();


