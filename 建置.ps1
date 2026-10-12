param([string]$星泉根目錄 = '', [switch]$略過編譯器建置, [switch]$略過桌面)
$ErrorActionPreference = 'Stop'
if (-not $星泉根目錄) { $星泉根目錄 = Join-Path (Split-Path $PSScriptRoot -Parent) 'AquariusLangTW' }
if (-not (Test-Path -LiteralPath (Join-Path $星泉根目錄 'AquariusCli'))) { throw '請用 -星泉根目錄 指定包含共用核心擴充的星泉原始碼。' }
$本機工具 = Join-Path $env:USERPROFILE '.dotnet\dotnet.exe'
$編譯工具 = if (Test-Path -LiteralPath $本機工具) { $本機工具 } else { (Get-Command dotnet -ErrorAction Stop).Source }
$編譯器 = Join-Path $星泉根目錄 'AquariusCli\bin\Release\net8.0\aqua.dll'
if (-not $略過編譯器建置) {
    & $編譯工具 build (Join-Path $星泉根目錄 'AquariusCli\AquariusCli.csproj') -c Release -m:1 -v:q
    if ($LASTEXITCODE -ne 0) { throw '編譯器建置失敗。' }
}
Push-Location $PSScriptRoot
$原執行目標 = $env:AQUARIUS_BUILD_TARGETS
try {
    New-Item -ItemType Directory -Path dist -Force | Out-Null
    & $編譯工具 $編譯器 build 啟動看板.aqua 星泉看板.aqua 星泉介面.aqua 看板引擎.aqua 捲動區.aqua 附件管理.aqua --root . --entry 啟動看板.aqua -o dist/星泉看板.wasm
    if ($LASTEXITCODE -ne 0) { throw '星泉看板編譯失敗。' }
    & $編譯工具 $編譯器 build dist/星泉看板.wasm --target web -o 網頁
    if ($LASTEXITCODE -ne 0) { throw '網頁輸出失敗。' }
    & node 工具/網頁封裝.mjs
    if ($LASTEXITCODE -ne 0) { throw '網頁本地化失敗。' }
    if (-not $略過桌面) {
        $env:AQUARIUS_BUILD_TARGETS = Join-Path $星泉根目錄 'build-targets'
        & $編譯工具 $編譯器 build dist/星泉看板.wasm --target windows -o dist/星泉看板.exe
        if ($LASTEXITCODE -ne 0) { throw '桌面輸出失敗；請先建置最新星泉應用程式主機。' }
    }
    Write-Output '已完成星泉看板。'
} finally { $env:AQUARIUS_BUILD_TARGETS = $原執行目標; Pop-Location }
