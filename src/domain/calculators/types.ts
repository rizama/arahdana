import type { z } from 'zod';
import type { inputSchema, levelSchema, slugSchema } from './schemas.js';
export type CalculatorInput = z.infer<typeof inputSchema>;
export type CalculatorSlug = z.infer<typeof slugSchema>;
export type EducationLevel = z.infer<typeof levelSchema>['level'];
export type NumericKey = { [K in keyof CalculatorInput]-?: NonNullable<CalculatorInput[K]> extends number ? K : never }[keyof CalculatorInput];
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Result = { [key: string]: Json };
export interface EducationStage {
  [key: string]: Json;
  level: EducationLevel; years_until_entry: number; duration: number; entrance: number; tuition: number; other: number; target: number;
}
