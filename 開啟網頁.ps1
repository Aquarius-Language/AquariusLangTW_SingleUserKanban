$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try { & node 工具/本機網頁.mjs } finally { Pop-Location }
