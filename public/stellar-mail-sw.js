/* Optional future Web Push worker: no fetch/cache handlers, no private letter content. */
self.addEventListener('push',event=>{
 let id='',url='/';try{const data=event.data?.json();id=String(data?.id??'');if(data?.recipient==='carol')url='/universo-dela/visao';}catch{/* Use a generic notification. */}
 event.waitUntil(self.registration.showNotification('Correio Estelar',{body:'As estrelas trouxeram uma correspondência para você.',tag:`stellar-mail-${id}`,data:{url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{const existing=windows.find(client=>new URL(client.url).origin===self.location.origin);return existing?existing.navigate(event.notification.data?.url??'/').then(client=>client?.focus()):self.clients.openWindow(event.notification.data?.url??'/');}));
});
