# 本地开发：默认 SQLite + 开发支付桩
$env:DEV_PAYMENT_STUB = "true"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
