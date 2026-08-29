FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Compiler toolchain only exists in this stage — psycopg2-binary etc. get
# built/installed here, then only the resulting packages (not gcc/build-essential)
# are copied into the runtime image below.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
ARG BUILD_ENV=prod
RUN pip install --no-cache-dir --prefix=/install -r requirements/${BUILD_ENV}.txt

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# libpq5 (not -dev) is the runtime client lib psycopg2 needs; curl is used by
# the docker-compose healthchecks.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
COPY . .
RUN chmod +x scripts/entrypoint.sh \
    && mkdir -p /app/staticfiles /app/media /app/logs \
    && useradd --create-home --uid 1000 appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["scripts/entrypoint.sh"]
