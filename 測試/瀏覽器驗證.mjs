import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,extname,sep} from 'node:path';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const site=resolve(process.env.AQUARIUS_GUI_SITE||resolve(project,'測試/結果/圖形網頁'));
const compiler=process.env.AQUARIUS_ROOT||resolve(project,'../AquariusLangTW');
const {chromium}=await import(pathToFileURL(process.env.AQUARIUS_PLAYWRIGHT||resolve(compiler,'scripts/node_modules/playwright/index.mjs')));
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/\/$/,'/index.html');
 const path=resolve(site,'.'+name);if(!path.startsWith(site+sep))throw Error('Outside website');
 const body=await readFile(path);
 res.writeHead(200,{'content-type':{'.html':'text/html','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm'}[extname(path)]||'application/octet-stream','cache-control':'no-store'}).end(body);
}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({channel:process.env.AQUARIUS_BROWSER||'chrome',headless:true,args:['--enable-unsafe-webgpu']});
const results=[];
try{
 for(const viewport of [{width:1440,height:900},{width:412,height:915}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>['finished','failed'].includes(window.aquarius?.state?.status),null,{timeout:120000});
  const state=await page.evaluate(()=>window.aquarius.state);
  assert.equal(state.status,'finished',JSON.stringify(state));assert.equal(state.exitCode,0,JSON.stringify(state));
  assert.match(state.lines.join('\n'),/桌面驗證完成：\s+21\s+通過，\s+0\s+失敗/);assert.deepEqual(errors,[]);
  results.push({viewport,passed:true,state,errors});console.log(viewport.width+'px: '+state.lines.join('\n'));
  await page.close();
 }
 const output=resolve(project,'測試/結果');await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'瀏覽器結果.json'),JSON.stringify({passed:true,results},null,2)+'\n');
}finally{await browser.close();server.closeAllConnections();await new Promise(ok=>server.close(ok));}
