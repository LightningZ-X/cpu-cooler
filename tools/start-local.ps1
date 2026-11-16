$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$previewUrl = 'http://127.0.0.1:4173/'

function Test-CoolerPreview {
    try {
        $page = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
        return $page.StatusCode -eq 200 -and $page.Content.Contains('<title>CoolerGuide')
    } catch {
        return $false
    }
}

if (-not (Test-CoolerPreview)) {
    if (Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 4173 is used by another service. Close it or use the online website.'
    }
    $nodeExecutable = (Get-Command node -ErrorAction Stop).Source
    $logDirectory = Join-Path $projectRoot 'test-results'
    New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
    Start-Process -FilePath $nodeExecutable -ArgumentList 'tools/serve.mjs' `
        -WorkingDirectory $projectRoot -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDirectory 'local-preview.log') `
        -RedirectStandardError (Join-Path $logDirectory 'local-preview-error.log') | Out-Null
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-CoolerPreview) { break }
        Start-Sleep -Milliseconds 250
    }
    if (-not (Test-CoolerPreview)) {
        throw 'Preview failed to start. See test-results/local-preview-error.log.'
    }
}
Write-Output "CoolerGuide is ready: $previewUrl"
if ($args -notcontains '-NoBrowser') { Start-Process $previewUrl }
