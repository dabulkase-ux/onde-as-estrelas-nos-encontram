import {afterEach,expect,it,vi} from 'vitest';
import {prepareMailNotifications} from './notifications';
afterEach(()=>vi.unstubAllGlobals());
it('does not ask for notification permission before a push backend is configured',async()=>{
 const permission=vi.fn();vi.stubGlobal('Notification',{requestPermission:permission});await expect(prepareMailNotifications('',vi.fn())).rejects.toThrow('ainda não estão configurados');expect(permission).not.toHaveBeenCalled();
});
it('requires Home Screen installation on iPhone before asking consent',async()=>{
 const permission=vi.fn();vi.stubGlobal('Notification',{requestPermission:permission});vi.stubGlobal('window',{isSecureContext:true,PushManager:class {},matchMedia:()=>({matches:false})});vi.stubGlobal('navigator',{userAgent:'iPhone',serviceWorker:{}});
 await expect(prepareMailNotifications('future-public-key',vi.fn())).rejects.toThrow('Tela de Início');expect(permission).not.toHaveBeenCalled();
});
it('respects refusal without registering a worker or storing a subscription',async()=>{
 const register=vi.fn(),save=vi.fn();vi.stubGlobal('Notification',{requestPermission:async()=> 'denied'});vi.stubGlobal('window',{isSecureContext:true,PushManager:class {}});vi.stubGlobal('navigator',{userAgent:'Android',serviceWorker:{register}});
 expect(await prepareMailNotifications('future-public-key',save)).toBe(false);expect(register).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
});
