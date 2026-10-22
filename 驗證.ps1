param([string]$星泉根目錄 = '', [switch]$略過桌面)
$ErrorActionPreference = 'Stop'
if (-not $星泉根目錄) { $星泉根目錄 = Join-Path (Split-Path $PSScriptRoot -Parent) 'AquariusLangTW' }
$星泉根目錄 = [IO.Path]::GetFullPath($星泉根目錄)
$本機工具 = Join-Path $env:USERPROFILE '.dotnet\dotnet.exe'
$編譯工具 = if (Test-Path -LiteralPath $本機工具) { $本機工具 } else { (Get-Command dotnet -ErrorAction Stop).Source }
$編譯器 = Join-Path $星泉根目錄 'AquariusCli\bin\Release\net8.0\aqua.dll'
$原星泉根 = $env:AQUARIUS_ROOT
$原主控台輸出編碼 = [Console]::OutputEncoding
$原管線輸出編碼 = $OutputEncoding
Push-Location $PSScriptRoot
try {
    # aqua 固定輸出 UTF-8；Windows PowerShell 5.1 依主控台編碼解碼原生程式輸出。
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = $OutputEncoding
    New-Item -ItemType Directory -Path '測試\結果' -Force | Out-Null
    & $編譯工具 $編譯器 build 測試/資料驗證.aqua 看板引擎.aqua 捲動區.aqua --root . --entry 測試/資料驗證.aqua -o 測試/結果/資料驗證.wasm
    if ($LASTEXITCODE -ne 0) { throw '資料驗證編譯失敗。' }
    $資料結果 = & $編譯工具 $編譯器 run 測試/結果/資料驗證.wasm 2>&1
    $資料代碼 = $LASTEXITCODE
    $資料結果 | Set-Content '測試\結果\資料結果.txt' -Encoding utf8
    $資料結果
    if ($資料代碼 -ne 0 -or "$資料結果" -notmatch '資料驗證完成：\s+\d+ 通過，\s+0 失敗') { throw '資料驗證失敗。' }
    $env:AQUARIUS_ROOT = $星泉根目錄
    & node 測試/瀏覽器驗證.mjs
    if ($LASTEXITCODE -ne 0) { throw '瀏覽器驗證失敗。' }
    if (-not $略過桌面) {
        & $編譯工具 build 測試/桌面驗證.csproj -c Release -m:1 -v:q "-p:AquariusRoot=$星泉根目錄"
        if ($LASTEXITCODE -ne 0) { throw '桌面驗證工具建置失敗。' }
        $桌面結果 = & $編譯工具 測試/bin/Release/net8.0/桌面驗證.dll $PSScriptRoot 2>&1
        $桌面代碼 = $LASTEXITCODE
        $桌面結果 | Set-Content '測試\結果\桌面結果.txt' -Encoding utf8
        $桌面結果
        if ($桌面代碼 -ne 0) { throw '桌面驗證失敗。' }
    }
    Write-Output '星泉看板驗證完成。'
} finally {
    $env:AQUARIUS_ROOT = $原星泉根
    [Console]::OutputEncoding = $原主控台輸出編碼
    $OutputEncoding = $原管線輸出編碼
    Pop-Location
}
