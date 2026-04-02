# 使用说明：请先在 GitHub 添加本机公钥后再运行本脚本。
# 公钥文件：%USERPROFILE%\.ssh\id_ed25519.pub
# 添加地址：https://github.com/settings/ssh/new
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
git push origin main
Write-Host "若成功，请到微信云托管用本仓库重新构建发布后端镜像。"
