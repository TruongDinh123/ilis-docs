FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py optimizer.py ./
# hypercorn hỗ trợ h2c (HTTP/2 cleartext) -> Cloud Run --use-http2 bỏ giới hạn request 32 MB
CMD ["sh", "-c", "hypercorn app:app --bind 0.0.0.0:${PORT:-8080} --keep-alive 300"]
