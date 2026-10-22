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
const 只跑=process.argv.find(參數=>參數.startsWith('--只跑='))?.slice(5);
await 建立目錄(結果根,{recursive:true});
const 伺服器=建立伺服器(async(請求,回應)=>{try{const 網址=new URL(請求.url,'http://localhost'),名字=decodeURIComponent(網址.pathname),檔=路徑.resolve(網頁根,'.'+名字+(名字.endsWith('/')?'index.html':''));if(!檔.startsWith(網頁根+路徑.sep))throw Error('無效路徑');回應.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm'})[路徑.extname(檔)]??'application/octet-stream');回應.end(await 讀取(檔));}catch{回應.statusCode=404;回應.end();}});
await new Promise(完成=>伺服器.listen(0,'127.0.0.1',完成));
// KANBAN_CHROMIUM 指定 Chromium 執行檔時使用軟體 WebGPU（容器與持續整合）；否則使用本機 Chrome。
const 啟動參數=process.env.KANBAN_CHROMIUM
  ?{executablePath:process.env.KANBAN_CHROMIUM,headless:!process.env.DISPLAY,ignoreDefaultArgs:['--disable-gpu'],args:['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-webgpu-adapter=swiftshader','--disable-vulkan-surface','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--enable-gpu-compositing','--enable-gpu',...(process.env.DISPLAY?['--ozone-platform=x11']:[])]}
  :{channel:'chrome',headless:true,args:['--enable-unsafe-webgpu']};
const 瀏覽器=await 鉻.launch(啟動參數);
const 情境=await 瀏覽器.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
await 情境.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:'+伺服器.address().port});
const 頁=await 情境.newPage(),錯誤=[],結果=[];
await 頁.addInitScript(()=>{Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});Object.defineProperty(window,'showOpenFilePicker',{value:undefined,configurable:true});});
// 部分 X 視窗環境會在 setFiles 前送出 cancel；僅於測試用 Chromium 忽略檔案選擇的 cancel。
if(process.env.KANBAN_CHROMIUM)await 頁.addInitScript(()=>{const 原=HTMLInputElement.prototype.addEventListener;HTMLInputElement.prototype.addEventListener=function(類,處,...其){if(this.type==='file'&&類==='cancel')return;return 原.call(this,類,處,...其);};});
頁.on('pageerror',錯=>錯誤.push(錯.message));
const 檢查=async(名稱,處理)=>{if(只跑&&!只跑.split('|').some(片=>名稱.includes(片))&&!處理.必跑)return;await 處理();結果.push({名稱,通過:true});console.log('通過：'+名稱);};
const 安定=async()=>{await 頁.waitForFunction(()=>window.aquarius.host?.processing&&window.aquarius.host.processing.frameCount===window.完成繪圖&&window.aquarius.host.processing.eventQueue.length===0);};
const 呼叫值=async(檔,名稱,參數=[])=>{await 安定();return 頁.evaluate(async([檔,名稱,參數])=>{const 機=window.aquarius.host,轉=(await import('./application.mjs')).toValue;return 轉(await 機.runtime.invoke(機.cache.get(檔).scope.get(名稱),參數));},[檔,名稱,參數]);};
const 狀態=()=>呼叫值('星泉看板.aqua','取得狀態');
const 操作區=()=>呼叫值('星泉看板.aqua','取得操作區');
const 呼叫=(名稱,參數=[])=>呼叫值('星泉看板.aqua',名稱,參數);
const 整數=值=>({type:'int',value:值});
const 編輯文字=()=>頁.evaluate(async()=>{const 機=window.aquarius.host,轉=(await import('./application.mjs')).toValue;const 編=機.cache.get('星泉看板.aqua').scope.get('編輯器');if(!編)return null;return 轉(await 機.runtime.invoke(機.cache.get('星泉介面.aqua').scope.get('編輯內容'),[編]));});
const 找區=async(標籤,種類)=>{let 區;for(let 次=0;次<30&&!區;次++){區=(await 操作區()).find(項=>項[4]===標籤&&(!種類||項[5]===種類));if(!區)await 頁.waitForTimeout(80);}驗證.ok(區,'找不到操作區：'+標籤+' ｜ 目前：'+(await 操作區()).map(項=>項[4]).slice(-40).join(' / '));return 區;};
const 中心=區=>[區[0]+區[2]/2,區[1]+區[3]/2];
const 點=async(標籤,選項={})=>{const 區=await 找區(標籤,選項.種類);const [橫,縱]=中心(區);await 頁.mouse.click(橫+(選項.偏橫??0),縱+(選項.偏縱??0),{button:選項.按鈕??'left'});await 頁.waitForTimeout(60);if(選項.等待!==false)await 安定();};
const 右鍵=(標籤,選項={})=>點(標籤,{...選項,按鈕:'right'});
const 卡區=async(名稱)=>找區('Card: '+名稱,'卡片');
const 拖曳=async(起,終,步=10)=>{await 頁.mouse.move(起[0],起[1]);await 頁.mouse.down();await 頁.mouse.move(起[0]+4,起[1]+4,{steps:2});await 頁.mouse.move(終[0],終[1],{steps:步});await 頁.waitForTimeout(80);await 頁.mouse.up();await 頁.waitForTimeout(120);await 安定();};
const 文件=async()=>(await 狀態()).文件;
const 看板=async(索=0)=>(await 文件()).工作區[0].看板[索];
const 找卡=(板,名稱)=>板.清單.flatMap(列=>列.卡片).find(卡=>卡.名稱===名稱);
const 等待=ms=>頁.waitForTimeout(ms);
const 等存=async()=>{for(let 次=0;次<40;次++){if(!(await 狀態()).未儲存)return;await 等待(100);}驗證.fail('自動儲存沒有完成');};
const 啟動=async()=>{
 await 頁.goto('http://127.0.0.1:'+伺服器.address().port+'/?autorun=0');
 await 頁.waitForFunction(()=>window.aquarius);
 await 頁.evaluate(()=>{window.看板工作=window.aquarius.run(window.aquarius.bundle.entry,0).catch(錯=>{window.啟動錯誤=錯.message;});});
 await 頁.waitForFunction(()=>window.aquarius.host?.processing||window.啟動錯誤);
 await 頁.evaluate(()=>{
   const 機=window.aquarius.host.processing,完成=機.endFrame.bind(機),開始=機.beginFrame.bind(機),繪=機.screen.draw.bind(機.screen);
   window.完成繪圖=0;window.裁切紀錄=new Set();window.待裁切紀錄=new Set();window.文字紀錄=[];
   機.screen.draw=(...參數)=>{
     const 畫面=機.screen,[頂點,材質]=參數;
     if(畫面.clip)window.待裁切紀錄.add(JSON.stringify(畫面.clip));
     if(window.記錄文字&&材質&&Array.from(機.textCache.values()).includes(材質)){
       const 左=Math.min(...頂點.map(點=>點[0])),上=Math.min(...頂點.map(點=>點[1]));
       window.待文字紀錄.push({矩陣:Array.from(畫面.model),字級:畫面.style.textSize,密度:畫面.pixelHeight/畫面.height,
         左:左*畫面.pixelWidth/畫面.width,上:上*畫面.pixelHeight/畫面.height,
         寬:(Math.max(...頂點.map(點=>點[0]))-左)*畫面.pixelWidth/畫面.width,
         高:(Math.max(...頂點.map(點=>點[1]))-上)*畫面.pixelHeight/畫面.height,
         材質寬:材質.texture.width,材質高:材質.texture.height});
     }
     return 繪(...參數);
   };
   機.beginFrame=async()=>{window.繪圖起點=performance.now();window.待裁切紀錄=new Set();window.待文字紀錄=[];return 開始();};
   機.endFrame=async()=>{await 完成();window.裁切紀錄=window.待裁切紀錄;window.文字紀錄=window.待文字紀錄;window.完成繪圖=機.frameCount;window.最近繪圖耗時=performance.now()-window.繪圖起點;};
 });
 await 頁.waitForFunction(()=>window.完成繪圖>=2||window.啟動錯誤);
 await 等待(100);
 驗證.equal(await 頁.evaluate(()=>window.啟動錯誤),undefined);
};
const 設視窗=async(寬,高)=>{await 頁.setViewportSize({width:寬,height:高});for(let 次=0;次<60;次++){await 等待(60);const 狀=await 狀態();if(Math.abs(狀.版寬*狀.介面比例-寬)<1&&Math.abs(狀.版高*狀.介面比例-高)<1)return;}驗證.fail('視窗尺寸沒有更新');};
const 截圖=名稱=>頁.screenshot({path:路徑.join(結果根,名稱+'.png')});
const 無缺字=async()=>驗證.deepEqual((await 狀態()).缺字,[],'有未翻譯的介面文字');
const 必=處理=>{處理.必跑=true;return 處理;};
try{
 await 啟動();
 await 檢查('首次開啟為英文並顯示入門導覽',必(async()=>{const 狀=await 狀態();驗證.equal(狀.教學,0);驗證.equal(狀.語言,0);await 找區('Next');await 截圖('首次導覽');}));
 await 檢查('導覽可前後移動並以聚光燈標示目標',必(async()=>{await 點('Next');驗證.equal((await 狀態()).教學,1);await 截圖('導覽聚光燈');await 點('Back');驗證.equal((await 狀態()).教學,0);await 點('Skip tour');驗證.equal((await 狀態()).教學,-1);}));
 await 檢查('網頁環境與範例資料',必(async()=>{const 狀=await 狀態();驗證.equal(狀.是網頁,true);驗證.equal(狀.文件.範本.length,3);驗證.equal(狀.文件.工作區[0].看板.length,3);await 截圖('看板畫面');}));
 await 檢查('鍵盤輸入、全選取代與退格',async()=>{
   await 點('Search cards',{種類:'輸入'});
   驗證.equal(await 頁.evaluate(()=>document.activeElement===window.aquarius.host.processing.textarea),true,'點選欄位後文字接收器沒有焦點');
   await 頁.keyboard.type('hello world');await 安定();驗證.equal(await 編輯文字(),'hello world');
   await 頁.keyboard.press('Control+A');await 頁.keyboard.type('replace');await 頁.keyboard.press('Backspace');await 安定();驗證.equal(await 編輯文字(),'replac');
   await 頁.keyboard.press('Escape');await 點('Clear filters');
 });
 await 檢查('中文組字提交一次並接續一般鍵入',async()=>{
   await 點('Search cards',{種類:'輸入'});const 協定=await 頁.context().newCDPSession(頁);
   await 協定.send('Input.imeSetComposition',{text:'中文',selectionStart:2,selectionEnd:2});await 安定();驗證.equal(await 編輯文字(),'');
   await 協定.send('Input.insertText',{text:'中文'});await 安定();驗證.equal(await 編輯文字(),'中文');
   await 頁.keyboard.type(' test');await 安定();驗證.equal(await 編輯文字(),'中文 test');
   await 協定.detach();await 頁.keyboard.press('Escape');await 點('Clear filters');
 });
 await 檢查('滑鼠拖曳選取文字、雙擊選字、三擊全選與位移鍵延伸',async()=>{
   await 點('Search cards',{種類:'輸入'});await 頁.keyboard.type('alpha beta gamma');await 安定();
   const 區=await 找區('Search cards','輸入');const 起=區[0]+36,縱=區[1]+區[3]/2;
   await 頁.mouse.move(起,縱);await 頁.mouse.down();await 頁.mouse.move(起+60,縱,{steps:5});await 頁.mouse.up();await 安定();
   let 選=(await 狀態()).選取;驗證.ok(選[0]!==選[1],'拖曳沒有選取文字：'+JSON.stringify(選));驗證.equal(Math.min(...選),0);
   let 字橫=起+60;for(let 橫=起;橫<起+220;橫+=3){await 頁.mouse.click(橫,縱);await 安定();if((await 狀態()).選取[1]===8){字橫=橫;break;}await 等待(450);}
   await 等待(500);await 頁.mouse.dblclick(字橫,縱);await 安定();選=(await 狀態()).選取;驗證.deepEqual([Math.min(...選),Math.max(...選)],[6,10],'雙擊應選取 beta：'+JSON.stringify(選));
   await 等待(500);await 頁.mouse.click(字橫,縱,{clickCount:3});await 安定();選=(await 狀態()).選取;
   if(Math.abs(選[0]-選[1])!==16){await 頁.mouse.click(字橫,縱);await 頁.mouse.click(字橫,縱);await 頁.mouse.click(字橫,縱);await 安定();選=(await 狀態()).選取;}
   驗證.deepEqual([Math.min(...選),Math.max(...選)],[0,16]);
   await 頁.keyboard.press('End');await 頁.keyboard.press('Shift+ArrowLeft');await 頁.keyboard.press('Shift+ArrowLeft');await 安定();選=(await 狀態()).選取;驗證.deepEqual(選,[16,14]);
   await 截圖('文字選取');
 });
 await 檢查('文字右鍵選單複製、貼上與全選',async()=>{
   await 頁.keyboard.press('Control+A');await 安定();await 右鍵('Search cards',{種類:'輸入'});await 找區('Copy');await 截圖('文字右鍵選單');await 點('Copy');
   驗證.equal((await 狀態()).編輯識別,'搜尋','複製後應保留編輯');
   驗證.equal(await 頁.evaluate(()=>navigator.clipboard.readText()),'alpha beta gamma');
   await 頁.keyboard.press('End');await 右鍵('Search cards',{種類:'輸入',偏橫:80});await 點('Paste');await 安定();驗證.equal(await 編輯文字(),'alpha beta gammaalpha beta gamma');
   await 右鍵('Search cards',{種類:'輸入'});await 點('Select all');const 選=(await 狀態()).選取;驗證.equal(Math.abs(選[0]-選[1]),32);
   await 頁.keyboard.press('Escape');await 點('Clear filters');
 });
 await 檢查('解析度與 DPI 變更後文字按實際像素重繪',async()=>{
   await 頁.evaluate(()=>window.記錄文字=true);
   for(const [寬,高,密度,百分比] of [[1440,900,1,70],[1920,1080,1,110],[2560,1440,1,150],[3840,2160,1,100],[1440,900,1.25,110],[1440,900,1.5,110],[1440,900,2,110]]){
     await 頁.setViewportSize({width:寬,height:高});
     await 頁.evaluate(({密度,百分比})=>{Object.defineProperty(window,'devicePixelRatio',{value:密度,configurable:true});const 機=window.aquarius.host;return 機.runtime.invoke(機.cache.get('星泉看板.aqua').scope.get('設定介面縮放'),[{type:'int',value:百分比}]);},{密度,百分比});
     await 頁.waitForFunction(({寬,高,密度})=>{const 機=window.aquarius.host.processing;return 機.screen.pixelWidth===寬*密度&&機.screen.pixelHeight===高*密度&&window.完成繪圖===機.frameCount&&window.文字紀錄.length>0;},{寬,高,密度});await 安定();
     const 紀錄=await 頁.evaluate(()=>window.文字紀錄);驗證.ok(紀錄.length>20);
     for(const 文 of 紀錄){
       驗證.deepEqual(文.矩陣,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],'文字仍隨版面矩陣拉伸');
       驗證.ok(Math.abs(文.字級*文.密度-Math.round(文.字級*文.密度))<0.001,'字級未對齊實際像素');
       for(const 值 of [文.左,文.上])驗證.ok(Math.abs(值-Math.round(值))<0.001,'文字起點未對齊實際像素：'+JSON.stringify(文));
       驗證.ok(Math.abs(文.寬-文.材質寬)<0.01&&Math.abs(文.高-文.材質高)<0.01,'文字材質受到二次縮放：'+JSON.stringify(文));
     }
   }
   await 截圖('高DPI文字');
   await 頁.evaluate(()=>{delete window.devicePixelRatio;window.記錄文字=false;});await 設視窗(1440,900);await 呼叫('設定介面縮放',[整數(100)]);await 等待(200);await 安定();
 });
 await 檢查('4K 同步放大元件文字與裁切',async()=>{
   const 原卡=await 找區('Save backup');
   await 設視窗(3840,2160);
   const 狀=await 狀態(),卡=await 找區('Save backup');
   驗證.equal(狀.介面百分比,100);驗證.equal(狀.介面比例,2.4);驗證.ok(Math.abs(卡[3]/原卡[3]-2.4)<0.01,'按鈕沒有同步放大：'+JSON.stringify([原卡,卡]));
   const 加=await 找區('Zoom in');驗證.ok(加[0]>3840*0.85&&加[1]>2160*0.9);await 截圖('4K自動縮放');
   await 設視窗(1440,900);
 });
 await 檢查('小視窗不再縮小文字',async()=>{
   await 設視窗(1100,700);const 狀=await 狀態();驗證.equal(狀.介面比例,1);驗證.equal(狀.版寬,1100);
   for(const 區 of await 操作區())驗證.ok(區[0]+區[2]<=1100.5,'操作區超出視窗：'+區[4]);
   await 截圖('小視窗');await 設視窗(1440,900);
 });
 await 檢查('右下角縮放上下限與重設不改動看板',async()=>{
   const 原=await 狀態();await 點('Zoom in');const 大=await 狀態();驗證.equal(大.介面百分比,110);驗證.ok(Math.abs(大.介面比例/原.介面比例-1.1)<0.001);驗證.deepEqual(大.文件,原.文件);
   await 點('Zoom out');驗證.equal((await 狀態()).介面百分比,100);
   for(let 次=0;次<5;次++)await 點('Zoom in');驗證.equal((await 狀態()).介面百分比,150);驗證.ok(!(await 操作區()).some(區=>區[4]==='Zoom in'));
   for(const 區 of await 操作區())驗證.ok(區[0]>=0&&區[1]>=0&&區[0]+區[2]<=1440.01&&區[1]+區[3]<=900.01,'操作區超出視窗：'+區[4]);
   await 截圖('放大與工具換行');await 點('Reset zoom (100%)');驗證.equal((await 狀態()).介面百分比,100);
   for(let 次=0;次<3;次++)await 點('Zoom out');驗證.equal((await 狀態()).介面百分比,70);驗證.ok(!(await 操作區()).some(區=>區[4]==='Zoom out'));await 點('Reset zoom (100%)');
 });
 await 檢查('按鈕在放開時才執行，移出按鈕可取消',async()=>{
   const 區=await 找區('Templates');const [橫,縱]=中心(區);await 頁.mouse.move(橫,縱);await 頁.mouse.down();await 安定();驗證.equal((await 狀態()).頁面,'看板','按下時就執行了');
   await 頁.mouse.move(橫+300,縱+400,{steps:4});await 頁.mouse.up();await 安定();驗證.equal((await 狀態()).頁面,'看板','移出後仍執行');
   await 點('Templates');驗證.equal((await 狀態()).頁面,'範本');await 點('Board');
 });
 await 檢查('拖曳卡片跨清單、拖曳中按離開鍵取消，並可復原',async()=>{
   const 名='Capture an idea that excites you';const 來源=中心(await 卡區(名));const 目標=中心(await 找區('List: Up next','清單頭'));
   await 頁.mouse.move(...來源);await 頁.mouse.down();await 頁.mouse.move(目標[0],目標[1]+200,{steps:8});await 安定();await 截圖('拖曳卡片');await 頁.keyboard.press('Escape');await 頁.mouse.up();await 安定();
   驗證.equal((await 看板()).清單[0].卡片[0].名稱,名,'離開鍵應取消拖曳');
   await 拖曳(來源,[目標[0],目標[1]+200]);驗證.ok((await 看板()).清單[1].卡片.some(卡=>卡.名稱===名),'卡片沒有移到第二欄');
   await 點('Undo: Move card');驗證.equal((await 看板()).清單[0].卡片[0].名稱,名);
 });
 await 檢查('在輸入欄拖曳只選取文字，不會拖動卡片',async()=>{
   await 點('Card: Capture an idea that excites you',{種類:'卡片'});驗證.equal((await 狀態()).對話,'詳情');
   const 區=await 找區('Card name','輸入');const 起=[區[0]+20,區[1]+區[3]/2];await 拖曳(起,[起[0]+120,起[1]+80]);
   const 狀=await 狀態();驗證.equal(狀.對話,'詳情');驗證.ok(狀.選取[0]!==狀.選取[1],'沒有選取到文字');驗證.equal((await 看板()).清單[0].卡片[0].名稱,'Capture an idea that excites you');
   await 頁.keyboard.press('Escape');await 頁.keyboard.press('Escape');驗證.equal((await 狀態()).對話,'');
 });
 await 檢查('聚焦欄位不會產生空的復原步驟或清除重做',async()=>{
   const 前=await 狀態();await 點('Card: Capture an idea that excites you',{種類:'卡片'});await 點('Card name',{種類:'輸入'});await 點('Description',{種類:'輸入'});await 頁.keyboard.press('Escape');await 頁.keyboard.press('Escape');
   const 後=await 狀態();驗證.equal(後.復原數,前.復原數);驗證.equal(後.可重做,前.可重做);
 });
 await 檢查('卡片詳情的子對話取消後回到詳情並保留捲動位置',async()=>{
   await 點('Card: Design a small, beautiful home page',{種類:'卡片'});
   await 點('Add an item to “Before launch”');for(const 名 of ['Write the release notes','Check links','Prepare screenshots','Review spacing','Test on mobile','Ask a friend','Publish'])
   {await 頁.keyboard.type(名);await 頁.keyboard.press('Enter');}await 頁.keyboard.press('Escape');await 安定();
   const 卡=找卡(await 看板(),'Design a small, beautiful home page');驗證.deepEqual(卡.檢查表[0].項目.slice(3,5).map(項=>項.名稱),['Write the release notes','Check links']);
   await 頁.mouse.move(700,500);await 頁.mouse.wheel(0,300);await 等待(500);await 安定();const 捲=(await 狀態()).詳情垂直;驗證.ok(捲>30,'詳情沒有捲動：'+捲);
   await 點('Add an item to “Before launch”');await 頁.keyboard.type('One more');await 頁.keyboard.press('Enter');await 頁.keyboard.press('Escape');await 安定();
   驗證.ok(Math.abs((await 狀態()).詳情垂直-捲)<60,'新增步驟後捲動位置跳到頂端：'+(await 狀態()).詳情垂直);
   await 頁.mouse.move(700,300);await 頁.mouse.wheel(0,-2000);await 等待(500);await 安定();
   await 點('Due date',{種類:'按鈕'});驗證.equal((await 狀態()).對話,'日期');await 截圖('日期選擇');await 頁.keyboard.press('Escape');
   驗證.equal((await 狀態()).對話,'詳情','取消日期選擇後詳情被關閉');
   await 點('Due date',{種類:'按鈕'});await 點('Tomorrow');const 卡後=找卡(await 看板(),'Design a small, beautiful home page');驗證.equal(卡後.到期日.length,10);驗證.equal((await 狀態()).對話,'詳情');
   await 截圖('卡片詳情');await 點('Close card');
 });
 await 檢查('檢查表項目可拖曳排序',async()=>{
   await 點('Card: Design a small, beautiful home page',{種類:'卡片'});
   const 甲=await 找區('Drag item: Confirm copy and visual direction','步驟握把');const 乙=await 找區('Item: Check small-screen layout','步驟');
   await 拖曳(中心(甲),[中心(甲)[0],乙[1]+乙[3]-4]);
   const 項們=找卡(await 看板(),'Design a small, beautiful home page').檢查表[0].項目.map(項=>項.名稱);驗證.equal(項們[0],'Finish layout sketches','拖曳後順序未變：'+項們.join(','));
   await 頁.keyboard.press('Escape');
 });
 await 檢查('表格視圖拖曳列不會移動卡片，並可依欄排序',async()=>{
   await 點('View: Table');const 前=JSON.stringify((await 看板()).清單.map(列=>列.卡片.map(卡=>卡.編號)));
   const 列=await 找區('Capture an idea that excites you','表格列');await 拖曳([列[0]+300,列[1]+20],[列[0]+900,列[1]+60]);
   驗證.equal(JSON.stringify((await 看板()).清單.map(列=>列.卡片.map(卡=>卡.編號))),前,'表格拖曳移動了卡片');
   驗證.equal((await 狀態()).對話,'');await 點('Sort by Priority');const 第一=(await 操作區()).find(區=>區[5]==='表格列');驗證.equal(第一[4],'Design a small, beautiful home page');
   await 截圖('表格視圖');await 點('View: Board');
 });
 await 檢查('日曆視圖拖曳卡片改變到期日',async()=>{
   await 點('View: Calendar');const 卡=(await 操作區()).find(區=>區[5]==='卡片');驗證.ok(卡,'日曆上沒有卡片');
   const 今=(await 狀態()).文件.今日;const 目標日=(await 操作區()).filter(區=>區[5]==='日曆格').find(區=>區[4]>今&&區[4].slice(0,7)===今.slice(0,7))??(await 操作區()).filter(區=>區[5]==='日曆格').at(-1);
   await 拖曳(中心(卡),中心(目標日));const 名=卡[4].replace('Card: ','');驗證.equal(找卡(await 看板(),名).到期日,目標日[4]);
   await 截圖('日曆視圖');await 點('View: Board');
 });
 await 檢查('側欄看板很多時可捲動到最後一份',async()=>{
   for(let 次=0;次<16;次++){await 點('New board');await 頁.keyboard.type('Extra board '+(次+1));await 頁.keyboard.press('Enter');await 安定();}
   await 點('Open board: Let ideas flow',{種類:'側欄看板'});
   驗證.ok(!(await 操作區()).some(區=>區[4]==='Open board: Extra board 16'),'最後的看板不應在可見範圍');
   await 頁.mouse.move(120,500);for(let 次=0;次<6;次++){await 頁.mouse.wheel(0,400);await 等待(120);}await 等待(400);await 安定();
   await 點('Open board: Extra board 16',{種類:'側欄看板'});const 狀=await 狀態();驗證.equal(狀.文件.工作區[0].看板.find(板=>板.編號===狀.目前板).名稱,'Extra board 16');
   await 截圖('側欄捲動');await 頁.mouse.move(120,500);await 頁.mouse.wheel(0,-4000);await 等待(500);await 安定();await 點('Open board: Let ideas flow',{種類:'側欄看板'});{const 狀=await 狀態();驗證.equal((await 看板()).編號,狀.目前板,'沒有切回第一份看板：'+JSON.stringify({指標:狀.指標,按下鍵:狀.按下鍵,側欄縱:狀.側欄縱,拖曳中:狀.拖曳中,對話:狀.對話,區:(await 操作區()).filter(區=>區[4]==='Open board: Let ideas flow')}));}
 });
 await 檢查('切換看板會清除所有篩選',async()=>{
   await 點('Tags');await 點('Ideas');驗證.equal((await 狀態()).標籤篩選,'Ideas');await 點('Open board: A week of small joys',{種類:'側欄看板'});
   const 狀=await 狀態();驗證.equal(狀.標籤篩選,'');驗證.equal(狀.狀態篩選,0);await 點('Open board: Let ideas flow',{種類:'側欄看板'});
 });
 await 檢查('在清單底部連續新增卡片',async()=>{
   await 點('Add a card to “Ideas”');await 頁.keyboard.type('First quick card');await 頁.keyboard.press('Enter');await 頁.keyboard.type('Second quick card');await 頁.keyboard.press('Enter');await 頁.keyboard.press('Escape');
   const 名們=(await 看板()).清單[0].卡片.map(卡=>卡.名稱);驗證.deepEqual(名們.slice(-2),['First quick card','Second quick card']);驗證.equal((await 狀態()).對話,'');
 });
 await 檢查('卡片快速完成按鈕',async()=>{await 點('Toggle complete: First quick card');驗證.equal(找卡(await 看板(),'First quick card').完成,true);await 點('Undo: Mark complete');驗證.equal(找卡(await 看板(),'First quick card').完成,false);});
 await 檢查('控制鍵多選、批次封存與提示復原',async()=>{
   const 甲=await 卡區('First quick card'),乙=await 卡區('Second quick card');
   await 頁.keyboard.down('Control');await 頁.mouse.click(...中心(甲));await 頁.mouse.click(...中心(乙));await 頁.keyboard.up('Control');await 安定();
   驗證.equal((await 狀態()).多選.length,2);await 點('2 selected');await 截圖('批次處理');await 點('Archive selected cards');
   驗證.ok(!(await 看板()).清單[0].卡片.some(卡=>!卡.封存&&卡.名稱.includes('quick card')));await 點('Undo',{種類:'按鈕'});
   驗證.equal((await 看板()).清單[0].卡片.filter(卡=>!卡.封存&&卡.名稱.includes('quick card')).length,2);
 });
 await 檢查('複製貼上卡片與貼上文字建立卡片',async()=>{
   await 頁.keyboard.press('Escape');const 甲=await 卡區('Second quick card');await 頁.keyboard.down('Control');await 頁.mouse.click(...中心(甲));await 頁.keyboard.up('Control');await 安定();
   await 頁.keyboard.press('Control+c');await 安定();驗證.equal(await 頁.evaluate(()=>navigator.clipboard.readText()),'Second quick card');
   await 頁.keyboard.press('Escape');await 頁.keyboard.press('Escape');await 頁.mouse.move(...中心(await 卡區('Design a small, beautiful home page')));await 頁.keyboard.press('Control+v');await 安定();
   驗證.ok((await 看板()).清單[1].卡片.some(卡=>卡.名稱==='Second quick card'),'沒有貼到滑鼠所在的清單');
   await 頁.evaluate(()=>navigator.clipboard.writeText('Line one\nLine two'));
   await 呼叫值('星泉看板.aqua','清空卡片剪貼').catch(()=>{});
   await 右鍵('List body: Done',{種類:'清單空白'});await 點('Paste text as cards');
   驗證.deepEqual((await 看板()).清單[3].卡片.slice(-2).map(卡=>卡.名稱),['Line one','Line two']);
 });
 await 檢查('鍵盤移動焦點、Alt 方向鍵移動卡片與 D 切換完成',async()=>{
   await 頁.keyboard.press('Escape');await 頁.keyboard.press('Escape');await 頁.mouse.move(5,5);await 頁.keyboard.press('ArrowDown');await 安定();const 焦=(await 狀態()).焦點卡;驗證.ok(焦>0);
   await 頁.keyboard.press('Alt+ArrowRight');await 安定();驗證.ok((await 看板()).清單[1].卡片.some(卡=>卡.編號===焦),'Alt+右鍵沒有移動卡片');
   await 頁.keyboard.press('d');await 安定();驗證.equal((await 看板()).清單[1].卡片.find(卡=>卡.編號===焦).完成,true);
   await 頁.keyboard.press('Control+z');await 頁.keyboard.press('Control+z');await 安定();驗證.ok((await 看板()).清單[0].卡片.some(卡=>卡.編號===焦));
 });
 await 檢查('指令面板搜尋卡片並開啟',async()=>{
   await 頁.keyboard.press('Control+k');驗證.equal((await 狀態()).對話,'指令');await 頁.keyboard.type('reading');await 安定();await 截圖('指令面板');await 頁.keyboard.press('Enter');await 安定();
   驗證.equal((await 狀態()).對話,'詳情');await 頁.keyboard.press('Escape');
 });
 await 檢查('看板設定可換色與切換自動完成',async()=>{
   await 點('Board settings');驗證.equal((await 狀態()).對話,'看板設定');await 點('Board color: Dusk violet');驗證.equal((await 看板()).色系,2);
   await 點('Auto-complete in done columns');驗證.equal((await 看板()).自動完成,false);await 點('Auto-complete in done columns');await 截圖('看板設定');await 頁.keyboard.press('Escape');
 });
 await 檢查('切換語言與主題並在重新開啟後保留',async()=>{
   await 點('Settings');await 點('Theme: Daylight');await 點('Language: 繁體中文');const 狀=await 狀態();驗證.equal(狀.語言,1);驗證.equal(狀.主題,1);await 截圖('設定頁面');
   await 點('看板');await 截圖('淺色中文看板');await 等存();
   await 頁.evaluate(()=>window.aquarius.stop());await 啟動();const 新=await 狀態();驗證.equal(新.語言,1);驗證.equal(新.主題,1);驗證.equal(新.教學,-1);
   驗證.ok(新.文件.工作區[0].看板.some(板=>板.名稱==='Extra board 16'),'網頁版沒有保存看板內容');
   await 點('設定');await 點('語言：English');await 點('Theme: Aquarius Night');await 點('Board');await 無缺字();
 });
 const 下載=async(標籤,檔名)=>{const 等=頁.waitForEvent('download');等.catch(()=>{});await 點(標籤);const 檔=await 等;await 檔.saveAs(路徑.join(結果根,檔名));return 路徑.join(結果根,檔名);};
 const 選檔=async(標籤,檔)=>{const 等=頁.waitForEvent('filechooser');等.catch(()=>{});await 點(標籤,{等待:false});const 選=await 等;await 選.setFiles(檔);await 等待(250);};
 await 檢查('手動匯出與載入完整備份、拒絕損壞備份',async()=>{
   const 檔=await 下載('Save backup','往返備份.星板');驗證.ok((await 讀取(檔)).length>1000);
   await 點('Card: Capture an idea that excites you',{種類:'卡片'});await 點('Card name',{種類:'輸入'});await 頁.keyboard.press('Control+A');await 頁.keyboard.insertText('Changed before load');await 頁.keyboard.press('Escape');await 頁.keyboard.press('Escape');
   await 選檔('Open',檔);await 點('OK');await 等待(300);await 安定();驗證.equal((await 看板()).清單[0].卡片[0].名稱,'Capture an idea that excites you');
   await 寫入(路徑.join(結果根,'損壞備份.星板'),new Uint8Array([1,2,3]));await 選檔('Open',路徑.join(結果根,'損壞備份.星板'));await 點('OK');await 等待(300);await 安定();
   驗證.match((await 狀態()).訊息,/not a supported/);
 });
 await 檢查('附件加入、另存與完整備份往返',async()=>{
   const 檔=路徑.join(結果根,'繁體中文附件.txt');await 寫入(檔,'星泉附件往返驗證');
   await 點('Card: Capture an idea that excites you',{種類:'卡片'});await 選檔('Attach file',檔);await 安定();
   const 附=找卡(await 看板(),'Capture an idea that excites you').附件[0];驗證.equal(附.名稱,'繁體中文附件.txt');驗證.equal(附.位元組,undefined);
   await 點('Close card');const 備=await 下載('Save backup','附件備份.星板');await 選檔('Open',備);await 點('OK');await 等待(300);await 安定();
   await 點('Card: Capture an idea that excites you',{種類:'卡片'});const 存=頁.waitForEvent('download');存.catch(()=>{});await 點('Save as');await (await 存).saveAs(路徑.join(結果根,'附件載回.txt'));
   驗證.deepEqual(await 讀取(路徑.join(結果根,'附件載回.txt')),await 讀取(檔));await 點('Close card');
 });
 await 檢查('匯出 CSV',async()=>{await 點('Settings');await 頁.mouse.move(800,600);await 頁.mouse.wheel(0,1500);await 等待(600);await 安定();const 檔=await 下載('Export CSV','看板.csv');const 文=await 讀取(檔,'utf8');驗證.ok(文.includes('Capture an idea that excites you'));驗證.ok(文.startsWith('﻿List,Card'));await 點('Board');});
 await 檢查('重複卡片完成後建立下一次',async()=>{
   await 點('Open board: A week of small joys',{種類:'側欄看板'});const 名='Tidy the desk for ten minutes a day';await 點('Toggle complete: '+名);
   const 板=(await 文件()).工作區[0].看板[1];const 同名=板.清單.flatMap(列=>列.卡片).filter(卡=>卡.名稱===名);驗證.equal(同名.length,2);驗證.ok(同名.some(卡=>!卡.完成));
   await 點('Open board: Let ideas flow',{種類:'側欄看板'});
 });
 await 檢查('封存與恢復卡片',async()=>{await 點('Card: Capture an idea that excites you',{種類:'卡片'});await 點('Archive card');await 點('Archive',{種類:'按鈕'});await 截圖('封存庫');await 點('Restore');await 點('Board');await 卡區('Capture an idea that excites you');});
 await 檢查('閒置時不持續繪圖',必(async()=>{await 頁.keyboard.press('Escape');await 頁.mouse.move(700,890);await 等待(8500);const 起=await 頁.evaluate(()=>window.aquarius.host.processing.frameCount);await 等待(700);const 終=await 頁.evaluate(()=>window.aquarius.host.processing.frameCount);驗證.ok(終-起<=2,'閒置時仍在繪圖：'+(終-起));}));
 await 檢查('手機版面可切換清單與新增卡片',async()=>{
   await 設視窗(400,820);await 截圖('手機看板');
   await 點('Next list');await 安定();await 點('Add a card to “Up next”');await 頁.keyboard.type('Mobile card');await 頁.keyboard.press('Enter');await 頁.keyboard.press('Escape');
   驗證.ok((await 看板()).清單[1].卡片.some(卡=>卡.名稱==='Mobile card'));
   await 點('Card: Mobile card',{種類:'卡片'});await 截圖('手機詳情');await 頁.keyboard.press('Escape');await 設視窗(1440,900);
 });
 await 檢查('四千張卡片的清單捲動與可見區繪製',async()=>{
   const 起=Date.now();await 呼叫('建立壓力資料');await 等待(200);
   const 區=await 操作區();驗證.ok(區.filter(項=>項[5]==='卡片').length<=40,'繪製了太多卡片');
   const 橫=await 找區('Horizontal scroll bar');await 頁.mouse.move(橫[0]+30,橫[1]+5);await 頁.mouse.down();await 頁.mouse.move(橫[0]+橫[2]*0.5,橫[1]+5,{steps:4});await 頁.mouse.up();await 安定();驗證.ok((await 狀態()).水平>1000);
   const 縱=(await 操作區()).find(項=>項[5]==='捲軸'&&項[4].startsWith('Vertical scroll bar:'));await 頁.mouse.move(縱[0]+4,縱[1]+16);await 頁.mouse.down();await 頁.mouse.move(縱[0]+4,縱[1]+縱[3]*0.5,{steps:4});await 頁.mouse.up();await 安定();
   await 截圖('大量卡片與雙軸捲動');結果.push({名稱:'四千張卡片建立與操作耗時',毫秒:Date.now()-起});
   const 耗時=[];const 欄=(await 操作區()).find(項=>項[5]==='卡片');await 頁.mouse.move(欄[0]+50,欄[1]+20);await 安定();
   for(let 次=0;次<8;次++){const 帧=await 頁.evaluate(()=>window.完成繪圖);await 頁.mouse.wheel(0,80);await 頁.waitForFunction(起=>window.完成繪圖>起,帧);await 安定();耗時.push(await 頁.evaluate(()=>Math.round(window.最近繪圖耗時)));}
   耗時.sort((甲,乙)=>甲-乙);結果.push({名稱:'四千張卡片捲動繪圖量測',樣本毫秒:耗時,中位數毫秒:耗時[4],最大毫秒:耗時[7]});驗證.ok(耗時[4]<(process.env.KANBAN_CHROMIUM?900:150),'捲動繪圖中位數過高：'+耗時[4]);
 });
 await 檢查('縮放視窗保留操作能力',async()=>{await 設視窗(1100,700);await 找區('Save backup');await 找區('Horizontal scroll bar');await 截圖('縮放視窗');});
 驗證.deepEqual(錯誤,[]);
 await 無缺字();
}catch(錯){結果.push({名稱:'瀏覽器整合',通過:false,錯誤:錯.stack});console.error(錯);await 頁.screenshot({path:路徑.join(結果根,'失敗畫面.png')});process.exitCode=1;}
finally{await 頁.evaluate(()=>window.aquarius?.stop()).catch(()=>{});await 瀏覽器.close();await new Promise(完成=>伺服器.close(完成));await 寫入(路徑.join(結果根,'瀏覽器結果.json'),JSON.stringify({結果,錯誤},null,2));}
