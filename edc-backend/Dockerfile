FROM python:3.11-slim

WORKDIR /app

# 复制后端与前端静态文件（支持前后端一体化单容器免费部署）
COPY edc-backend/requirements.txt /app/edc-backend/requirements.txt
RUN pip install --no-cache-dir -r /app/edc-backend/requirements.txt

COPY edc-backend /app/edc-backend
COPY edc-system /app/edc-system

WORKDIR /app/edc-backend

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
