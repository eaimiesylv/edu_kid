param([int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend'
$phpExecutable = Join-Path $projectRoot '.tools\php\php.exe'
if (-not (Test-Path -LiteralPath $phpExecutable)) {
    $phpExecutable = (Get-Command php -ErrorAction Stop).Source
}
Push-Location $backendPath
try {
    & $phpExecutable artisan migrate --seed --no-interaction
    if ($LASTEXITCODE -ne 0) { throw 'Database setup failed.' }
    & $phpExecutable artisan serve --host=127.0.0.1 --port=$Port
} finally {
    Pop-Location
}
