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
    $產物目錄 = Join-Path $PSScriptRoot 'dist'
    $網頁目錄 = Join-Path $PSScriptRoot '網頁'
    foreach ($目錄 in @($產物目錄, $網頁目錄)) {
        if (Test-Path -LiteralPath $目錄) {
            $項目 = Get-Item -LiteralPath $目錄 -Force
            if (-not $項目.PSIsContainer -or ($項目.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
                throw "建置輸出必須是一般目錄：$目錄"
            }
        }
    }
    & $編譯器 build 啟動看板.aqua 星泉看板.aqua 星泉介面.aqua 看板引擎.aqua 捲動區.aqua 附件管理.aqua 語言.aqua 主題.aqua 圖示.aqua --root . --entry 啟動看板.aqua -o dist/星泉看板.wasm
    if ($LASTEXITCODE -ne 0) { throw '星泉看板編譯失敗。' }
    # 不同編譯器版本的執行環境檔案不同，先在全新目錄完成輸出與封裝。
    $網頁暫存 = Join-Path $產物目錄 ('web-stage-' + [Guid]::NewGuid().ToString('N'))
    & $編譯器 build dist/星泉看板.wasm --target web -o $網頁暫存
    if ($LASTEXITCODE -ne 0) { throw '網頁輸出失敗。' }
    & $網頁工具 工具/網頁封裝.mjs $網頁暫存
    if ($LASTEXITCODE -ne 0) { throw '網頁本地化失敗。' }
    $網頁備份 = $null
    if (Test-Path -LiteralPath $網頁目錄) {
        $網頁備份 = Join-Path $產物目錄 ('web-backup-' + [Guid]::NewGuid().ToString('N'))
        [IO.Directory]::Move($網頁目錄, $網頁備份)
    }
    try {
        [IO.Directory]::Move($網頁暫存, $網頁目錄)
    } catch {
        if ($網頁備份 -and -not (Test-Path -LiteralPath $網頁目錄)) {
            [IO.Directory]::Move($網頁備份, $網頁目錄)
        }
        throw
    }
    if ($網頁備份) { Write-Output "舊網頁輸出已保留於：$網頁備份" }
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
