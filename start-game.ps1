$ErrorActionPreference = "Stop"

$frontendPort = 3003
$backendPort = 8000

function Get-PrimaryLanIp {
    $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Where-Object { $_.NextHop -ne "0.0.0.0" } |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1

    if ($defaultRoute) {
        $primaryIp = Get-NetIPAddress -InterfaceIndex $defaultRoute.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike "127.*" -and
                $_.IPAddress -notlike "169.254.*" -and
                $_.AddressState -eq "Preferred"
            } |
            Select-Object -First 1 -ExpandProperty IPAddress

        if ($primaryIp) {
            return $primaryIp
        }
    }

    return (
        Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.AddressState -eq "Preferred" -and
            $_.InterfaceAlias -notmatch "VMware|VirtualBox|Hyper-V|vEthernet|WSL|Loopback|Bluetooth|Tailscale"
        } |
        Sort-Object InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress
    )
}

function Ensure-FirewallRule {
    param(
        [string]$Name,
        [int]$Port
    )

    $rule = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if (-not $rule) {
        New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Profile Any -Protocol TCP -LocalPort $Port | Out-Null
    }
    else {
        Set-NetFirewallRule -DisplayName $Name -Enabled True -Profile Any -Action Allow | Out-Null
    }
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Python Adventure LAN Launcher " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ipAddress = Get-PrimaryLanIp
if (-not $ipAddress) {
    $ipAddress = "localhost"
}

Write-Host "Detected LAN IP: $ipAddress" -ForegroundColor Green
Write-Host "Frontend Port : $frontendPort" -ForegroundColor Green
Write-Host "Backend Port  : $backendPort" -ForegroundColor Green
Write-Host ""

Ensure-FirewallRule -Name "game-google-frontend-3000" -Port 3000
Ensure-FirewallRule -Name "game-google-frontend-3003" -Port $frontendPort
Ensure-FirewallRule -Name "game-google-backend-8000" -Port $backendPort

$frontendRunning = Get-NetTCPConnection -State Listen -LocalPort $frontendPort -ErrorAction SilentlyContinue
$backendRunning = Get-NetTCPConnection -State Listen -LocalPort $backendPort -ErrorAction SilentlyContinue

if ($frontendRunning) {
    Write-Host "Frontend already listening on $frontendPort" -ForegroundColor Yellow
}

if ($backendRunning) {
    Write-Host "Backend already listening on $backendPort" -ForegroundColor Yellow
}

if (-not $backendRunning) {
    $backendPath = Join-Path $PSScriptRoot "backend"
    Write-Host "Starting backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; python run.py" | Out-Null
    Start-Sleep -Seconds 3
}

if (-not $frontendRunning) {
    Write-Host "Starting frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev -- -p $frontendPort -H 0.0.0.0" | Out-Null
    Start-Sleep -Seconds 5
}

Write-Host ""
Write-Host "Local URLs" -ForegroundColor White
Write-Host "  Frontend : http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "  Docs     : http://localhost:$backendPort/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "LAN URLs" -ForegroundColor White
Write-Host "  Frontend : http://${ipAddress}:$frontendPort" -ForegroundColor Green
Write-Host "  Backend  : http://${ipAddress}:$backendPort" -ForegroundColor Green
Write-Host "  Docs     : http://${ipAddress}:$backendPort/docs" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: if other devices still cannot connect, verify they are on the same subnet as $ipAddress." -ForegroundColor Gray
Write-Host "Tip: use .\stop-game.ps1 to stop local services." -ForegroundColor Gray
Write-Host ""

Start-Process "http://localhost:$frontendPort" | Out-Null
