import { execFileSync } from 'node:child_process';
import { expect } from 'vitest';
export function python(cases: {kind:string;data:unknown}[], baseline: string) {
  const program=`import sys,json\nsys.dont_write_bytecode=True\nsys.path.insert(0,sys.argv[1])\nfrom calculators import calculate\nout=[]\nfor c in json.load(sys.stdin):\n try: out.append({'result':calculate(c['kind'],c['data'])})\n except (ValueError,TypeError,OverflowError): out.append({'invalid':True})\nprint(json.dumps(out))`;
  return JSON.parse(execFileSync('python3',['-B','-c',program,baseline],{input:JSON.stringify(cases),encoding:'utf8',maxBuffer:20e6})) as {result?:unknown;invalid?:boolean}[];
}
export function compare(actual:unknown,expected:unknown,path='result') {
  if (typeof expected==='number') {
    expect(typeof actual,path).toBe('number');
    // Monetary aggregates: 0.01 IDR absolute or 1e-10 relative for large projections.
    const field=path.split('.').at(-1)!;
    const absolute=/percent|ratio/.test(field)?1e-8:/^(years|months|year|month|duration|years_until_entry|strategy_years|estimated_months|estimated_years)$/.test(field)?1e-10:.01;
    const tolerance=Math.max(absolute,Math.abs(expected)*1e-10);
    expect(Math.abs((actual as number)-expected),path).toBeLessThanOrEqual(tolerance);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual),path).toBe(true);expect((actual as unknown[]).length,path).toBe(expected.length);
    expected.forEach((v,i)=>compare((actual as unknown[])[i],v,`${path}[${i}]`));
  } else if (expected && typeof expected==='object') {
    expect(Object.keys(actual as object).sort(),path).toEqual(Object.keys(expected).sort());
    for (const [k,v] of Object.entries(expected)) compare((actual as Record<string,unknown>)[k],v,path+'.'+k);
  } else expect(actual,path).toEqual(expected);
}
