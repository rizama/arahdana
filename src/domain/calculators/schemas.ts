import { z } from 'zod';
export const slugs = ['annuity','dana-darurat','properti','kendaraan','barang','menikah','dana-pensiun','pendidikan-anak','simulasi-kpr'] as const;
export const slugSchema = z.enum(slugs);
const amount = z.number().min(0).max(1e15);
const bounded = (max: number) => z.number().min(0).max(max).optional();
export const levelSchema = z.strictObject({
  level: z.enum(['sd','smp','sma','s1']), entrance: amount.optional(), tuition: amount.optional(),
  other_percent: bounded(100), multiplier: z.union([z.literal(1), z.literal(2), z.literal(12)]).optional()
});
export const inputSchema = z.strictObject({
  years: bounded(100), rate: bounded(100), inflation: bounded(100), initial: amount.optional(), payment: amount.optional(),
  target: amount.optional(), price: amount.optional(), dp: bounded(100), expense: amount.optional(), income: amount.optional(), njop: amount.optional(),
  fixed_months: bounded(1200), floating: bounded(100), age: bounded(100), retirement_age: bounded(100),
  child_age: bounded(25), dependents: bounded(100), married: z.boolean().optional(),
  frequency: z.enum(['monthly','yearly']).optional(), timing: z.enum(['beginning','end']).optional(),
  formula_policy: z.enum(['corrected','archive']).optional(), education_strategy: z.enum(['up','upSpp','allIn']).optional(),
  dream_name: z.string().refine(s => [...s].length <= 80).optional(), child_name: z.string().refine(s => [...s].length <= 80).optional(),
  levels: z.array(levelSchema).min(1).max(4).optional(), study_years: bounded(20),
  entrance: amount.optional(), tuition: amount.optional(), wedding_mode: z.enum(['simple','detailed']).optional(), budget: amount.optional(),
  venue: amount.optional(), mc: amount.optional(), wo: amount.optional(), makeup: amount.optional(), pakaian: amount.optional(),
  mahar: amount.optional(), dokumentasi: amount.optional(), music: amount.optional(), dekorasi: amount.optional(), etc: amount.optional(),
  catering: amount.optional(), clothing: amount.optional(), other: amount.optional(),
  count_catering: bounded(1e6), count_souvenir: bounded(1e6), count_invitation: bounded(1e6),
  price_catering: amount.optional(), price_souvenir: amount.optional(), price_invitation: amount.optional()
});
