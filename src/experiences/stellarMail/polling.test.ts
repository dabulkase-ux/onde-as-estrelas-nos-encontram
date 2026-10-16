import {expect,it} from 'vitest';
import {mailRetryDelay} from './polling';
import {makeStellarMailHandler} from '../../../supabase/functions/_shared/stellarMailHandler';
import {makeUniverseHandler} from '../../../supabase/functions/_shared/herUniverseHandler';
import {publicFunctionOrigins} from '../../../supabase/functions/_shared/publicOrigins';
it('bounds backend outage retries and doubles successive delays',()=>{expect([1,2,3,4,5,100].map(mailRetryDelay)).toEqual([10000,20000,40000,80000,120000,120000]);});
it('allows the official domain and Vite origins without allowing arbitrary remote sites',()=>{const origins=publicFunctionOrigins('https://configured.example,http://localhost:5173');expect(origins).toContain('https://onde-as-estrelas-nos-encontram.vercel.app');expect(origins).toContain('http://localhost:5186');expect(origins).toContain('http://127.0.0.1:5173');expect(origins).toContain('https://configured.example');expect(origins).not.toContain('https://untrusted.example');expect(new Set(origins).size).toBe(origins.length);});

it('both public functions accept official and local preflights including client-info',async()=>{
 const settings={origins:publicFunctionOrigins(),db:async()=>{throw Error('Preflight must not query the database');}};
 for(const handler of [makeStellarMailHandler(settings),makeUniverseHandler(settings)])for(const origin of ['https://onde-as-estrelas-nos-encontram.vercel.app','http://localhost:5173','http://localhost:5186']){const response=await handler(new Request('https://fixture.invalid',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'apikey,content-type,x-client-info'}}));expect(response.status).toBe(204);expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-client-info');}
});
