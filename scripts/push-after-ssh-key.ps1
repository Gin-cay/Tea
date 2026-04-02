# Add your public key to GitHub first: https://github.com/settings/ssh/new
# Public key file: $env:USERPROFILE\.ssh\id_ed25519.pub
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
git push origin main
Write-Host "Done. If push succeeded, rebuild and deploy the backend on WeChat Cloud Run from this repo."
