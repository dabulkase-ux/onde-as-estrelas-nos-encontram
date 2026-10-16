/** Future opt-in adapter. Call only from a user gesture after backend push is configured. */
export async function prepareMailNotifications(vapidPublicKey:string,save:(subscription:PushSubscriptionJSON)=>Promise<void>){
 if(!vapidPublicKey)throw new Error('Os avisos fora do site ainda não estão configurados.');
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Este navegador não oferece Web Push. O correio continua disponível.');
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
 if(ios&&!window.matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator&{standalone?:boolean}).standalone)throw new Error('No iPhone, adicione o site à Tela de Início antes de ativar avisos.');
 const permission=await Notification.requestPermission();if(permission!=='granted')return false;
 const registration=await navigator.serviceWorker.register('/stellar-mail-sw.js',{scope:'/'});
 const key=Uint8Array.from(atob(vapidPublicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const previous=await registration.pushManager.getSubscription(),subscription=previous??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 try{await save(subscription.toJSON());}catch(e){if(!previous)await subscription.unsubscribe();throw e;}return true;
}
