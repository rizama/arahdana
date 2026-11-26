import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
export function connectDatabase(url: string) {
 const pool = new pg.Pool({ connectionString: url });
 return { pool, db: drizzle(pool) };
}
