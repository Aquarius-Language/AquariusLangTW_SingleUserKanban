import {readFile as 讀取,writeFile as 寫入} from 'node:fs/promises';
const 修改=async(檔,處理)=>寫入(檔,處理(await 讀取(檔,'utf8')));
await 修改('網頁/index.html',內容=>內容.replace('lang="en"','lang="zh-Hant"').replace('Aquarius WebAssembly','星泉看板').replace('background:#0c1624','background:#080e11').replace('outline:none','outline:none;touch-action:none').replace('<pre id="output"','<pre hidden id="output"'));
await 修改('網頁/app.mjs',內容=>內容.replace('error.textContent=e.message;error.hidden=false;',"error.textContent='星泉看板無法啟動。請使用支援圖形加速的新版瀏覽器，並以本機伺服器或安全連線開啟。原有備份不會被覆寫。';error.hidden=false;console.error('星泉啟動錯誤：',e);"));
for(const 檔 of ['processing.mjs','application-window.mjs'])await 修改('網頁/'+檔,內容=>內容.replaceAll('Aquarius text input','星泉文字輸入'));
await 修改('網頁/processing.mjs',內容=>內容.replace("['s','o','n','a','z','y']","['s','o','n','a','c','v','x','f','z','y']").replace("['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']","['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab']"));
// 高 DPI 的材質尺寸必須換回精確顯示尺寸，避免進位後再壓縮文字。
await 修改('網頁/processing.mjs',內容=>{
  const 原尺寸='img={width,height,texture:s.owner.device.texture(canvas.width,canvas.height,bytes)}';
  const 新尺寸='img={width:canvas.width/density,height:canvas.height/density,texture:s.owner.device.texture(canvas.width,canvas.height,bytes)}';
  if(!內容.includes(原尺寸)&&!內容.includes(新尺寸))throw new Error('無法套用文字像素尺寸修正：請檢查星泉瀏覽器執行環境版本。');
  return 內容.replace(原尺寸,新尺寸);
});
await 修改('網頁/application-services.mjs',內容=>內容.replaceAll('Aquarius application','星泉看板'));
console.log('網頁已完成繁體中文本地化。');
