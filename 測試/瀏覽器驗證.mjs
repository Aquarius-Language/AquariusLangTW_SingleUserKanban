import {createRequire as 建立載入器} from 'node:module';
import {fileURLToPath as 檔案路徑} from 'node:url';
import {readFile as 讀取,writeFile as 寫入,mkdir as 建立目錄} from 'node:fs/promises';
import {createServer as 建立伺服器} from 'node:http';
import 路徑 from 'node:path';
import 驗證 from 'node:assert/strict';
const 專案=路徑.resolve(路徑.dirname(檔案路徑(import.meta.url)),'..');
const 星泉根=process.env.AQUARIUS_ROOT??路徑.resolve(專案,'../AquariusLangTW');
const 載入=建立載入器(路徑.join(星泉根,'AquariusWebCompiler/package.json'));
const {chromium:鉻}=載入('playwright');
const 網頁根=路徑.join(專案,'網頁'),結果根=路徑.join(專案,'測試/結果');
await 建立目錄(結果根,{recursive:true});
const 伺服器=建立伺服器(async(請求,回應)=>{try{const 網址=new URL(請求.url,'http://localhost'),名字=decodeURIComponent(網址.pathname),檔=路徑.resolve(網頁根,'.'+名字+(名字.endsWith('/')?'index.html':''));if(!檔.startsWith(網頁根+路徑.sep))throw Error('無效路徑');回應.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm'})[路徑.extname(檔)]??'application/octet-stream');回應.end(await 讀取(檔));}catch{回應.statusCode=404;回應.end();}});
await new Promise(完成=>伺服器.listen(0,'127.0.0.1',完成));
const 瀏覽器=await 鉻.launch({channel:'chrome',headless:true,args:['--enable-unsafe-webgpu']});
const 頁=await 瀏覽器.newPage({viewport:{width:1440,height:900},acceptDownloads:true}),錯誤=[],結果=[];
await 頁.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});Object.defineProperty(window,'showOpenFilePicker',{value:undefined,configurable:true});});
頁.on('pageerror',錯=>錯誤.push(錯.message));
const 檢查=async(名稱,處理)=>{await 處理();結果.push({名稱,通過:true});console.log('通過：'+名稱);};
const 安定=async()=>{await 頁.waitForFunction(()=>window.aquarius.host?.processing&&window.aquarius.host.processing.frameCount===window.完成繪圖&&window.aquarius.host.processing.eventQueue.length===0);};
const 狀態=async()=>{await 安定();return 頁.evaluate(async()=>{const 機=window.aquarius.host,轉=(await import('./application.mjs')).toValue;return 轉(await 機.runtime.invoke(機.cache.get('星泉看板.aqua').scope.get('取得狀態')));});};
const 操作區=async()=>{await 安定();return 頁.evaluate(async()=>{const 機=window.aquarius.host,轉=(await import('./application.mjs')).toValue;return 轉(await 機.runtime.invoke(機.cache.get('星泉看板.aqua').scope.get('取得操作區')));});};
const 呼叫=(名稱)=>頁.evaluate(async(名稱)=>{const 機=window.aquarius.host;await 機.runtime.invoke(機.cache.get('星泉看板.aqua').scope.get(名稱));},名稱);
const 找區=async(標籤)=>{const 區=(await 操作區()).find(項=>項[4]===標籤);驗證.ok(區,'找不到操作區：'+標籤);return 區;};
const 點=async(標籤)=>{const 區=(await 操作區()).find(項=>項[4]===標籤);驗證.ok(區,'找不到操作區：'+標籤);await 頁.mouse.click(區[0]+區[2]/2,區[1]+區[3]/2);await 頁.waitForTimeout(60);await 安定();};
const 啟動=async()=>{
 await 頁.goto('http://127.0.0.1:'+伺服器.address().port+'/?autorun=0');
 await 頁.waitForFunction(()=>window.aquarius);
 await 頁.evaluate(()=>{window.看板工作=window.aquarius.run(window.aquarius.bundle.entry,0).catch(錯=>{window.啟動錯誤=錯.message;});});
 await 頁.waitForFunction(()=>window.aquarius.host?.processing||window.啟動錯誤);
 await 頁.evaluate(()=>{const 機=window.aquarius.host.processing,完成=機.endFrame.bind(機),開始=機.beginFrame.bind(機),繪=機.screen.draw.bind(機.screen);window.完成繪圖=0;window.裁切紀錄=new Set();window.待裁切紀錄=new Set();機.screen.draw=(...參數)=>{if(機.screen.clip)window.待裁切紀錄.add(JSON.stringify(機.screen.clip));return 繪(...參數);};機.beginFrame=async()=>{window.繪圖起點=performance.now();window.待裁切紀錄=new Set();return 開始();};機.endFrame=async()=>{await 完成();window.裁切紀錄=window.待裁切紀錄;window.完成繪圖=機.frameCount;window.最近繪圖耗時=performance.now()-window.繪圖起點;};});
 await 頁.waitForFunction(()=>window.完成繪圖>=2||window.啟動錯誤);
 await 頁.waitForTimeout(100);
 驗證.equal(await 頁.evaluate(()=>window.啟動錯誤),undefined);
};
try{
 await 啟動();
 await 檢查('首次開啟入門導覽',async()=>{驗證.equal((await 狀態()).教學,0);await 頁.screenshot({path:路徑.join(結果根,'首次導覽.png')});});
 await 點('稍後再看');await 檢查('星泉判斷網頁環境',async()=>{驗證.equal((await 狀態()).是網頁,true);驗證.equal((await 狀態()).未儲存,false);});
 await 頁.screenshot({path:路徑.join(結果根,'看板畫面.png')});
 await 檢查('範例與範本資料',async()=>{const 文=(await 狀態()).文件;驗證.equal(文.範本.length,3);驗證.equal(文.工作區[0].看板.length,3);});
 await 檢查('4K 同步放大元件文字與裁切',async()=>{
   const 原卡=(await 操作區()).find(區=>區[5]==='卡片');
   await 頁.setViewportSize({width:3840,height:2160});await 頁.waitForTimeout(150);await 安定();
   const 狀=await 狀態(),卡=(await 操作區()).find(區=>區[4]===原卡[4]);
   驗證.equal(狀.介面百分比,100);驗證.equal(狀.介面比例,2.4);驗證.ok(Math.abs(卡[3]/原卡[3]-2.4)<0.001);
   const 裁切們=await 頁.evaluate(()=>Array.from(window.裁切紀錄,文=>JSON.parse(文)));
   驗證.ok(裁切們.some(區=>Math.abs(區[0]-248*2.4)<0.001&&Math.abs(區[1]-225*2.4)<0.001),'看板裁切未隨介面放大：'+JSON.stringify(裁切們));
   const 加=await 找區('放大介面');驗證.ok(加[0]>3840*0.85&&加[1]>2160*0.9);
   await 頁.screenshot({path:路徑.join(結果根,'4K自動縮放.png')});
 });
 await 檢查('右下角增減縮放與重設不改動看板',async()=>{
   const 原=await 狀態();await 點('放大介面');const 大=await 狀態();
   驗證.equal(大.介面百分比,110);驗證.ok(Math.abs(大.介面比例/原.介面比例-1.1)<0.001);驗證.deepEqual(大.文件,原.文件);驗證.equal(大.未儲存,false);
   await 點('縮小介面');驗證.equal((await 狀態()).介面百分比,100);
   await 點('放大介面');await 點('重設介面縮放（100%）');驗證.equal((await 狀態()).介面百分比,100);
 });
 await 檢查('放大後卡片詳情文字輸入與縮放控制',async()=>{
   await 點('放大介面');const 原卡=(await 操作區()).find(區=>區[5]==='卡片');await 點(原卡[4]);
   驗證.equal((await 狀態()).對話,'詳情');await 點('卡片名稱');await 頁.keyboard.press('End');
   const 輸入=await 頁.evaluate(()=>{const 欄=document.querySelector('textarea');return {左:parseFloat(欄.style.left),上:parseFloat(欄.style.top),高:parseFloat(欄.style.height)};});
   驗證.ok(輸入.左>0&&輸入.左<3840&&輸入.上>0&&輸入.上<2160);驗證.ok(輸入.高>50);
   await 點('放大介面');驗證.equal((await 狀態()).對話,'詳情');驗證.equal((await 狀態()).介面百分比,120);await 點('關閉詳情');await 點('重設介面縮放（100%）');
 });
 await 檢查('縮放上下限與工具換行',async()=>{
   await 頁.setViewportSize({width:1440,height:900});await 頁.waitForTimeout(150);
   for(let 次=0;次<5;次++)await 點('放大介面');驗證.equal((await 狀態()).介面百分比,150);
   驗證.ok(!(await 操作區()).some(區=>區[4]==='放大介面'));const 清=await 找區('清除篩選'),負=await 找區('負責人');驗證.ok(清[1]>負[1]+負[3]);
   for(const 區 of await 操作區()){驗證.ok(區[0]>=0&&區[1]>=0&&區[0]+區[2]<=1440.01&&區[1]+區[3]<=900.01,'操作區超出視窗：'+區[4]);}
   const 來源=(await 操作區()).find(區=>區[5]==='卡片'),比例=(await 狀態()).介面比例,目標索=1;
   await 頁.mouse.move(來源[0]+來源[2]/2,來源[1]+40*比例);await 頁.mouse.down();await 頁.mouse.move((248+目標索*298+140)*比例,來源[1]+40*比例,{steps:8});await 頁.mouse.up();await 安定();
   驗證.ok((await 狀態()).文件.工作區[0].看板[0].清單[目標索].卡片.some(卡=>'卡片：'+卡.名稱===來源[4]));await 點('復原');
   await 頁.screenshot({path:路徑.join(結果根,'放大與工具換行.png')});
   for(let 次=0;次<8;次++)await 點('縮小介面');驗證.equal((await 狀態()).介面百分比,70);驗證.ok(!(await 操作區()).some(區=>區[4]==='縮小介面'));await 點('重設介面縮放（100%）');
 });
 await 檢查('網頁縮放偏好重新開啟恢復',async()=>{
   await 點('放大介面');const 等=頁.waitForEvent('download');await 點('儲存備份');await (await 等).saveAs(路徑.join(結果根,'縮放驗證備份.星板'));await 頁.evaluate(()=>window.aquarius.stop());await 啟動();
   驗證.equal((await 狀態()).介面百分比,110);驗證.equal((await 狀態()).未儲存,false);await 點('重設介面縮放（100%）');
 });
 await 檢查('移除工作區總覽並保留工作空間入口',async()=>{驗證.ok(!(await 操作區()).some(區=>區[4]==='工作區'));await 找區('我的星泉工作室  ▾');驗證.equal((await 狀態()).頁面,'看板');});
 await 點('範本');await 點('使用範本');await 點('新看板名稱');await 頁.keyboard.press('Control+A');await 頁.keyboard.insertText('測試範本看板');await 點('確認');
 await 檢查('從範本建立獨立看板',async()=>驗證.equal((await 狀態()).文件.工作區[0].看板.at(-1).名稱,'測試範本看板'));
 await 點('卡片：捕捉一個讓你心動的點子');await 點('卡片名稱');await 頁.keyboard.press('Control+A');await 頁.keyboard.insertText('繁體中文輸入測試');await 點('關閉詳情');
 await 檢查('中文輸入與網頁待存狀態',async()=>{const 狀=await 狀態();驗證.equal(狀.文件.工作區[0].看板.at(-1).清單[0].卡片[0].名稱,'繁體中文輸入測試');驗證.equal(狀.未儲存,true);});
 await 點('復原');await 檢查('實際介面復原',async()=>驗證.equal((await 狀態()).文件.工作區[0].看板.at(-1).清單[0].卡片[0].名稱,'捕捉一個讓你心動的點子'));
 await 點('重做');
 await 檢查('繁體中文多行說明與游標',async()=>{await 點('卡片：繁體中文輸入測試');await 點('說明與背景');await 頁.keyboard.press('Control+A');await 頁.keyboard.insertText('第一行：讓想法開始流動。');await 頁.keyboard.press('Enter');await 頁.keyboard.insertText('第二行：這是一段會依照欄位寬度自動換行的繁體中文說明，文字保持在輸入框裡面。');await 頁.keyboard.press('Enter');await 頁.keyboard.insertText('第三行：準備好下一步。');await 安定();const 卡=(await 狀態()).文件.工作區[0].看板.at(-1).清單[0].卡片[0];驗證.ok(卡.說明.includes('\n第二行'),JSON.stringify(卡.說明));await 頁.screenshot({path:路徑.join(結果根,'卡片詳情.png')});await 點('關閉詳情');});
 const 下載等待=頁.waitForEvent('download');await 點('儲存備份');const 下載=await 下載等待;await 下載.saveAs(路徑.join(結果根,'往返備份.星板'));
 await 檢查('網頁手動匯出',async()=>{驗證.equal((await 狀態()).未儲存,false);驗證.ok((await 讀取(路徑.join(結果根,'往返備份.星板'))).length>1000);});
 await 點('卡片：繁體中文輸入測試');await 點('卡片名稱');await 頁.keyboard.press('Control+A');await 頁.keyboard.insertText('載入前的變更');await 點('關閉詳情');
 const 選檔等待=頁.waitForEvent('filechooser');await 點('載入');const 選檔=await 選檔等待;await 選檔.setFiles(路徑.join(結果根,'往返備份.星板'));await 頁.waitForTimeout(150);await 點('確認');
 await 檢查('網頁手動載入完整往返',async()=>驗證.equal((await 狀態()).文件.工作區[0].看板.at(-1).清單[0].卡片[0].名稱,'繁體中文輸入測試'));
 await 檢查('損壞備份保留目前文件',async()=>{await 寫入(路徑.join(結果根,'損壞備份.星板'),new Uint8Array([1,2,3]));const 等=頁.waitForEvent('filechooser');await 點('載入');await (await 等).setFiles(路徑.join(結果根,'損壞備份.星板'));await 頁.waitForTimeout(100);await 點('確認');驗證.equal((await 狀態()).文件.工作區[0].看板.at(-1).名稱,'測試範本看板');驗證.match((await 狀態()).訊息,/不是支援/);await 呼叫('關對話');await 頁.waitForTimeout(100);});
 await 點('卡片：繁體中文輸入測試');
 await 檢查('附件加入與手動完整備份',async()=>{const 檔=路徑.join(結果根,'繁體中文附件.txt');await 寫入(檔,'星泉附件往返驗證');for(let 次=0;次<8&&!(await 操作區()).some(項=>項[4]==='＋ 加入附件');次++){await 頁.mouse.move(1000,660);await 頁.mouse.wheel(0,480);await 頁.waitForTimeout(100);}const 等=頁.waitForEvent('filechooser');await 點('＋ 加入附件');await (await 等).setFiles(檔);await 頁.waitForTimeout(150);const 附=(await 狀態()).文件.工作區[0].看板.at(-1).清單[0].卡片[0].附件[0];驗證.equal(附.名稱,'繁體中文附件.txt');驗證.equal(附.位元組,undefined);await 點('關閉詳情');const 存=頁.waitForEvent('download');await 點('儲存備份');await (await 存).saveAs(路徑.join(結果根,'附件備份.星板'));const 選=頁.waitForEvent('filechooser');await 點('載入');await (await 選).setFiles(路徑.join(結果根,'附件備份.星板'));await 頁.waitForTimeout(120);await 點('確認');await 點('卡片：繁體中文輸入測試');for(let 次=0;次<8&&!(await 操作區()).some(項=>項[4]==='另存');次++){await 頁.mouse.move(1000,660);await 頁.mouse.wheel(0,480);await 頁.waitForTimeout(100);}const 附存=頁.waitForEvent('download');await 點('另存');await (await 附存).saveAs(路徑.join(結果根,'附件載回.txt'));驗證.deepEqual(await 讀取(路徑.join(結果根,'附件載回.txt')),await 讀取(檔));await 點('關閉詳情');});
 await 檢查('拖曳卡片跨清單',async()=>{const 來源=await 找區('卡片：繁體中文輸入測試');await 頁.mouse.move(來源[0]+100,來源[1]+40);await 頁.mouse.down();await 頁.mouse.move(來源[0]+400,來源[1]+45,{steps:8});await 頁.mouse.up();await 頁.waitForTimeout(180);const 板=(await 狀態()).文件.工作區[0].看板.at(-1);驗證.ok(板.清單[1].卡片.some(卡=>卡.名稱==='繁體中文輸入測試'));});
 await 檢查('表格視圖',async()=>{await 點('表格');驗證.ok((await 操作區()).some(項=>項[4]==='繁體中文輸入測試'));const 區=(await 操作區()).findLast(項=>項[4]==='看板');await 頁.mouse.click(區[0]+區[2]/2,區[1]+區[3]/2);await 頁.waitForTimeout(100);驗證.equal((await 狀態()).檢視,'流動');});
 await 檢查('檢查表與步驟勾選',async()=>{await 點('卡片：繁體中文輸入測試');await 點('＋ 檢查表');await 點('檢查表名稱');await 頁.keyboard.press('Control+A');await 頁.keyboard.insertText('繁體中文檢查表');await 點('確認');await 點('＋ 新增步驟');await 點('內容');await 頁.keyboard.insertText('完成第一個步驟');await 點('確認');await 點('○ 完成第一個步驟');const 狀=await 狀態(),板=狀.文件.工作區[0].看板.at(-1),卡=板.清單.flatMap(列=>列.卡片).find(卡=>卡.名稱==='繁體中文輸入測試');驗證.equal(卡.檢查表[0].項目[0].完成,true);await 點('關閉詳情');});
 await 檢查('編輯中使用儲存快捷鍵',async()=>{await 點('搜尋卡片');const 等=頁.waitForEvent('download');await 頁.keyboard.press('Control+s');await (await 等).saveAs(路徑.join(結果根,'快捷鍵備份.星板'));await 安定();驗證.equal((await 狀態()).未儲存,false);});
 await 檢查('工作空間隔離與新看板',async()=>{await 點('我的星泉工作室  ▾');await 點('＋ 建立工作區');await 點('工作區名稱');await 頁.keyboard.insertText('第二個工作區');await 點('確認');const 空=await 狀態();驗證.equal(空.目前板,0);驗證.equal(空.頁面,'看板');await 找區('＋ 建立看板');await 點('＋ 新增看板');await 點('看板名稱');await 頁.keyboard.insertText('新工作區看板');await 點('確認');const 狀=await 狀態();驗證.equal(狀.文件.工作區[1].看板[0].名稱,'新工作區看板');驗證.equal(狀.目前區,狀.文件.工作區[1].編號);});
 await 檢查('工作空間下拉選單反覆切換並保留內容',async()=>{
   const 原=await 狀態(),空間們=原.文件.工作區;
   await 點('搜尋卡片');await 頁.keyboard.insertText('不符合任何卡片的搜尋');await 點('範本');
   for(let 次=0;次<4;次++){
     const 索=次%2,來源=空間們[1-索],目標=空間們[索];await 點(來源.名稱+'  ▾');await 點(目標.名稱);
     const 狀=await 狀態();驗證.equal(狀.目前區,目標.編號);驗證.equal(狀.目前板,目標.看板[0].編號);驗證.equal(狀.頁面,'看板');驗證.equal(狀.對話,'');
     驗證.equal(狀.水平,0);驗證.equal(狀.垂直,0);驗證.deepEqual(狀.文件.工作區,原.文件.工作區);await 找區('開啟看板：'+目標.看板[0].名稱);
     if(索===0)await 找區('卡片：捕捉一個讓你心動的點子');
   }
   await 點('第二個工作區  ▾');await 點('第二個工作區');驗證.equal((await 狀態()).目前區,空間們[1].編號);
   await 點('第二個工作區  ▾');await 點('工作空間設定');await 找區('重新命名工作區');await 點('關閉');
   await 點('第二個工作區  ▾');await 點('我的星泉工作室');await 點('開啟看板：測試範本看板');
 });
 await 檢查('封存與恢復卡片',async()=>{await 點('卡片：繁體中文輸入測試');await 點('封存卡片');await 點('封存庫');await 點('恢復');await 點('開啟看板：測試範本看板');await 找區('卡片：繁體中文輸入測試');});
 await 檢查('閒置不持續繪圖',async()=>{const 起=await 頁.evaluate(()=>window.aquarius.host.processing.frameCount);await 頁.waitForTimeout(600);const 終=await 頁.evaluate(()=>window.aquarius.host.processing.frameCount);驗證.ok(終-起<=2);});
 await 檢查('四千張卡片雙軸捲動與可見區繪製',async()=>{const 起=Date.now();await 呼叫('建立壓力資料');await 頁.waitForTimeout(180);const 初=(await 操作區());驗證.ok(初.length<180);const 橫=await 找區('水平捲動條');await 頁.mouse.move(橫[0]+35,橫[1]+5);await 頁.mouse.down();await 頁.mouse.move(橫[0]+橫[2]*0.48,橫[1]+5,{steps:4});await 頁.mouse.up();await 頁.waitForTimeout(120);驗證.ok((await 狀態()).水平>1000);const 縱=await 找區('垂直捲動條');await 頁.mouse.move(縱[0]+5,縱[1]+16);await 頁.mouse.down();await 頁.mouse.move(縱[0]+5,縱[1]+縱[3]*0.48,{steps:4});await 頁.mouse.up();await 頁.waitForTimeout(120);驗證.ok((await 狀態()).垂直>1000);const 區=await 操作區();驗證.ok(區.filter(項=>項[5]==='卡片').length<=30);await 頁.screenshot({path:路徑.join(結果根,'大量卡片與雙軸捲動.png')});結果.push({名稱:'四千張卡片建立與操作耗時',毫秒:Date.now()-起,可見操作區:區.length});const 帧=await 頁.evaluate(()=>window.aquarius.host.processing.frameCount);const 開=performance.now();await 頁.mouse.move(820,460);await 頁.mouse.wheel(0,180);await 頁.waitForFunction(起=>window.aquarius.host.processing.frameCount>起,帧);結果.push({名稱:'四千張卡片滾輪至完成繪圖',毫秒:Math.round(performance.now()-開)});});
 await 檢查('四千張卡片穩定繪圖量測',async()=>{const 耗時=[];await 頁.mouse.move(820,460);await 安定();for(let 次=0;次<8;次++){const 帧=await 頁.evaluate(()=>window.完成繪圖);await 頁.mouse.wheel(0,80);await 頁.waitForFunction(起=>window.完成繪圖>起,帧);await 安定();耗時.push(await 頁.evaluate(()=>Math.round(window.最近繪圖耗時)));}耗時.sort((甲,乙)=>甲-乙);結果.push({名稱:'四千張卡片捲動繪圖量測',樣本毫秒:耗時,中位數毫秒:耗時[4],最大毫秒:耗時[7]});驗證.ok(耗時[4]<150,'捲動繪圖中位數超過一百五十毫秒');});
 await 檢查('縮放視窗保留操作能力',async()=>{await 頁.setViewportSize({width:1100,height:700});await 頁.waitForTimeout(150);await 找區('儲存備份');await 找區('水平捲動條');await 頁.screenshot({path:路徑.join(結果根,'縮放視窗.png')});});
 驗證.deepEqual(錯誤,[]);
}catch(錯){結果.push({名稱:'瀏覽器整合',通過:false,錯誤:錯.stack});console.error(錯);await 頁.screenshot({path:路徑.join(結果根,'失敗畫面.png')});process.exitCode=1;}
finally{await 頁.evaluate(()=>window.aquarius?.stop()).catch(()=>{});await 瀏覽器.close();await new Promise(完成=>伺服器.close(完成));await 寫入(路徑.join(結果根,'瀏覽器結果.json'),JSON.stringify({結果,錯誤},null,2));}
