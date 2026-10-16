#!/usr/bin/env bash
# =============================================================================
#  UÇTAN UCA ÖDEME AKIŞI — SAHTE PAYTR İLE
#
#  Bu betik gerçek PayTR sunucusuna BAĞLANMAZ. `mock_paytr.py` ile protokolün
#  tamamını yerelde yürütür:
#     init -> token (imza sahte PayTR tarafından DOĞRULANIR) -> iFrame sayfası
#     -> imzalı bildirim -> sipariş durumunun güncellenmesi
#
#  Amaç: gerçek mağaza bilgileri gelmeden önce tüm kablolamanın (HTTP, URL'ler,
#  imza, veritabanı güncellemesi) çalıştığını kanıtlamak. Gerçek PayTR testi
#  için infra/staging/README.md'ye bakın.
#
#  Çalıştırma (depo kökünden):
#     bash infra/staging/e2e_mock_payment.sh
# =============================================================================
set -uo pipefail

NET=${NET:-uc_test_net}
DB_HOST=${DB_HOST:-uc_test_db}
REDIS_HOST=${REDIS_HOST:-uc_test_redis}
DB_NAME=${DB_NAME:-e2e_paytr}
IMAGE=${IMAGE:-ubercekici-test:latest}
# Kendi redis veritabanı: DRF throttle sayaçları (auth 10/dk) cache'te tutulur.
# pytest DB 0'ı kullandığı için, ağır bir test koşusunun hemen ardından e2e'nin
# girişi 429 yiyip tüm testleri zincirleme düşürüyordu.
REDIS_DB=${REDIS_DB:-15}
# DİKKAT: konteyner adlarında ALT ÇİZGİ KULLANMAYIN. Django, HTTP Host
# başlığındaki alt çizgiyi RFC 1034/1035 gereği geçersiz sayar ve istek
# view'e ulaşmadan 400 DisallowedHost ile reddedilir.
BACKEND=uc-e2e-backend
MOCK=uc-e2e-mock
MID=123456; MKEY=e2e-test-key; MSALT=e2e-test-salt

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  \033[31m✗\033[0m %s\n     beklenen: %s\n     gelen   : %s\n" "$1" "$2" "$3"; }
check(){ [ "$2" = "$3" ] && ok "$1" || bad "$1" "$2" "$3"; }
contains(){ case "$3" in *"$2"*) ok "$1";; *) bad "$1" "içinde: $2" "$3";; esac; }

cleanup() {
  docker rm -f "$BACKEND" "$MOCK" >/dev/null 2>&1
  docker exec "$DB_HOST" psql -U cekicim -d postgres -q -c "DROP DATABASE IF EXISTS $DB_NAME;" >/dev/null 2>&1
}
trap cleanup EXIT
cleanup

REPO_BACKEND="$(cd "$(dirname "$0")/../../backend" && pwd)"
STAGING="$(cd "$(dirname "$0")" && pwd)"

echo "=============================================================="
echo " 0) İzole ortam hazırlanıyor (üretimden bağımsız)"
echo "=============================================================="
docker exec "$DB_HOST" psql -U cekicim -d postgres -q -c "CREATE DATABASE $DB_NAME;" >/dev/null 2>&1
echo "  yeni veritabanı: $DB_NAME"
docker exec "$REDIS_HOST" redis-cli -n "$REDIS_DB" FLUSHDB >/dev/null 2>&1
echo "  redis DB $REDIS_DB temizlendi (throttle sayaçları sıfır)"

docker run -d --name "$MOCK" --network "$NET" -v "$STAGING:/srv:ro" \
  --entrypoint python "$IMAGE" /srv/mock_paytr.py \
  --port 9009 --merchant-id "$MID" --merchant-key "$MKEY" --merchant-salt "$MSALT" >/dev/null
echo "  sahte PayTR: http://$MOCK:9009"

docker run -d --name "$BACKEND" --network "$NET" -v "$REPO_BACKEND:/app:ro" -w /app \
  -e DJANGO_SETTINGS_MODULE=config.settings \
  -e POSTGRES_HOST="$DB_HOST" -e POSTGRES_DB="$DB_NAME" -e POSTGRES_USER=cekicim -e POSTGRES_PASSWORD=cekicim \
  -e REDIS_URL="redis://$REDIS_HOST:6379/$REDIS_DB" -e CELERY_BROKER_URL="redis://$REDIS_HOST:6379/$REDIS_DB" \
  -e DJANGO_SECRET_KEY=e2e-secret -e JWT_SECRET=e2e-jwt -e DEBUG=True -e LOG_DIR=/tmp/logs \
  -e ALLOWED_HOSTS="localhost,127.0.0.1,$BACKEND" \
  -e PAYTR_MERCHANT_ID="$MID" -e PAYTR_MERCHANT_KEY="$MKEY" -e PAYTR_MERCHANT_SALT="$MSALT" \
  -e PAYTR_TEST_MODE=true \
  -e PAYTR_TOKEN_URL="http://$MOCK:9009/odeme/api/get-token" \
  -e PAYTR_IFRAME_URL_TEMPLATE="http://$MOCK:9009/odeme/guvenli/{token}" \
  -e SITE_BASE_URL="http://$BACKEND:8000" \
  --entrypoint sh "$IMAGE" -c \
  "python manage.py migrate --noinput >/tmp/m.log 2>&1 && python manage.py runserver 0.0.0.0:8000 --noreload" >/dev/null

run() { docker exec "$BACKEND" sh -c "$1" 2>/dev/null; }
api() { docker exec "$BACKEND" curl -s "$@" 2>/dev/null; }

# Hazırlık yoklaması: /api/schema/ her çağrıda tüm OpenAPI şemasını ürettiği
# için yavaştır ve yük altında zaman aşımına uğrayıp testleri hazır olmayan
# sunucuya karşı çalıştırıyordu (20 yanıltıcı "hata"). Bunun yerine ucuz bir
# uç yokluyoruz ve hazır olmazsa TESTLERE HİÇ BAŞLAMADAN net hata veriyoruz.
READY=0
for i in $(seq 1 90); do
  code=$(docker exec "$BACKEND" curl -s -o /dev/null -w '%{http_code}' --max-time 3 \
    -X POST http://127.0.0.1:8000/api/payments/paytr/callback/ \
    -d 'merchant_oid=hazirlik&status=failed&total_amount=0&hash=x' 2>/dev/null)
  [ "$code" = "200" ] && { READY=1; break; }
  sleep 2
done
if [ "$READY" != "1" ]; then
  echo "  HATA: backend 180 saniyede hazır olmadı — testler çalıştırılmadı." >&2
  echo "  --- backend logları ---" >&2
  docker logs "$BACKEND" 2>&1 | tail -25 >&2
  exit 1
fi
echo "  backend ayakta"

echo ""
echo "=============================================================="
echo " 1) Test verisi (müşteri + fiyatı kesinleşmiş talep)"
echo "=============================================================="
SR_ID=$(run "python manage.py shell -c \"
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest
U=get_user_model()
u,_=U.objects.get_or_create(username='e2e_cust', defaults={'email':'e2e@test.local','role':'customer','first_name':'Test','last_name':'Musteri','phone_number':'05551112233'})
u.set_password('E2ePass123!'); u.save()
v,_=VehicleType.objects.get_or_create(name='Otomobil', defaults={'price_multiplier':1})
s,_=ServiceType.objects.get_or_create(name=ServiceType.Kind.TOWING, defaults={'recovery_multiplier':1})
sr=ServiceRequest.objects.create(customer=u, vehicle_type=v, service_type=s,
    pickup_lat=38.46, pickup_lng=27.21, pickup_address='Bayrakli/Izmir',
    dropoff_lat=38.42, dropoff_lng=27.14, price=Decimal('1250.50'),
    status=ServiceRequest.Status.ACCEPTED)
print(sr.id)
\"" | tail -1 | tr -d '\r')
echo "  talep #$SR_ID — 1250.50 TL — durum: accepted"

TOKEN=$(api -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"e2e_cust","password":"E2ePass123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('access',''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  LOGIN_RAW=$(api -w '\n[HTTP %{http_code}]' -X POST http://127.0.0.1:8000/api/auth/login/ \
    -H 'Content-Type: application/json' \
    -d '{"username":"e2e_cust","password":"E2ePass123!"}')
  echo "  HATA: giriş yapılamadı — sonraki testler anlamsız olacağı için durduruluyor." >&2
  echo "  giriş yanıtı: $(printf '%s' "$LOGIN_RAW" | head -c 200)" >&2
  case "$LOGIN_RAW" in
    *429*) echo "  neden: istek sınırı (throttle). REDIS_DB=$REDIS_DB temizlenmesine rağmen doluysa biraz bekleyin." >&2 ;;
  esac
  exit 1
fi
ok "müşteri JWT aldı"

echo ""
echo "=============================================================="
echo " 2) 1. ADIM — ödeme başlatma ve token"
echo "=============================================================="
INIT=$(api -X POST "http://127.0.0.1:8000/api/payments/paytr/requests/$SR_ID/init/" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":"1.00","payment_amount":100}')
echo "  yanıt: $(echo "$INIT" | head -c 220)"
OID=$(echo "$INIT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('merchant_oid',''))" 2>/dev/null)
IFTOKEN=$(echo "$INIT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('iframe_token',''))" 2>/dev/null)
AMOUNT=$(echo "$INIT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('amount',''))" 2>/dev/null)

[ -n "$OID" ] && ok "sipariş numarası üretildi: $OID" || bad "sipariş numarası" "dolu" "boş"
[ -n "$IFTOKEN" ] && ok "sahte PayTR imzamızı DOĞRULADI ve token verdi" || bad "token" "dolu" "boş"
check "tutar istemcinin 1.00'ı değil sunucu fiyatı" "1250.50" "$AMOUNT"

MOCKORD=$(api "http://$MOCK:9009/orders")
contains "sahte PayTR'ye 125050 kuruş ulaştı" '"payment_amount": 125050' "$MOCKORD"
contains "dönüş adresi oid ile çağrılıyor" "odeme/basarili?oid=$OID" "$MOCKORD"

echo ""
echo "=============================================================="
echo " 3) iFrame ödeme sayfası"
echo "=============================================================="
IFRAME_URL=$(echo "$INIT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('iframe_url',''))" 2>/dev/null)
PAGE_PATH=$(echo "$INIT" | python3 -c "import sys,json;print(json.load(sys.stdin).get('payment_page_path',''))" 2>/dev/null)
contains "iframe_url ödeme formunu gösteriyor" "/odeme/guvenli/$IFTOKEN" "$IFRAME_URL"
check "site içi ödeme sayfası yolu" "/odeme/$IFTOKEN" "$PAGE_PATH"
FORM=$(api "$IFRAME_URL")
contains "ödeme formu açılıyor" "token=$IFTOKEN" "$FORM"

CB="http://$BACKEND:8000/api/payments/paytr/callback/"

echo ""
echo "=============================================================="
echo " 4) 2. ADIM — GEÇERSİZ imzalı bildirim (reddedilmeli)"
echo "=============================================================="
R=$(api -X POST "http://$MOCK:9009/notify" -d "merchant_oid=$OID" -d "status=success" -d "callback_url=$CB" -d "bad_hash=1")
contains "sunucu 'bad hash' döndü" "bad hash" "$R"
ST=$(run "python manage.py shell -c \"
from apps.requests.models import ServiceRequest
print(ServiceRequest.objects.get(pk=$SR_ID).payment_status)\"" | tail -1 | tr -d '\r')
check "sipariş DEĞİŞMEDİ" "unpaid" "$ST"

echo ""
echo "=============================================================="
echo " 5) 2. ADIM — TUTAR UYUŞMAZLIĞI (reddedilmeli)"
echo "=============================================================="
OID2=$(api -X POST "http://127.0.0.1:8000/api/payments/paytr/requests/$SR_ID/init/" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('merchant_oid',''))" 2>/dev/null)
R=$(api -X POST "http://$MOCK:9009/notify" -d "merchant_oid=$OID2" -d "status=success" -d "callback_url=$CB" -d "payment_amount=100" -d "total_amount=100")
contains "sunucu 'amount mismatch' döndü" "amount mismatch" "$R"
ST=$(run "python manage.py shell -c \"
from apps.requests.models import ServiceRequest
print(ServiceRequest.objects.get(pk=$SR_ID).payment_status)\"" | tail -1 | tr -d '\r')
check "sipariş yine DEĞİŞMEDİ" "unpaid" "$ST"

echo ""
echo "=============================================================="
echo " 6) 2. ADIM — BAŞARISIZ ödeme (sipariş ödenmemiş kalmalı)"
echo "=============================================================="
R=$(api -X POST "http://$MOCK:9009/notify" -d "merchant_oid=$OID" -d "status=failed" -d "callback_url=$CB" -d "failed_reason_code=6" -d "failed_reason_msg=Musteri vazgecti")
contains "sunucu 'OK' döndü (geçerli bildirim)" "OK" "$R"
ST=$(run "python manage.py shell -c \"
from apps.requests.models import ServiceRequest
print(ServiceRequest.objects.get(pk=$SR_ID).payment_status)\"" | tail -1 | tr -d '\r')
check "sipariş ödenmemiş kaldı" "unpaid" "$ST"

echo ""
echo "=============================================================="
echo " 7) 2. ADIM — BAŞARILI ödeme (sipariş onaylanmalı)"
echo "=============================================================="
OID3=$(api -X POST "http://127.0.0.1:8000/api/payments/paytr/requests/$SR_ID/init/" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('merchant_oid',''))" 2>/dev/null)
R=$(api -X POST "http://$MOCK:9009/notify" -d "merchant_oid=$OID3" -d "status=success" -d "callback_url=$CB")
contains "sunucu tam olarak 'OK' döndü" '"OK"' "$R"
RES=$(run "python manage.py shell -c \"
from apps.requests.models import ServiceRequest
from apps.payments.models import Payment, PaymentTransaction
sr=ServiceRequest.objects.get(pk=$SR_ID)
t=PaymentTransaction.objects.get(merchant_oid='$OID3')
p=Payment.objects.filter(service_request=sr).first()
print(sr.payment_status, sr.payment_method, t.status, t.total_amount, p.method, p.status, p.amount)\"" | tail -1 | tr -d '\r')
echo "  DB: $RES"
contains "sipariş onaylandı + kart" "approved card" "$RES"
contains "işlem 'paid'" "paid" "$RES"
contains "Payment kaydı card/paid/1250.50" "card paid 1250.50" "$RES"

echo ""
echo "=============================================================="
echo " 8) YİNELENEN bildirim (ikinci kez işlenmemeli)"
echo "=============================================================="
api -X POST "http://$MOCK:9009/notify" -d "merchant_oid=$OID3" -d "status=success" -d "callback_url=$CB" >/dev/null
R=$(api -X POST "http://$MOCK:9009/notify" -d "merchant_oid=$OID3" -d "status=success" -d "callback_url=$CB")
contains "tekrarda yine 'OK'" '"OK"' "$R"
CNT=$(run "python manage.py shell -c \"
from apps.payments.models import Payment
from apps.notifications.models import Notification
print(Payment.objects.count(), Notification.objects.filter(category='payment').count())\"" | tail -1 | tr -d '\r')
check "tek Payment kaydı, tek bildirim" "1 1" "$CNT"

echo ""
echo "=============================================================="
echo " 9) Ödenmiş talep tekrar ödenemez + durum ucu"
echo "=============================================================="
CODE=$(api -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:8000/api/payments/paytr/requests/$SR_ID/init/" -H "Authorization: Bearer $TOKEN")
check "yeniden ödeme girişimi reddedildi" "400" "$CODE"
STATUS_JSON=$(api "http://127.0.0.1:8000/api/payments/paytr/transactions/$OID3/" -H "Authorization: Bearer $TOKEN")
contains "durum ucu doğrulanmış 'paid' diyor" '"status":"paid"' "$(echo "$STATUS_JSON" | tr -d ' ')"
UNAUTH=$(api -o /dev/null -w '%{http_code}' "http://127.0.0.1:8000/api/payments/paytr/transactions/$OID3/")
check "oturumsuz durum sorgusu reddedildi" "401" "$UNAUTH"

echo ""
echo "=============================================================="
printf " SONUÇ: \033[32m%d başarılı\033[0m, \033[31m%d başarısız\033[0m\n" "$PASS" "$FAIL"
echo "=============================================================="
[ "$FAIL" -eq 0 ]
