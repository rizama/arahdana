import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { connectDatabase } from './client.js';
const url = process.env[process.argv.includes('--test') ? 'TEST_DATABASE_URL' : 'DATABASE_URL'];
if (!url) throw new Error('Database environment required');
const { pool, db } = connectDatabase(url);
try { await migrate(db, { migrationsFolder: 'migrations' }); console.log('Migrations applied'); } catch { console.error('Migration failed; check database configuration'); process.exitCode = 1; } finally { await pool.end(); }
