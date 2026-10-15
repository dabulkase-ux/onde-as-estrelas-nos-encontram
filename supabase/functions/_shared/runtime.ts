import type { Database, Settings } from './handler.ts';
export function settingsFromEnv(env: {get: (key: string) => string | undefined}): Settings {
 const url=env.get('SUPABASE_URL')??'';
 const key=env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
 const db: Database = async (method,path,body) => {
  if(!url || !key) throw new Error('Configuration missing');
  const response=await fetch(`${url}/rest/v1/${path}`,{
   method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal,resolution=ignore-duplicates'},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000),
  });
  if(!response.ok) throw new Error('Database unavailable');
  const text=await response.text();return text?JSON.parse(text):null;
 };
 return {db,passwordHash:env.get('ADMIN_PASSWORD_HASH')??'',herPasswordHash:env.get('ADMIN_HER_PASSWORD_HASH')??'',origins:(env.get('ALLOWED_ORIGINS')??'').split(',').map(s=>s.trim()).filter(Boolean)};
}
