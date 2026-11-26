import { it,expect } from 'vitest';
import { calculate,acceleratedPayoff } from '../../src/domain/calculators/calculators.js';
import { pythonRound,fv } from '../../src/domain/calculators/math.js';
import { availableLevels,resetEducationSelection,schoolTypes,educationPreset } from '../../src/domain/calculators/education.js';
it('Python ties-to-even operates on binary value rather than epsilon rounding',()=>{
 for(const [n,d,expected] of [[2.5,0,2],[3.5,0,4],[-2.5,0,-2],[2.675,2,2.67],[1.005,2,1],[.125,2,.12],[.375,2,.38],[125,-1,120]]) expect(pythonRound(n,d)).toBe(expected);
 expect(fv(100,10,0,12,false)).toBe(220);
});
it('rejects nonfinite numbers, strings and booleans without coercion',()=>{
 for(const value of [NaN,Infinity,-Infinity,'6',true,null,-1,101]) expect(()=>calculate('annuity',{rate:value})).toThrow();
 for(const value of ['x'.repeat(81),12]) expect(()=>calculate('annuity',{dream_name:value})).toThrow();
 expect(calculate('annuity',{dream_name:' <script> ',child_name:'😀'.repeat(80)}).dream_name).toBe('<script>');
});
it('bounds accelerated payoff and detects nonamortization',()=>{
 expect(acceleratedPayoff(1e9,1000,36,.1,.1).feasible).toBe(false);
 expect(acceleratedPayoff(1e9,1,36,0,0).estimated_months).toBeNull();
 expect(acceleratedPayoff(0,0,0,0,0).estimated_months).toBe(0);
});
it('resets stale levels at exact ages and requires continuous range',()=>{
 for(const [age,level] of [[6,'sd'],[12,'smp'],[15,'sma']] as const) {
  expect(availableLevels(age)).not.toContain(level);
  expect(()=>calculate('pendidikan-anak',{child_age:age,levels:[{level}]})).toThrow();
 }
 expect(resetEducationSelection(12,['sd','smp','sma','s1'])).toEqual(['sma','s1']);
 expect(resetEducationSelection(3,['sd','s1'])).toEqual(['sd','smp','sma','s1']);
 expect(()=>calculate('pendidikan-anak',{levels:[{level:'sd'},{level:'s1'}]})).toThrow();
 expect(()=>calculate('pendidikan-anak',{levels:[{level:'sd'},{level:'sd'}]})).toThrow();
});
it('replaces region presets, restricts types and defaults S1 to semester',()=>{
 expect(schoolTypes('s1','jakarta')).toEqual(['negeri','swasta']);
 expect(schoolTypes('sd','jawa')).toHaveLength(4);
 const old=educationPreset('sd','jakarta','swasta'),next=educationPreset('sd','abroad','swasta');
 expect(next.school).toBe('general');expect(next.entrance).not.toBe(old.entrance);expect(next.tuition).toBe(16e6);
 expect(educationPreset('s1','jawa','negeri').multiplier).toBe(2);
 expect(()=>educationPreset('s1','jakarta','internasional')).toThrow();
 for (const multiplier of [1,2,12]) {
  const r=calculate('pendidikan-anak',{inflation:0,levels:[{level:'s1',tuition:100,multiplier}]});
  expect((r.education_stages as {tuition:number}[])[0].tuition).toBe(100*multiplier*4);
 }
});

it('tiny positive return remains finite near the zero-rate limit',()=>{
 const r=calculate('annuity',{rate:1e-20,years:1,initial:100,payment:10});
 expect(r.future_value).toBe(220);
 expect(Number.isFinite(r.recommended_payment)).toBe(true);
});

it('tiny mortgage rates avoid zero denominator',()=>{
 const r=calculate('simulasi-kpr',{rate:1e-20,floating:1e-20,years:1,price:1200,dp:0,fixed_months:6});
 expect(r.first_payment).toBeCloseTo(100,10);
 expect(JSON.stringify(r.timeline)).not.toContain('null');
});
