import { beforeAll,afterAll,it,expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { httpHarness } from './harness.js';
import { fv } from '../../src/domain/calculators/math.js';
let h:Awaited<ReturnType<typeof httpHarness>>;
beforeAll(async()=>{h=await httpHarness();});afterAll(async()=>h.close());
async function result(slug:string,data:unknown={}){const r=await h.post(slug,data);expect(r.status).toBe(200);return r.json();}
const oracle = existsSync('fixtures/source-excerpts.json')
  ? JSON.parse(execFileSync('node', ['fixtures/compare-source.js'], { encoding: 'utf8' }))
  : null;
it('baseline 01 all_calculators',async()=>{
 for(const [slug,data,expected] of [
 ['annuity',{years:1,rate:0,initial:100,payment:10,target:300},220],['dana-darurat',{years:1,expense:100,married:false,dependents:0},600],
 ['properti',{years:2,price:1000,dp:20,inflation:10},242],['kendaraan',{years:2,price:1000,dp:20,inflation:10},242],
 ['barang',{years:2,price:1000,dp:100,inflation:0},1000],['menikah',{years:1,venue:100,catering:200,clothing:50,other:50,inflation:10},440],
 ['dana-pensiun',{years:1,expense:100,inflation:10},33000],['pendidikan-anak',{years:1,entrance:100,tuition:10,study_years:2,inflation:10},374]
 ] as const) {const r=await result(slug,data);expect(Math.abs((slug==='annuity'?r.future_value:r.target)-expected)).toBeLessThan(.01);expect(r.timeline.length).toBeGreaterThan(0);}
 const r=await result('simulasi-kpr',{years:1,price:1200,dp:0,rate:0,fixed_months:12,floating:0});expect(r.first_payment).toBe(100);expect(r.total_interest).toBe(0);
});
it('baseline 02 compound_and_switch',async()=>{
 for(const [timing,expected] of [['end',210],['beginning',220]] as const) expect((await result('annuity',{years:1,frequency:'yearly',timing,initial:100,payment:100,rate:10})).future_value).toBe(expected);
 const r=await result('simulasi-kpr',{years:2,price:1e6,rate:6,fixed_months:12,floating:12});expect(r.timeline[12].payment).toBeGreaterThan(r.first_payment);expect(r.timeline.at(-1).balance).toBeLessThan(.000001);
});
it.skipIf(!oracle)('baseline 03 source_formula_fixtures',async()=>{
 const levels=[['sd',1e7,1e6,10,12],['smp',2e7,2e6,5,12],['sma',3e7,3e6,10,12],['s1',4e7,1e7,10,2]].map(([level,entrance,tuition,other_percent,multiplier])=>({level,entrance,tuition,other_percent,multiplier}));
 const r=await result('pendidikan-anak',{child_age:3,inflation:5,levels,rate:6,initial:5e6,payment:1e6,income:15e6});expect(r.years).toBe(19);expect(Math.abs(r.future_value-oracle.fv[1])).toBeLessThan(.01);
 for(const row of r.education_stages) {const e=oracle.education[row.level];expect(Math.abs(row.target-Number(e.biaya))).toBeLessThan(.1);for(const [key,src] of [['entrance','up'],['tuition','spp'],['other','dll']]) expect(Math.abs(row[key]-e.breakdown[src])).toBeLessThan(.00001);}
 expect(r.education_stages[0].optimal.payment).toBe(oracle.optimal.investment);
 const wedding=await result('menikah',{wedding_mode:'detailed',years:2,inflation:5,venue:3e7,mc:2e6,wo:5e6,makeup:3e6,pakaian:4e6,mahar:1e7,dokumentasi:6e6,music:2e6,dekorasi:5e6,etc:1e6,count_catering:200,price_catering:1e5,count_souvenir:100,price_souvenir:2e4,count_invitation:100,price_invitation:1e4});expect(wedding.target).toBe(oracle.wedding);expect(wedding.breakdown).toHaveLength(13);
 const annuity=await result('annuity',{years:5,rate:6,payment:1e6,target:1e8});expect(annuity.recommendations.return_percent).toBe(oracle.return_search.rate);
});
it('baseline 04 retirement_ages_recommendations_and_validation',async()=>{
 const r=await result('dana-pensiun',{age:30,retirement_age:55,expense:5e6,inflation:5});expect(r.years).toBe(25);expect(r.target).toBe(5e6*12*1.05**25/.04);
 for(const age of [55,60]) expect((await h.post('dana-pensiun',{age,retirement_age:55})).status).toBe(400);
 for(const levels of [[],[{level:'bad'}],[{level:'sd'},{level:'sd'}]]) expect((await h.post('pendidikan-anak',{levels})).status).toBe(400);
 const a=await result('annuity',{years:5,rate:6,payment:1e6,target:1e8});expect(a.recommendations.payment_value).toBeGreaterThanOrEqual(a.target);expect(a.recommendations.payment-a.recommended_payment).toBeLessThan(50000);
});
it('baseline 05 calculator response remains deterministic across server restart (feedback persistence in T-JS-01 suite)',async()=>{
 const before=await result('annuity',{rate:0});await h.close();h=await httpHarness();const after=await result('annuity',{rate:0});expect(after).toEqual(before);
});
it('baseline 06 rejects_invalid_feedback_and_csrf + calculator CSRF/Origin',async()=>{
 const invalidHeaders:Record<string,string>[]=[{'X-CSRF-Token':''},{Origin:'https://evil.test'},{Cookie:''}];
 for(const headers of invalidHeaders) expect((await h.post('annuity',{},headers)).status).toBe(403);
 expect((await fetch(h.origin+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(403);
});
it('baseline 07 invalid_numbers + types/enums/slug',async()=>{
 for(const data of [{years:0},{years:101},{rate:-1},{payment:'nan'},{price:'inf'},{rate:true},{years:1/100},{frequency:'bad'},{timing:'bad'},{education_strategy:'bad'},{fixed_months:1201}]) expect((await h.post('barang',data)).status).toBe(400);
 expect((await h.post('unknown',{})).status).toBe(404);
 for(const data of [[],null,'string']) expect((await h.post('annuity',data)).status).toBe(400);
});
it('baseline 08 pages_and_security_headers (foundation + API, calculator pages deferred)',async()=>{
 for(const path of ['/','/api/education-defaults']) {const r=await fetch(h.origin+path);expect(r.status).toBe(200);expect(r.headers.get('content-security-policy')).toContain("form-action 'self'");expect(r.headers.get('content-security-policy')).not.toMatch(/unsafe-inline|unsafe-eval/);}
 const r=await h.post('annuity',{});expect(r.headers.get('cache-control')).toBe('no-store');expect(r.headers.get('x-content-type-options')).toBe('nosniff');
});
it('baseline 09 supports the archive formula policy',async()=>{expect((await result('properti',{formula_policy:'archive'})).recommendations.formula_policy).toBe('archive');});
it('baseline 10 corrected_nominal_and_month_minimum',async()=>{
 for(const rate of [0,6,15]) {const data={years:5,price:5e8,dp:30,inflation:5,initial:5e6,payment:1e6,rate},r=await result('properti',data);let amount=data.payment,value=fv(data.initial,amount,rate/1200,60);while(value<r.target){amount+=value>r.target*.2?50000:200000;value=fv(data.initial,amount,rate/1200,60);}expect(r.recommendations.payment).toBe(amount);}
 expect((await result('dana-darurat',{years:1,expense:1e6,initial:0,payment:1e5,rate:0})).recommendations.months).toBe(60);
});
it('baseline 11 serves local education defaults',async()=>{
 const r=await fetch(h.origin+'/api/education-defaults');expect(await r.json()).toEqual(JSON.parse(readFileSync('src/domain/calculators/education-defaults.json','utf8')));
});
it('baseline 12 composition_duration_and_inflation',async()=>{
 for(const slug of ['annuity','dana-darurat','properti','kendaraan','barang','menikah','dana-pensiun','pendidikan-anak']) {
  const r=await result(slug,{years:5,rate:8,inflation:10,initial:5e6,payment:1e6,wedding_mode:'simple'});expect(Math.abs(r.principal+r.interest_earned-r.future_value)).toBeLessThan(.01);expect(Math.abs(r.principal_percent+r.interest_percent-100)).toBeLessThan(1e-10);
  for(const prefix of ['payment','return','duration']) if(r.recommendations[prefix+'_principal']!==null) expect(Math.abs(r.recommendations[prefix+'_principal_percent']+r.recommendations[prefix+'_interest_percent']-100)).toBeLessThan(1e-10);
  if(['barang','dana-darurat'].includes(slug))expect(r.recommendations.duration_unit).toBe('months');
  const s=r.recommendations.stepped_inflation;if(s?.reaches_target){const t=s.years;expect(Math.abs(s.adjusted_target-r.target/1.1**5*1.1**Math.min(t,5)*1.03**Math.max(0,Math.min(t-5,5))*1.01**Math.max(0,t-10))).toBeLessThan(.01);expect(s.value).toBeGreaterThanOrEqual(s.adjusted_target);}
 }
 const r=await result('barang',{payment:0,initial:0,price:1e15,years:100,rate:0});expect(r.recommendations.months).toBeNull();expect(r.recommendations.stepped_inflation.reaches_target).toBe(false);
});
it('baseline 13 status_names_and_zero',async()=>{
 for(const [initial,state] of [[100,'success'],[95,'almost'],[80,'failed']]){const r=await result('annuity',{target:100,payment:0,rate:0,initial,dream_name:'<script>'});expect(r.strategy_state).toBe(state);expect(r.dream_name).toBe('<script>');}
 expect((await result('annuity',{target:0,initial:0,payment:0,rate:0})).principal_percent).toBe(0);
 for(const entrance of [0,100]){const r=await result('pendidikan-anak',{levels:[{level:'sd',entrance}]});expect(r.education_stages[0].share_percent).toBe(entrance?100:0);}
});
it('baseline 14 mortgage_fees_and_thresholds',async()=>{
 const data={price:5e8,dp:20,years:15,rate:6,fixed_months:36,floating:10},r=await result('simulasi-kpr',data);expect(r.affordability).toBeNull();expect(Math.abs(r.fixed_interest+r.floating_interest-r.total_interest)).toBeLessThan(.0001);
 for(const [ratio,status] of [[14.9,'sangat_sehat'],[15,'sehat'],[29.9,'sehat'],[30,'tidak_sehat'],[49.9,'tidak_sehat'],[50,'berbahaya']]) {const x=await result('simulasi-kpr',{...data,income:r.max_payment*100/(ratio as number)});expect(x.affordability.status).toBe(status);}
 for(const [price,percent] of [[1e8,.025],[1e8+1,.015],[1e9,.015],[1e9+1,.01]]){const x=await result('simulasi-kpr',{...data,price,njop:price});expect(x.fees.notaris).toBe(price*percent);expect(x.fees.bphtb).toBe(0);expect(x.fees.total_other_fees).toBe(['ajb','balik_nama','notaris','provisi','appraisal','admin','bphtb'].reduce((a,k)=>a+x.fees[k],0));}
 const x=await result('simulasi-kpr',{...data,njop:6e7,fixed_months:0});expect(x.fixed_interest).toBe(0);expect(x.balance_after_fixed).toBe(x.principal);expect(x.fees.bphtb).toBe(22e6);
});
it('baseline 15 optional_http_validation',async()=>{
 for(const data of [{formula_policy:'bad'},{dream_name:'x'.repeat(81)},{child_name:12}]) expect((await h.post('annuity',data)).status).toBe(400);
 for(const data of [{income:-1},{njop:1e16},{married:1}]) expect((await h.post('simulasi-kpr',data)).status).toBe(400);
});
