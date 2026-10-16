import process from 'node:process';
import console from 'node:console';
import {Buffer} from 'node:buffer';
// Isolated local preview. Never reads Supabase/admin secrets or connects to a remote DB.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {createMailFixture} from './stellar-mail-fixture.ts';
const fixture=await createMailFixture('test-results/stellar-mail-preview',['http://localhost:5186','http://127.0.0.1:5186']);
const server=createServer(async(req,res)=>{
 try{
  const origin=req.headers.origin??'';if(/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)&&!fixture.origins.includes(origin))fixture.origins.push(origin);
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>100000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const response=await fixture.handler(new globalThis.Request('http://localhost:5187',{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
 }catch{res.writeHead(503);res.end('{"error":"Prévia local indisponível."}');}
});
server.listen(5187,'127.0.0.1');
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0','--port','5186','--strictPort'],{stdio:'inherit',env:{...process.env,VITE_STELLAR_MAIL_LOCAL:'true',VITE_HER_UNIVERSE_REMOTE_ENABLED:'false',VITE_QUIZ_SHARING_MODE:'off',VITE_SUPABASE_URL:'https://isolated-mail.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mail_local'}});
console.log('Correio local: http://localhost:5186 — identidade automática pela galáxia. Dados isolados em test-results.');
const close=()=>{vite.kill();server.close();void fixture.db.close();};process.on('SIGINT',close);process.on('SIGTERM',close);vite.on('exit',()=>{server.close();void fixture.db.close();});
