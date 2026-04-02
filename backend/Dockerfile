FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

RUN mkdir -p /app/uploads

ENV PORT=80
EXPOSE 80

CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-80} --workers 2 --threads 4 --timeout 120 server:app"]
