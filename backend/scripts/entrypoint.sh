#!/bin/sh
set -e

echo "Veritabanı bekleniyor..."
until python -c "
import socket, os, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(1)
try:
    s.connect((os.environ.get('POSTGRES_HOST', 'db'), int(os.environ.get('POSTGRES_PORT', 5432))))
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
  sleep 1
done
echo "Veritabanı hazır."

if [ "$RUN_MIGRATIONS" = "true" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput

  if [ "$RUN_SEED" = "true" ]; then
    python manage.py seed_data || true
  fi
fi

exec "$@"
