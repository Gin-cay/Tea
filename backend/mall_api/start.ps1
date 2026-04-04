# Windows 本地启动（请先配置 .env 并导入 sql/schema.sql）
Set-Location $PSScriptRoot
if (-not (Test-Path .\.venv)) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt -q
$env:PYTHONPATH = $PSScriptRoot
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
