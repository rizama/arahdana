import { Router } from 'express';
import { z } from 'zod';
import type { connectDatabase } from '../../db/client.js';
import { saveFeedback } from './service.js';
const schema = z.strictObject({
  email: z.union([z.literal(''), z.email().max(254)]).default(''),
  message: z.string().trim().min(1).max(5000),
  page: z.string().max(100).regex(/^\/(?!\/)[A-Za-z0-9/_-]*$/).default('/')
});
export function feedbackRoutes(db: ReturnType<typeof connectDatabase>['db']) {
  const router = Router();
  router.post('/', async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Periksa email, pesan (1–5000 karakter), dan halaman lokal.' }); return; }
    const row = await saveFeedback(db, parsed.data);
    res.status(201).json({ id: row.id, message: 'Terima kasih. Masukanmu sudah tersimpan.' });
  });
  return router;
}
