import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { createApp } from '../../src/server/app.js';
import { feedback } from '../../src/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { connectDatabase } from '../../src/server/db/client.js';
const url = process.env.TEST_DATABASE_URL!;
if (!url || new URL(url).pathname !== '/menghitung_mimpi_test' || url === process.env.DATABASE_URL) throw new Error('Separate test database required');
let current: ReturnType<typeof createApp>, server: Server, origin: string, cookie: string, token: string;
const database = connectDatabase(url);
const ids: number[] = [];
async function start() { current = createApp(url); server = current.app.listen(0,'127.0.0.1'); await once(server,'listening'); const address=server.address(); if (!address || typeof address==='string') throw new Error(); origin='http://127.0.0.1:'+address.port; const response=await fetch(origin+'/api/csrf'); cookie=response.headers.get('set-cookie')!.split(';')[0]; token=(await response.json()).token; }
async function stop() { await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve())); await current.pool.end(); }
function post(data: unknown, headers: Record<string,string> = {}) { return fetch(origin+'/api/feedback',{ method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie,'X-CSRF-Token':token,...headers},body:JSON.stringify(data) }); }
beforeAll(start);
afterAll(async()=>{ await stop(); for (const id of ids) await database.db.delete(feedback).where(eq(feedback.id,id)); await database.pool.end(); });
describe('Built Express + real PostgreSQL',()=>{
 it('serves built HTML and external assets under strict CSP',async()=>{ const r=await fetch(origin); expect(r.status).toBe(200); const html=await r.text(); expect(html).toContain('/assets/'); expect(html).not.toContain('/src/web'); expect(r.headers.get('content-security-policy')).toContain("style-src 'self'"); expect(r.headers.get('content-security-policy')).not.toMatch(/unsafe-inline|unsafe-eval/); expect(r.headers.get('x-content-type-options')).toBe('nosniff'); const asset=html.match(/src="([^"]+)"/)![1]; expect((await fetch(origin+asset)).status).toBe(200); });
 it('issues HttpOnly strict cookie, no-store; unknown API 404',async()=>{ const r=await fetch(origin+'/api/csrf'); expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store'); expect(r.headers.get('set-cookie')).toContain('HttpOnly'); expect(r.headers.get('set-cookie')).toContain('SameSite=Strict'); expect((await fetch(origin+'/api/missing')).status).toBe(404); expect((await fetch(origin+'/api/missing',{method:'POST'})).status).toBe(404); });
 it('persists safe parameterized text across HTTP server/pool restart',async()=>{ const message="Test <script>alert(1)</script> ' ; --"; const r=await post({message:' '+message+' ',email:'test@example.test',page:'/'}); expect(r.status).toBe(201); const id=(await r.json()).id; ids.push(id); await stop(); await start(); const [row]=await database.db.select().from(feedback).where(eq(feedback.id,id)); expect(row.message).toBe(message); expect(row.created_at).toBeInstanceOf(Date); });
 it('rejects missing/wrong Origin, token and forged cookie',async()=>{ for (const headers of ([{Origin:'https://evil.test'},{Origin:''},{'X-CSRF-Token':'wrong'},{Cookie:'csrf='+token+'.'+'0'.repeat(64)},{Cookie:''}] as Record<string,string>[])) expect((await post({message:'test'},headers)).status).toBe(403); });
 it('rejects invalid types, empty and unsafe contexts without coercion',async()=>{ for (const data of [null,[],1,{}, {message:''},{message:'   '},{message:1},{message:'x'.repeat(5001)},{message:'x',email:'bad'},{message:'x',email:'a'.repeat(255)+'@x.test'},{message:'x',page:'//evil.test'},{message:'x',page:'/../secret'},{message:'x',page:'https://evil.test'},{message:'x',extra:true}]) expect((await post(data)).status).toBe(400); });
 it('handles malformed/empty JSON and size limit',async()=>{ for (const body of ['','{']) { const r=await fetch(origin+'/api/feedback',{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':token,'Content-Type':'application/json'},body}); expect(r.status).toBe(400); } expect((await post({message:'x'.repeat(20000)})).status).toBe(413); });
 it('allows optional defaults and boundary lengths',async()=>{ for (const data of [{message:'x'},{message:'x'.repeat(5000),page:'/'+'a'.repeat(99),email:''}]) {const r=await post(data);expect(r.status).toBe(201);ids.push((await r.json()).id);} });
 it('sets Secure for actual HTTPS requests',async()=>{ const app=createApp(url); app.app.enable('trust proxy'); const s=app.app.listen(0,'127.0.0.1'); await once(s,'listening'); try {const a=s.address();if(!a||typeof a==='string')throw new Error(); const r=await fetch('http://127.0.0.1:'+a.port+'/api/csrf',{headers:{'X-Forwarded-Proto':'https'}});expect(r.headers.get('set-cookie')).toContain('Secure');} finally {await new Promise<void>(resolve=>s.close(()=>resolve()));await app.pool.end();} });
});
