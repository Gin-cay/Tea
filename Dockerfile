# 云托管 / Cloud Run：构建上下文为仓库根目录。FastAPI（与 backend/Dockerfile 行为一致）。
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/fixtures ./fixtures

RUN mkdir -p /app/uploads

ENV PORT=80
EXPOSE 80

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-80} --workers 1"]
