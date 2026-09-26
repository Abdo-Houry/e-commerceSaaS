// Creates the application database (and required extensions) if missing.
// TypeORM can only connect to an existing database, so this runs before migrations.
import { Client } from 'pg';
import { db, dbSsl } from '../config/env';

export async function createDatabaseIfMissing(name: string = db.database): Promise<void> {
  const base = { host: db.host, port: db.port, user: db.username, password: db.password, ssl: dbSsl };

  // Managed hosts create the database for us and forbid connecting to "postgres",
  // so only go looking for it when it isn't reachable already.
  if (!(await canConnect({ ...base, database: name }))) {
    const admin = new Client({ ...base, database: 'postgres' });
    await admin.connect();
    try {
      const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
      if (rowCount === 0) {
        await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
        console.log(`Database "${name}" created.`);
      }
    } finally {
      await admin.end();
    }
  }

  const app = new Client({ ...base, database: name });
  await app.connect();
  try {
    await app.query('CREATE EXTENSION IF NOT EXISTS citext');
    await app.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  } finally {
    await app.end();
  }
}

async function canConnect(config: ConstructorParameters<typeof Client>[0]): Promise<boolean> {
  const client = new Client(config);
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

if (require.main === module) {
  createDatabaseIfMissing().catch((err: unknown) => {
    console.error('db:create failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
