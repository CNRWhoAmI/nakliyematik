#!/bin/bash
set -e

echo "Waiting for postgres..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

# Statik dosyaları topla
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Veritabanı migrasyonlarını uygula
echo "Applying database migrations..."
python manage.py migrate

# Komut çalıştır
exec "$@"