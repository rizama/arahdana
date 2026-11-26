import { beforeAll,afterAll,it,expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { calculate,educationRecommendation } from '../../src/domain/calculators/calculators.js';
import { fv,pythonRound } from '../../src/domain/calculators/math.js';
import { slugs } from '../../src/domain/calculators/schemas.js';
import { python,compare } from './helpers.js';
import { httpHarness } from '../api/harness.js';
let http:Awaited<ReturnType<typeof httpHarness>>;
beforeAll(async()=>{http=await httpHarness();});afterAll(async()=>http.close());
const cases:{kind:string;data:Record<string,unknown>}[]=[];
for (const kind of slugs) {
  for (const rate of [0,6,15,100]) for (const payment of [0,1e6]) cases.push({kind,data:{years:5,rate,payment}});
  cases.push({kind,data:{years:1/12,rate:0,initial:1e9,payment:0,target:1}});
}
for (const frequency of ['monthly','yearly']) for (const timing of ['beginning','end']) cases.push({kind:'annuity',data:{years:2,rate:10,frequency,timing,initial:100,payment:100}});
for (const age of [30,55,60]) cases.push({kind:'dana-pensiun',data:{age,retirement_age:55}});
for (const fixed_months of [0,12,36,1200]) for (const rate of [0,6]) cases.push({kind:'simulasi-kpr',data:{years:2,fixed_months,rate,income:3e7,njop:6e7}});
for (const income of [0,3e6,15e6,5e7,6e7]) for (const education_strategy of ['up','upSpp','allIn']) cases.push({kind:'pendidikan-anak',data:{child_age:3,income,education_strategy,levels:[{level:'sd',entrance:1e7,tuition:1e6},{level:'smp',entrance:2e7,tuition:2e6},{level:'sma',entrance:3e7,tuition:3e6},{level:'s1',entrance:4e7,tuition:1e7}]}});
for (const multiplier of [1,2,12]) cases.push({kind:'pendidikan-anak',data:{levels:[{level:'s1',entrance:123.45,tuition:567.89,multiplier}]}});
for (const years of [2.5/12,3.5/12]) cases.push({kind:'annuity',data:{years,rate:0}});
const baseline = process.env.ARDA_PARITY_BASELINE;
const references = baseline ? python(cases, baseline) : null;
for (const [index,c] of cases.entries()) it.skipIf(!references)(`Python differential HTTP ${index+1}: ${c.kind}`,async()=>{
  const r=await http.post(c.kind,c.data),expected=references![index];
  if(expected.invalid) expect(r.status).toBe(400); else {expect(r.status).toBe(200);compare(await r.json(),expected.result);compare(calculate(c.kind,c.data),expected.result);}
});
const oracle = existsSync('fixtures/source-excerpts.json')
  ? JSON.parse(execFileSync('node', ['fixtures/compare-source.js'], { encoding: 'utf8' }))
  : null;
if (oracle) expect(oracle.archive_cases).toHaveLength(81);
for (const [i,c] of (oracle?.archive_cases ?? []).entries()) it(`archive VM HTTP ${i+1}`,async()=>{
  const data={years:c.years,rate:c.rate,payment:c.input_payment,initial:5e6,price:5e8,dp:30,inflation:5,wedding_mode:'simple',budget:15e7,formula_policy:'archive'};
  const r=await http.post(c.kind,data);expect(r.status).toBe(200);const body=await r.json();
  expect(body.recommendations.payment).toBe(c.payment);expect(Math.abs(body.recommendations.payment_value-c.payment_value)).toBeLessThanOrEqual(1);
  expect(body.recommendations.archive_parity.archive_rate_percent).toBe(c.years);
});
it.skipIf(!oracle)('source optimizer bands, including zero-year nonconvergence',()=>{
 for(const c of oracle.optimizer_cases) { const result=educationRecommendation(104417775,5e6,1e6,.06,c.years,c.income,pythonRound(fv(5e6,12e6,.06,c.years),2));expect(result.payment).toBe(c.investment);expect(result.return_percent).toBe(c.return);expect(Math.abs(result.future_value-c.future)).toBeLessThanOrEqual(.01); }
});
