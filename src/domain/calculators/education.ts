import defaults from './education-defaults.json' with { type: 'json' };
import type { EducationLevel } from './types.js';
export const educationDefaults = defaults;
const order: EducationLevel[] = ['sd','smp','sma','s1'];
const entry = {sd:6,smp:12,sma:15,s1:18};
export type Region = 'jakarta'|'jawa'|'luarJawa'|'abroad';
export function availableLevels(age: number): EducationLevel[] {
  return order.filter(level => level==='s1' ? age<=entry[level] : age<entry[level]);
}
export function resetEducationSelection(age: number, selected: EducationLevel[]): EducationLevel[] {
  const valid=order.filter(level=>selected.includes(level) && availableLevels(age).includes(level));
  return valid.length ? order.slice(order.indexOf(valid[0]),order.indexOf(valid.at(-1)!)+1) : [];
}
export function schoolTypes(level: EducationLevel, region: Region): string[] {
  return Object.keys(defaults[level][region]);
}
// Replaces the entire previous preset; costs from the old region cannot leak through.
export function educationPreset(level: EducationLevel, region: Region, school?: string) {
  const key=region==='abroad'?'general':school;
  const choices: Record<string,{up:number;spp:number}>=defaults[level][region];
  if (!key || !Object.hasOwn(choices,key)) throw new RangeError('Jenis sekolah tidak valid');
  return {level,entrance:choices[key].up,tuition:choices[key].spp,other_percent:10,multiplier:level==='s1'?2:12,school:key};
}
