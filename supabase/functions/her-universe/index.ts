import { makeUniverseHandler } from '../_shared/herUniverseHandler.ts';
import { HttpError } from '../_shared/security.ts';
const url=Deno.env.get('SUPABASE_URL')??'',key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
Deno.serve(makeUniverseHandler({
  origins:(Deno.env.get('ALLOWED_ORIGINS')??'').split(',').map(s=>s.trim()).filter(Boolean),
  db:async(method,path,body)=>{
    if(!url||!key)throw new HttpError(503,'Serviço ainda não configurado.');
    const response=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
    const data=await response.json().catch(()=>null);
    if(!response.ok){if(data?.code==='40001')throw new HttpError(409,'O rascunho mudou em outro dispositivo. Carregue a versão remota antes de salvar.');if(data?.code==='42501')throw new HttpError(403,'Operação indisponível para este universo.');if(data?.code==='22023')throw new HttpError(400,'Experiência ou resposta inválida, indisponível ou expirada.');throw new HttpError(503,'Serviço indisponível.');}
    return data;
  },
}));
