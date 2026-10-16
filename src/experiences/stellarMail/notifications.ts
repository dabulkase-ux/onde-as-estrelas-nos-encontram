/** Called exclusively by the explicit activation button, never on navigation. */
export function pushSupport(){
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
 if(ios&&!window.matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator&{standalone?:boolean}).standalone)return 'No iPhone, abra o site no Safari, toque em Compartilhar e Adicionar à Tela de Início. Abra pelo ícone instalado para ativar notificações (iOS 16.4 ou posterior compatível).';
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||typeof Notification==='undefined')return 'Este dispositivo não oferece suporte a Web Push. O correio continua disponível normalmente.';
 return '';
}
export async function prepareMailNotifications(vapidPublicKey:string,save:(subscription:PushSubscriptionJSON)=>Promise<void>){
 if(!vapidPublicKey)throw new Error('Os avisos fora do site ainda não estão configurados.');
 const unsupported=pushSupport();if(unsupported)throw new Error(unsupported);
 const permission=await Notification.requestPermission();if(permission!=='granted')return false;
 const registration=await navigator.serviceWorker.register('/stellar-mail-sw.js',{scope:'/'});
 await navigator.serviceWorker.ready;
 const key=Uint8Array.from(atob(vapidPublicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const previous=await registration.pushManager.getSubscription(),subscription=previous??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 try{await save(subscription.toJSON());}catch(e){if(!previous)await subscription.unsubscribe();throw e;}return true;
}
