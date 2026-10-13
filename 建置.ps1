#requires -Version 5.1
param([switch]$略過桌面,
    [switch]$Android, [switch]$APK
)
$ErrorActionPreference = 'Stop'
$編譯器 = (Get-Command aqua -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
$網頁工具 = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path dist -Force | Out-Null
    & $編譯器 build 啟動看板.aqua 星泉看板.aqua 星泉介面.aqua 看板引擎.aqua 捲動區.aqua 附件管理.aqua --root . --entry 啟動看板.aqua -o dist/星泉看板.wasm
    if ($LASTEXITCODE -ne 0) { throw '星泉看板編譯失敗。' }
    & $編譯器 build dist/星泉看板.wasm --target web -o 網頁
    if ($LASTEXITCODE -ne 0) { throw '網頁輸出失敗。' }
    & $網頁工具 工具/網頁封裝.mjs
    if ($LASTEXITCODE -ne 0) { throw '網頁本地化失敗。' }
    if (-not $略過桌面) {
        & $編譯器 build dist/星泉看板.wasm --target windows -o dist/星泉看板.exe
        if ($LASTEXITCODE -ne 0) { throw '桌面輸出失敗；請確認 aqua 已附帶相容的 Windows 星泉應用程式主機。' }
    }
    Write-Output '已完成星泉看板。'

    if ($Android -or $APK) {
        $AndroidOutput = if ($APK) { 'dist/android.apk' } else { ('dist/android-project-' + [Guid]::NewGuid().ToString('N').Substring(0,8)) }
        & $編譯器 build 'dist/星泉看板.wasm' --target android -o $AndroidOutput
        if ($LASTEXITCODE -ne 0) { throw 'Android 建置失敗。' }
    }
} finally { Pop-Location }
