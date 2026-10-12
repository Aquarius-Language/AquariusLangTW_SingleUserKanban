import {createServer as 建立伺服器} from 'node:http';
import {readFile as 讀取} from 'node:fs/promises';
import {fileURLToPath as 檔案路徑} from 'node:url';
import 路徑 from 'node:path';
const 根=路徑.resolve(路徑.dirname(檔案路徑(import.meta.url)),'../網頁');
const 類型={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm'};
const 伺服器=建立伺服器(async(請求,回應)=>{try{const 網址=new URL(請求.url,'http://localhost'),名字=decodeURIComponent(網址.pathname),檔=路徑.resolve(根,'.'+名字+(名字.endsWith('/')?'index.html':''));if(!檔.startsWith(根+路徑.sep))throw Error('路徑不在網頁目錄內');回應.setHeader('Content-Type',類型[路徑.extname(檔)]??'application/octet-stream');回應.end(await 讀取(檔));}catch{回應.statusCode=404;回應.end('找不到檔案');}});
伺服器.listen(Number(process.env.PORT??8088),'127.0.0.1',()=>console.log('星泉看板：http://127.0.0.1:'+伺服器.address().port));
