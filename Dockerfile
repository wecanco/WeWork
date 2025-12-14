FROM python:3.11-slim

# Install tzdata for timezone support
RUN apt-get update && \
    apt-get install -y tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Tehran /etc/localtime && \
    echo "Asia/Tehran" > /etc/timezone && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set timezone environment variable
ENV TZ=Asia/Tehran

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN python -m pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m botuser || true
USER botuser

# Use bash to run the entrypoint scripts
ENTRYPOINT ["bash", "-c", "./docker-entrypoint.sh && exec \"$@\""]
CMD ["python", "-m", "src.bot.main"]
