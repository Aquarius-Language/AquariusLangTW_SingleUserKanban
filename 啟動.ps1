$ErrorActionPreference = 'Stop'
$執行檔 = Join-Path $PSScriptRoot 'dist\星泉看板.exe'
if (-not (Test-Path -LiteralPath $執行檔)) { throw '請先執行建置.ps1。' }
Start-Process -FilePath $執行檔 -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
