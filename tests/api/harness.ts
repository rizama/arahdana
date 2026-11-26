import { once } from 'node:events';
import { createApp } from '../../src/server/app.js';
export async function httpHarness() {
  const url=process.env.TEST_DATABASE_URL;
  if (!url || new URL(url).pathname!=='/menghitung_mimpi_test' || url===process.env.DATABASE_URL) throw new Error('Test DB required');
  const {app,pool}=createApp(url),server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();if(!address || typeof address==='string')throw new Error();
  const origin='http://127.0.0.1:'+address.port;
  const response=await fetch(origin+'/api/csrf'),cookie=response.headers.get('set-cookie')!.split(';')[0],token=(await response.json()).token;
  return {origin,post:(kind:string,data:unknown,extra:Record<string,string>={})=>fetch(origin+'/api/calculate/'+kind,{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':token,'Content-Type':'application/json',...extra},body:JSON.stringify(data)}),close:async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await pool.end();}};
}
