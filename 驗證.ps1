param([string]$星泉根目錄='', [switch]$略過桌面)
$ErrorActionPreference='Stop'
if(!$星泉根目錄){$星泉根目錄=Join-Path (Split-Path $PSScriptRoot -Parent) 'AquariusLangTW'}
$星泉根目錄=[IO.Path]::GetFullPath($星泉根目錄)
$編譯器=Join-Path $星泉根目錄 'dist/aqua/aqua.exe'
if(!(Test-Path -LiteralPath $編譯器)){throw '請先發佈目前的 aqua CLI，或指定正確的星泉根目錄。'}
$原根=$env:AQUARIUS_ROOT;$原儲存=$env:AQUARIUS_STORAGE_ROOT
Push-Location $PSScriptRoot
try{
 $結果目錄=Join-Path $PSScriptRoot '測試/結果';[IO.Directory]::CreateDirectory($結果目錄)|Out-Null
 & $編譯器 build 驗證.toml -o 測試/結果/資料驗證.wasm
 if($LASTEXITCODE -ne 0){throw '資料驗證建置失敗'}
 $輸出=& $編譯器 run 測試/結果/資料驗證.wasm 2>&1|Out-String
 if($LASTEXITCODE -ne 0 -or $輸出 -notmatch '資料驗證完成：\s+\d+ 通過，\s+0 失敗'){throw $輸出}
 Write-Output $輸出
 & $編譯器 build 圖形驗證.toml -o 測試/結果/圖形驗證.wasm
 if($LASTEXITCODE -ne 0){throw '圖形驗證建置失敗'}
 if(!$略過桌面){
  $env:AQUARIUS_STORAGE_ROOT=Join-Path $結果目錄 '隔離原生資料'
  $輸出=& $編譯器 run 測試/結果/圖形驗證.wasm 2>&1|Out-String
  [IO.File]::WriteAllText((Join-Path $結果目錄 '桌面結果.txt'),$輸出)
  if($LASTEXITCODE -ne 0 -or $輸出 -notmatch '桌面驗證完成：\s+\d+ 通過，\s+0 失敗'){throw $輸出}
  Write-Output $輸出
 }
 & $編譯器 build 圖形驗證.toml --target web -o 測試/結果/圖形網頁
 if($LASTEXITCODE -ne 0){throw '圖形網頁建置失敗'}
 $env:AQUARIUS_ROOT=$星泉根目錄
 & node 測試/瀏覽器驗證.mjs
 if($LASTEXITCODE -ne 0){throw '瀏覽器圖形驗證失敗'}
 Write-Output '星泉看板原生 SDK 驗證完成。'
}finally{$env:AQUARIUS_ROOT=$原根;$env:AQUARIUS_STORAGE_ROOT=$原儲存;Pop-Location}
