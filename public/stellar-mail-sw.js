/* Push only: never caches documents, admin sessions or private correspondence. */
const pushApi='https://ogwgguspttvpnjdulsed.supabase.co/functions/v1/stellar-push';
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('stellar-push',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function setting(key){const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('settings').objectStore('settings').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
async function claim(id){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings'),r=store.get('seen');let fresh=false;r.onsuccess=()=>{const seen=r.result||[];fresh=!seen.includes(id);if(fresh)store.put([...seen.slice(-199),id],'seen');};tx.oncomplete=()=>resolve(fresh);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  try{
   const data=event.data?.json();if(!data||!/^[a-f0-9-]{36}$/i.test(data.id)||!['arthur','carol'].includes(data.recipient))return;
   const local=await setting('device');if(!local?.device||!local.secret)return;
   // Validate server truth even with no window open: old deliveries cannot
   // survive cancellation or an identity replacement in another tab.
   const response=await fetch(pushApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status',device:local.device,secret:local.secret}),credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return;const state=await response.json();
   const subscription=await self.registration.pushManager.getSubscription();
   if(!state.enabled||state.identity!==data.recipient||state.generation!==data.generation||state.endpoint!==subscription?.endpoint||!await claim(data.id+':'+data.recipient))return;
   const url=self.location.origin+(data.recipient==='carol'?'/universo-dela/visao':'/')+'?stellar-letter='+encodeURIComponent(data.id);
   await self.registration.showNotification('Correio Estelar',{body:data.recipient==='arthur'?'Uma nova carta de Carol chegou ao seu universo.':'Uma nova carta de Arthur chegou ao seu universo.',icon:'/stellar-icon-192.png',badge:'/stellar-badge.png',tag:'stellar-mail-'+data.id,data:{url},renotify:false});
  }catch{/* Never reveal a letter or fall back to an unverified identity. */}
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const url=new URL(event.notification.data?.url||'/',self.location.origin);
  if(url.origin!==self.location.origin||!['/','/universo-dela/visao'].includes(url.pathname))return;
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true}),existing=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(existing){const client=await existing.navigate(url.href);await client?.focus();}else await self.clients.openWindow(url.href);
 })());
});
