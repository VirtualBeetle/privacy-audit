# setup-hosts.ps1
# Adds local domain entries for the Privacy Audit stack to the Windows hosts file.
# Must be run as Administrator.

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"

$entries = @(
    "127.0.0.1`tdataguard.local",
    "127.0.0.1`tapi.dataguard.local",
    "127.0.0.1`thealth.local",
    "127.0.0.1`tsocial.local"
)

# Check for admin privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Please run this script as Administrator (right-click PowerShell -> Run as administrator)"
    exit 1
}

$current = Get-Content $hostsFile -Raw

$added = @()
$skipped = @()

foreach ($entry in $entries) {
    $domain = ($entry -split "`t")[1]
    if ($current -match [regex]::Escape($domain)) {
        $skipped += $domain
    } else {
        Add-Content -Path $hostsFile -Value $entry
        $added += $domain
    }
}

if ($added.Count -gt 0) {
    Write-Host "Added:" -ForegroundColor Green
    $added | ForEach-Object { Write-Host "  127.0.0.1`t$_" }
}

if ($skipped.Count -gt 0) {
    Write-Host "Already present (skipped):" -ForegroundColor Yellow
    $skipped | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Done. You can now access:" -ForegroundColor Cyan
Write-Host "  http://dataguard.local      -> Privacy Audit Dashboard"
Write-Host "  http://api.dataguard.local  -> Audit Backend API"
Write-Host "  http://health.local         -> HealthTrack App"
Write-Host "  http://social.local         -> ConnectSocial App"
