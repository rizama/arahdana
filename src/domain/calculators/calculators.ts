import { availableLevels } from './education.js';
import { inputSchema, slugSchema } from './schemas.js';
import { fv, pythonRound as round, composition } from './math.js';
import type { CalculatorInput, CalculatorSlug, EducationStage, NumericKey, Result } from './types.js';
const LEVELS = { sd: [6,6], smp: [12,3], sma: [15,3], s1: [18,4] } as const;
const WEDDING = ['venue','mc','wo','makeup','pakaian','mahar','dokumentasi','music','dekorasi','etc'] as const;
function nominal(target: number, initial: number, payment: number, rate: number, periods: number, begin: boolean, current: number) {
  let amount = payment, value = current;
  if (value < target) {
    amount += value > target * .2 ? 50000 : 200000;
    const factor = fv(0,1,rate,periods,begin), base = fv(initial,0,rate,periods);
    value = base + amount * factor;
    if (value < target && value <= target * .2) amount += Math.max(1,Math.floor(((target * .2-base)/factor-amount)/200000)+1)*200000;
    amount += Math.max(0,Math.ceil(((target-base)/factor-amount)/50000))*50000;
    value = fv(initial,amount,rate,periods,begin);
  }
  return [amount,value];
}
function recommendations(target: number, initial: number, payment: number, rate: number, periods: number, begin: boolean, perYear: number, base: number, inflation: number, kind: CalculatorSlug, policy: string): Result {
  const value = fv(initial,payment,rate,periods,begin), years = periods/perYear;
  let [amount,paymentValue] = nominal(target,initial,payment,rate,periods,begin,value);
  let archive: Result | null = null;
  if (['properti','kendaraan','menikah'].includes(kind)) {
    const [archAmount,archValue] = nominal(target,initial,payment,years/1200,periods,begin,value);
    archive = { payment: archAmount, payment_value: archValue, archive_rate_percent: years, differs: archAmount !== amount, note: 'Arsip memakai durasi tahun sebagai return nominal, bukan return input. Default terkoreksi memakai return input.' };
    if (policy === 'archive') { amount = archAmount; paymentValue = archValue; }
  }
  const cap = years <= 5 ? 15 : years <= 10 ? 20 : 30;
  let suggested = Math.floor(rate*perYear*100);
  while (fv(initial,payment,suggested/100/perYear,periods,begin)<target && suggested<cap) suggested++;
  const rateValue = fv(initial,payment,suggested/100/perYear,periods,begin);
  const monthly = ['dana-darurat','barang'].includes(kind);
  let duration: number | null = null, durationValue: number | null = null, durationTarget: number | null = null;
  const inflated = (t: number, stepped = false) => base * (stepped ? (1+inflation)**Math.min(t,5)*1.03**Math.max(0,Math.min(t-5,5))*1.01**Math.max(0,t-10) : (1+inflation)**t);
  for (let count=Math.ceil(monthly ? years*12 : years); count <= (monthly ? 1200 : 100); count++) {
    const t=monthly ? count/12 : count, v=fv(initial,payment,rate,t*perYear,begin);
    if (v>=inflated(t)) { duration=count; durationValue=v; durationTarget=inflated(t); break; }
  }
  const instruments=years<1 ? ['Reksadana Pasar Uang','Deposito Jangka Pendek'] : years<=5 ? ['Reksadana Pendapatan Tetap','Obligasi Negara'] : years<=10 ? ['Saham','Reksadana Indeks','Reksadana Campuran','Exchange-Traded Fund (ETF)','Emas'] : ['Saham','Crypto','Reksadana Indeks','Exchange-Traded Fund (ETF)'];
  const result: Result={ payment:amount,payment_value:paymentValue,return_percent:suggested,return_reaches_target:rateValue>=target,return_value:rateValue,years:monthly && duration ? duration/12 : duration,years_value:durationValue,years_target:durationTarget,duration_unit:monthly?'months':'years',instruments,formula_policy:policy };
  if (monthly) Object.assign(result,{months:duration,months_value:durationValue});
  if (archive) result.archive_parity=archive;
  if (['properti','kendaraan','barang','menikah','dana-pensiun'].includes(kind)) {
    const stepped: Result={years:null,months:null,value:null,adjusted_target:null,reaches_target:false,policy_note:'5 tahun inflasi input → tahun 6–10 3% → >10 tahun 1%. Target dasar; tanpa inflasi ganda pensiun atau pangkat bulan barang pada arsip.'};
    for (let count=Math.ceil(monthly?years*12:years);count<=(monthly?1200:100);count++) {
      const t=monthly?count/12:count,v=fv(initial,payment,rate,t*perYear,begin);
      if (v>=inflated(t,true)) { Object.assign(stepped,{years:t,months:monthly?count:count*12,value:v,adjusted_target:inflated(t,true),reaches_target:true}); break; }
    }
    result.stepped_inflation=stepped;
  }
  const options = [['payment',amount,periods,paymentValue],['return',payment,periods,rateValue],['duration',payment,duration ? (monthly?duration/12:duration)*perYear:0,durationValue]] as const;
  for (const [prefix,deposit,count,v] of options) {
    const c=v===null ? {principal:null,interest_earned:null,principal_percent:null,interest_percent:null}:composition(initial,deposit,count,v);
    for (const [key,val] of Object.entries(c)) result[prefix+'_'+(key==='interest_earned'?'interest':key)]=val;
  }
  return result;
}
export function acceleratedPayoff(principal: number, income: number, fixed: number, rate: number, floating: number) {
  let balance=principal,count=0,feasible=true;
  while (balance>.000001 && count<1200) {
    const interest=balance*(count<fixed?rate:floating), installment=income*(count<fixed?.15:.2);
    if (installment<=interest) { feasible=false; break; }
    balance=Math.max(0,balance+interest-installment);count++;
  }
  feasible=feasible && balance<=.000001;
  return {low_payment:income*.15,high_payment:income*.2,estimated_months:feasible?count:null,estimated_years:feasible?count/12:null,feasible,note:'Bunga atas sisa pokok berjalan; batas 1200 bulan. Cicilan harus melebihi bunga.'};
}
function mortgage(data: CalculatorInput, months: number, rate: number): Result {
  const price=data.price??500000000,principal=price*(1-(data.dp??20)/100),fixed=Math.min(months,round(data.fixed_months??36)),floating=(data.floating??10)/1200,income=data.income??0,njop=data.njop??0;
  let r=fixed?rate/12:floating,balance=principal,fixedInterest=0,balanceAfterFixed=principal;
  const pmt=(b:number,r:number,m:number)=>{
    if (!r) return b/m;
    const denominator=1-(1+r)**(-m);
    return b*r/(denominator || -Math.expm1(-m*Math.log1p(r)));
  };
  let installment=pmt(balance,r,months);
  const timeline: {month:number;payment:number;interest:number;balance:number}[]=[];
  for (let i=0;i<months;i++) {
    if (i===fixed) { r=floating;installment=pmt(balance,r,months-i); }
    const interest=balance*r,paid=Math.min(balance,Math.max(0,installment-interest));balance=Math.max(0,balance-paid);
    if (i<fixed) fixedInterest+=interest;
    if (i+1===fixed) balanceAfterFixed=balance;
    timeline.push({month:i+1,payment:paid+interest,interest,balance});
  }
  const total=timeline.reduce((a,x)=>a+x.interest,0),low=Math.min(...timeline.map(x=>x.payment)),high=Math.max(...timeline.map(x=>x.payment));
  let affordability: Result|null=null;
  if (income) {
    const ratio=high/income*100;
    const [status,label,advice]=ratio<15?['sangat_sehat','Sangat Sehat','Pertimbangkan simulasi pelunasan dipercepat.']:ratio<30?['sehat','Sehat','Jaga ruang untuk kebutuhan lain.']:ratio<50?['tidak_sehat','Tidak Sehat','Tinjau ulang harga atau uang muka.']:['berbahaya','Berbahaya','Beban cicilan sangat tinggi terhadap penghasilan.'];
    affordability={income,ratio_min_percent:low/income*100,ratio_max_percent:ratio,status,label,advice,accelerated_payoff:ratio<15?acceleratedPayoff(principal,income,fixed,rate/12,floating):null};
  }
  const fees={ajb:price*.01,balik_nama:price*.01,notaris:price*(price<=1e8?.025:price<=1e9?.015:.01),provisi:principal*.01,appraisal:1e6,admin:1e6,bphtb:njop>0?.05*Math.max(0,price-njop):0,bphtb_included:njop>0,total_bank_fees:0,total_other_fees:0};
  fees.total_bank_fees=fees.provisi+fees.appraisal+fees.admin;
  fees.total_other_fees=fees.ajb+fees.balik_nama+fees.notaris+fees.provisi+fees.appraisal+fees.admin+fees.bphtb;
  return {principal,first_payment:timeline[0].payment,total_interest:total,fixed_interest:fixedInterest,floating_interest:total-fixedInterest,total_interest_percent:principal?total/principal*100:0,min_payment:low,max_payment:high,balance_after_fixed:balanceAfterFixed,affordability,fees,timeline};
}
export function educationRecommendation(target:number,initial:number,payment:number,rate:number,years:number,income:number,current:number) {
  const ratio=income<=3e6?.2:income<=15e6?.3:income<=50e6?.5:.6,limit=income*ratio,cap=years<=5?15:years<=10?20:30;
  let amount=payment,percentage=rate*100,value=current;
  if (value<target && amount<limit) {
    const factor=fv(0,1,rate/12,years*12);
    if (factor) {
      const base=fv(initial,0,rate/12,years*12);
      amount+=value>target*.2?100000:300000;
      value=round(fv(initial,amount,rate/12,years*12),2);
      if (value<target && amount<limit && value<=target*.2) {
        const boundary=(target*.2-base)/factor,steps=Math.min(Math.ceil((limit-amount)/300000),Math.floor((boundary-amount)/300000)+1);
        amount+=Math.max(1,steps)*300000;value=round(fv(initial,amount,rate/12,years*12),2);
      }
      if (value<target && amount<limit) { amount+=Math.max(1,Math.ceil((Math.min((target-base)/factor,limit)-amount)/100000))*100000;value=round(fv(initial,amount,rate/12,years*12),2); }
    } else amount+=Math.max(1,Math.ceil((limit-amount)/300000))*300000;
  }
  while (value<target && percentage<cap) {percentage++;value=round(fv(initial,amount,percentage/1200,years*12),2);}
  return {payment:amount,return_percent:percentage,future_value:value,reaches_target:value>=target};
}
export function calculate(slug: unknown, input: unknown): Result {
  const kind=slugSchema.parse(slug),data=inputSchema.parse(input);
  const n=(key:NumericKey,def=0)=>data[key]??def;
  const policy=data.formula_policy??'corrected';
  const names={dream_name:(data.dream_name??'').trim(),child_name:(data.child_name??'').trim()};
  let years=n('years',5);
  if (kind==='dana-pensiun' && ('age' in data || 'retirement_age' in data)) years=n('retirement_age',55)-n('age',30);
  if (years<=0) throw new RangeError('Durasi harus positif');
  const months=round(years*12);
  if (months<1) throw new RangeError('Durasi minimal satu bulan');
  const rate=n('rate',6)/100,initial=n('initial'),payment=n('payment',1e6);
  if (kind==='simulasi-kpr') return {...mortgage(data,months,rate),...names};
  let inflation=n('inflation',5)/100,target:number,base:number,periods:number,r:number,perYear:number,deposit:number,begin:boolean;
  let breakdown: Result[]=[];
  const stages: EducationStage[]=[];
  const income=n('income');
  if (kind==='pendidikan-anak' && data.levels) {
    const seen=new Set<string>(),age=n('child_age');
    for (const level of data.levels) {
      const key=level.level,[entry,duration]=LEVELS[key],wait=entry-age;
      if (seen.has(key) || !availableLevels(age).includes(key)) throw new RangeError('Jenjang duplikat atau usia masuk telah terlewati');
      seen.add(key);
      const multiplier=level.multiplier??(key==='s1'?2:12),factor=(1+inflation)**wait;
      const entrance=(level.entrance??0)*factor,tuition=(level.tuition??0)*multiplier*duration*factor,other=(entrance+tuition)*(level.other_percent??10)/100;
      stages.push({level:key,years_until_entry:wait,duration,entrance,tuition,other,target:round(entrance+tuition+other,1)});
    }
    stages.sort((a,b)=>LEVELS[a.level][0]-LEVELS[b.level][0]);
    const order=Object.keys(LEVELS);
    if (stages.some((stage,index)=>index>0 && order.indexOf(stage.level)!==order.indexOf(stages[index-1].level)+1)) throw new RangeError('Pilih rentang jenjang kontinu');
    years=stages[0].years_until_entry+stages.reduce((a,x)=>a+x.duration,0);
    target=stages.reduce((a,x)=>a+Math.trunc(x.target),0);base=target;inflation=0;
    periods=years;r=rate;perYear=1;deposit=payment*12;begin=true;
    for (let index=0;index<stages.length;index++) {
      const stage=stages[index];
      stage.future_value_at_entry=round(fv(initial,payment*12,rate,stage.years_until_entry),2);
      const monthlyTuition=stage.tuition/12/stage.duration;
      stage.monthly_tuition=monthlyTuition;stage.income_ratio_percent=income?monthlyTuition*1.1/income*100:null;
      const wait=index===0?stage.years_until_entry:stages[index-1].duration;
      const strategy=data.education_strategy??'allIn',goal=strategy==='up'?stage.entrance:strategy==='upSpp'?stage.entrance+stage.tuition:stage.target;
      const current=round(fv(initial,payment*12,rate,wait),2);
      Object.assign(stage,{strategy_target:goal,strategy_years:wait,strategy_future_value:current,optimal:educationRecommendation(goal,initial,payment,rate,wait,income,current)});
    }
    breakdown=stages.map(({optimal:_,...stage})=>stage);
  } else {
    target=n('target',1e8);
    if (kind==='dana-darurat') { target=n('expense',5e6)*Math.min(15,(data.married?9:6)+3*n('dependents'));inflation=0; }
    else if (['properti','kendaraan','barang'].includes(kind)) target=n('price',5e8)*n('dp',30)/100*(1+inflation)**years;
    else if (kind==='dana-pensiun') target=n('expense',5e6)*12*(1+inflation)**years/.04;
    else if (kind==='menikah') {
      if (data.wedding_mode==='detailed') {
        breakdown=WEDDING.map(key=>({item:key,value:n(key)}));
        for (const key of ['catering','souvenir','invitation'] as const) breakdown.push({item:key,value:n(`count_${key}`)*n(`price_${key}`)});
        target=breakdown.reduce((a,x)=>a+(x.value as number),0)*(1+inflation)**years;
      } else if (data.wedding_mode==='simple') target=n('budget',1e8)*(1+inflation)**years;
      else target=(n('venue')+n('catering')+n('clothing')+n('other'))*(1+inflation)**years;
    } else if (kind==='pendidikan-anak') target=(n('entrance',2e7)+n('tuition',1e6)*12*n('study_years',3))*(1+inflation)**years;
    if (kind==='annuity') inflation=0;
    const yearly=kind==='annuity' && data.frequency==='yearly';
    if (yearly && (years<1 || years%1)) throw new RangeError('Investasi tahunan memerlukan jumlah tahun bulat');
    periods=yearly?round(years):months;r=yearly?rate:rate/12;perYear=yearly?1:12;deposit=payment;begin=data.timing!=='end';base=target/(1+inflation)**years;
  }
  const value=fv(initial,deposit,r,periods,begin);
  let needed=Math.max(0,(target-fv(initial,0,r,periods))/fv(0,1,r,periods,begin));
  const timeline=Array.from({length:Math.ceil(years)},(_,i)=>({year:i+1,value:fv(initial,deposit,r,Math.min(periods,(i+1)*perYear),begin)}));
  const rec=recommendations(target,initial,deposit,r,periods,begin,perYear,base,inflation,kind,policy);
  const total=stages.reduce((a,x)=>a+x.target,0);
  for (const stage of stages) stage.share_percent=total?stage.target/total*100:0;
  if (stages.length) {rec.payment=(rec.payment as number)/12;needed/=12;}
  return {...names,...composition(initial,deposit,periods,value),strategy_state:value>=target?'success':value>=target*.9?'almost':'failed',target,future_value:round(value,2),gap:Math.max(0,target-value),recommended_payment:needed,timeline,breakdown,recommendations:rec,years,education_stages:stages};
}
