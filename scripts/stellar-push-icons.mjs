// Render the existing favicon, rather than introducing a second visual identity.
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const svg=await readFile('public/favicon.svg','utf8');
const browser=await chromium.launch({channel:'msedge'});
try{
 for(const size of [192,512]){
  const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
  await page.setContent(`<style>body{margin:0;background:#07090e}svg{width:100vw;height:100vh;display:block}</style>${svg}`);
  await page.screenshot({path:`public/stellar-icon-${size}.png`});await page.close();
 }
 const page=await browser.newPage({viewport:{width:96,height:96},deviceScaleFactor:1});
 await page.setContent(`<style>body{margin:0;background:transparent}svg{width:100vw;height:100vh;display:block}</style>${svg.replace(/<rect[^>]+\/>/,'').replaceAll('#cbb28c','#ffffff').replaceAll('#f4e1bf','#ffffff')}`);
 await page.screenshot({path:'public/stellar-badge.png',omitBackground:true});
}finally{await browser.close();}
