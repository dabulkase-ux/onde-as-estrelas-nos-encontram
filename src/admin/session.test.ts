import {afterEach,expect,it,vi} from 'vitest';
import {readAdminSession,storeAdminSession} from './session';
afterEach(()=>vi.unstubAllGlobals());
it('recovers both tab sessions, rejects expired/corrupt values and clears logout',()=>{
 let data:string|null=null;vi.stubGlobal('sessionStorage',{getItem:()=>data,setItem:(_key:string,value:string)=>{data=value;},removeItem:()=>{data=null;}});
 for(const username of ['admin','meu-universo-dela']){const session={username,token:'a'.repeat(64),expiresAt:new Date(Date.now()+60000).toISOString()};storeAdminSession(session);expect(readAdminSession()).toEqual(session);storeAdminSession(null);expect(readAdminSession()).toBeNull();}
 storeAdminSession({username:'admin',token:'a'.repeat(64),expiresAt:'2020-01-01'});expect(readAdminSession()).toBeNull();data='{bad';expect(readAdminSession()).toBeNull();
});
