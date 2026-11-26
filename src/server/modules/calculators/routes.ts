import { Router } from 'express';
import { ZodError } from 'zod';
import { calculate } from '../../../domain/calculators/calculators.js';
import { slugSchema } from '../../../domain/calculators/schemas.js';
export function calculatorRoutes() {
  const router = Router();
  router.post('/:slug', (req, res, next) => {
    if (!slugSchema.safeParse(req.params.slug).success) { res.status(404).json({ error: 'Kalkulator tidak ditemukan' }); return; }
    try { res.json(calculate(req.params.slug, req.body)); }
    catch (error) {
      if (error instanceof ZodError || error instanceof RangeError) { res.status(400).json({ error: 'Input kalkulator tidak valid' }); return; }
      next(error);
    }
  });
  return router;
}
