#!/bin/sh
# Testa as migrações num Postgres descartável (Docker), sem tocar no Supabase:
# banco novo → imitação mínima do Supabase (00_supabase_stub.sql) → todas as
# migrações (0011 e 0012 duas vezes, para provar que re-rodam) → cenário com
# várias pessoas (10_cenario.sql). Uso: sh supabase/testes/rodar.sh
set -e
D="$(cd "$(dirname "$0")" && pwd)"; M="$D/../migrations"; C=agenda-teste-pg
docker rm -f $C >/dev/null 2>&1 || true
docker run -d --name $C -e POSTGRES_PASSWORD=teste postgres:17-alpine >/dev/null
trap 'docker rm -f $C >/dev/null 2>&1' EXIT
for i in $(seq 1 30); do docker exec $C pg_isready -U postgres -q && break; sleep 1; done; sleep 2
docker exec -i $C psql -U postgres -q -v ON_ERROR_STOP=1 < "$D/00_supabase_stub.sql" >/dev/null 2>&1
for f in "$M"/*.sql "$M"/0011_*.sql "$M"/0012_*.sql; do
  docker exec -i $C psql -U postgres -q -v ON_ERROR_STOP=1 < "$f" >/dev/null 2>/tmp/agenda-teste-err.txt || { echo "MIGRAÇÃO FALHOU: $f"; cat /tmp/agenda-teste-err.txt; exit 1; }
done
echo "migrações ok"
SAIDA=$(docker exec -i $C psql -U postgres -X < "$D/10_cenario.sql" 2>&1 | grep -E "NOTICE:  ok|FALHA|ERROR|TUDO OK|── " | sed -e 's/^psql:<stdin>:[0-9]*: //' -e 's/NOTICE:  ok  /  ✓ /')
echo "$SAIDA"
echo "$SAIDA" | grep -q "TUDO OK"
