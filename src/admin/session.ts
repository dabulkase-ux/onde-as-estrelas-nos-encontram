export type AdminSession={token:string;expiresAt:string;username?:string};
const key='meu-universo.admin-session.v1';
export function readAdminSession():AdminSession|null{
  try{
    const value=JSON.parse(sessionStorage.getItem(key)??'null');
    if(!value||typeof value.token!=='string'||!/^[a-f0-9]{64}$/.test(value.token)||!Number.isFinite(Date.parse(value.expiresAt))||Date.parse(value.expiresAt)<=Date.now()||!['admin','meu-universo-dela'].includes(value.username)){
      sessionStorage.removeItem(key);return null;
    }
    return {token:value.token,expiresAt:value.expiresAt,username:value.username};
  }catch{return null;}
}
export function storeAdminSession(session:AdminSession|null){
  try{if(session)sessionStorage.setItem(key,JSON.stringify(session));else sessionStorage.removeItem(key);}catch{/* Login remains usable without tab storage. */}
}
