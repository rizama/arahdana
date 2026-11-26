import type { connectDatabase } from '../../db/client.js';
import { feedback } from '../../db/schema.js';
export async function saveFeedback(db: ReturnType<typeof connectDatabase>['db'], data: { email: string; message: string; page: string }) {
  const [row] = await db.insert(feedback).values(data).returning({ id: feedback.id });
  return row;
}
