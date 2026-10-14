import {readFile as 讀取,writeFile as 寫入,access as 存在} from 'node:fs/promises';
const 修改=async(檔,處理)=>寫入(檔,處理(await 讀取(檔,'utf8')));
await 修改('網頁/index.html',內容=>內容.replace('lang="en"','lang="zh-Hant"').replace('Aquarius WebAssembly','星泉看板').replace('background:#0c1624','background:#080e11').replace('outline:none','outline:none;touch-action:none').replace('<pre id="output"','<pre hidden id="output"'));
await 修改('網頁/app.mjs',內容=>內容.replace('error.textContent=e.message;error.hidden=false;',"error.textContent='星泉看板無法啟動。請使用支援圖形加速的新版瀏覽器，並以本機伺服器或安全連線開啟。原有備份不會被覆寫。';error.hidden=false;console.error('星泉啟動錯誤：',e);"));
// 編譯器的新舊版本分別將輸入橋接放在獨立模組或 processing.mjs。
const 輸入檔=await 存在('網頁/processing-input.mjs').then(()=> 'processing-input.mjs',()=> 'processing.mjs');
for(const 檔 of [輸入檔,'application-window.mjs'])await 修改('網頁/'+檔,內容=>內容.replaceAll('Aquarius text input','星泉文字輸入'));
const 文字橋接=(await 讀取(new URL('./網頁文字輸入.mjs',import.meta.url),'utf8')).replace('export function','function');
await 修改('網頁/'+輸入檔,內容=>{
    內容=內容.replace("['s','o','n','a','z','y']","['s','o','n','a','c','v','x','f','z','y']").replace("['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']","['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab']");
    if(內容.includes('function 安裝文字輸入('))return 內容;
    const 主機=輸入檔==='processing-input.mjs'?'processing':'this';
    const 起點=內容.indexOf(`    ${主機}.textarea.addEventListener('input'`),終點=內容.indexOf("    s('textInputEnabled',false);",起點);
    if(起點<0||終點<0)throw Error('找不到文字輸入橋接，請確認編譯器版本。');
    return 文字橋接+'\n'+內容.slice(0,起點)+`    安裝文字輸入(${主機},queue);\n`+內容.slice(終點);
});
await 修改('網頁/application-services.mjs',內容=>內容.replaceAll('Aquarius application','星泉看板'));
console.log('網頁已完成繁體中文本地化。');
