#!/usr/bin/env bash
# =============================================================================
#  GERÇEK PayTR TEST ÖDEMESİ — STAGING
#
#  Bu betik GERÇEK PayTR sunucusuna bağlanır (test modunda).
#     * PAYTR_TEST_MODE=true olduğu sürece GERÇEK PARA HAREKETİ OLMAZ.
#     * Canlı mod açılmaz, mağaza ayarı değiştirilmez.
#     * Yalnızca staging veritabanına yazar; üretime dokunmaz.
#
#  Ön koşullar (hepsi otomatik kontrol edilir):
#     1. staging stack ayakta
#     2. .env.staging içinde PAYTR_MERCHANT_ID/KEY/SALT dolu
#     3. cloudflared tüneli açık ve adres ALLOWED_HOSTS/SITE_BASE_URL'de
#     4. PayTR panelinde Bildirim URL tanımlı (2. aşama için zorunlu)
#
#  Kullanım:
#     bash infra/staging/real_paytr_test.sh            # 1. aşama: token + iFrame
#     bash infra/staging/real_paytr_test.sh --verify   # 2. aşama: ödeme sonrası
# =============================================================================
set -uo pipefail

cd "$(dirname "$0")/../.." || exit 1
PROJECT=ubercekici-staging
COMPOSE="docker compose -p $PROJECT -f infra/staging/docker-compose.staging.yml"
ENV_FILE=infra/staging/.env.staging
STATE=infra/staging/.last_test_state           # merchant_oid + talep id (sır içermez)
MODE="${1:-}"

PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad() { FAIL=$((FAIL+1)); printf "  \033[31m✗\033[0m %s\n      → %s\n" "$1" "$2"; }
die() { printf "\n\033[31mDURDU:\033[0m %s\n" "$1" >&2; exit 1; }

BASE=$(grep '^SITE_BASE_URL=' "$ENV_FILE" | cut -d= -f2-)
[ -n "$BASE" ] || die "SITE_BASE_URL boş ($ENV_FILE)."

sh_be() { $COMPOSE exec -T backend python manage.py shell -c "$1" 2>/dev/null; }

# ---------------------------------------------------------------- 2. AŞAMA --
if [ "$MODE" = "--verify" ]; then
  [ -f "$STATE" ] || die "Önce betiği --verify olmadan çalıştırın."
  # shellcheck disable=SC1090
  . "$STATE"
  echo "=============================================================="
  echo " ÖDEME SONRASI DOĞRULAMA"
  echo " sipariş no : $OID"
  echo " talep      : #$SR_ID"
  echo "=============================================================="

  # Bildirim, ödeme bitiminden birkaç saniye sonra düşebilir. Varsayılan
  # olarak kısa süre bekleriz; --no-wait ile anlık durum okunur.
  WAIT_SECONDS=${WAIT_SECONDS:-90}
  [ "${2:-}" = "--no-wait" ] && WAIT_SECONDS=0
  if [ "$WAIT_SECONDS" -gt 0 ]; then
    printf "  bildirim bekleniyor (en fazla %ss)" "$WAIT_SECONDS"
    waited=0
    while [ "$waited" -lt "$WAIT_SECONDS" ]; do
      got=$(sh_be "
from apps.payments.models import PaymentTransaction
t = PaymentTransaction.objects.filter(merchant_oid='$OID').first()
print('YES' if t and t.notified_at else 'NO')" | tr -d ' \r' | tail -1)
      [ "$got" = "YES" ] && { printf " — geldi!\n"; break; }
      printf "."
      sleep 5; waited=$((waited+5))
    done
    [ "$got" = "YES" ] || printf " — gelmedi\n"
  fi

  RES=$(sh_be "
from apps.payments.models import Payment, PaymentTransaction
from apps.requests.models import ServiceRequest
t = PaymentTransaction.objects.get(merchant_oid='$OID')
sr = ServiceRequest.objects.get(pk=$SR_ID)
p = Payment.objects.filter(service_request=sr).first()
print('TXN_STATUS=%s' % t.status)
print('TXN_PAID_AT=%s' % (t.paid_at is not None))
print('TXN_TYPE=%s' % t.payment_type)
print('TXN_TOTAL=%s' % t.total_amount)
print('TXN_AMOUNT=%s' % t.amount)
print('TXN_NOTIFIED=%s' % (t.notified_at is not None))
print('TXN_REASON=%s|%s' % (t.failed_reason_code, t.failed_reason_msg))
print('SR_PAYSTATUS=%s' % sr.payment_status)
print('SR_PAYMETHOD=%s' % sr.payment_method)
print('PAYMENT_ROW=%s' % ('%s/%s/%s' % (p.method, p.status, p.amount) if p else 'YOK'))
print('PAYMENT_COUNT=%s' % Payment.objects.filter(service_request=sr).count())
")
  echo "$RES" | sed 's/^/  /'
  eval "$(echo "$RES" | grep -E '^[A-Z_]+=')" 2>/dev/null

  echo ""
  if [ "${TXN_NOTIFIED:-False}" != "True" ]; then
    AGE=$(sh_be "
from django.utils import timezone
from apps.payments.models import PaymentTransaction
t = PaymentTransaction.objects.get(merchant_oid='$OID')
print(int((timezone.now() - t.created_at).total_seconds()))" | tr -d ' \r' | tail -1)

    # --- KANIT TOPLAMA -------------------------------------------------------
    # "Bildirim gelmedi" tek başına callback arızası DEMEK DEĞİLDİR. Önce
    # ödemenin gerçekten denenip denenmediğini erişim logundan kanıtlarız:
    # betiğin kendi curl kontrolleri hariç tutulur, yalnızca tarayıcı
    # istekleri sayılır.
    EDGE_LOG=$($COMPOSE logs edge 2>&1)
    BROWSER_HITS=$(printf '%s' "$EDGE_LOG" | grep -E "GET /odeme/" | grep -cviE "curl|wget|python-urllib")
    RETURN_HITS=$(printf '%s' "$EDGE_LOG" | grep -cE "GET /odeme/(basarili|basarisiz)")
    # Betiğin kendi sondaları: User-Agent "curl..." ya da bilinçli boş ("-").
    # İkisi de dış kaynak sayılmaz.
    FOREIGN_HITS=$(printf '%s' "$EDGE_LOG" | grep -E "POST /api/payments/paytr/callback/" \
      | grep -viE "curl|wget" | grep -cv '"-" "' )

    echo ""
    echo "  --- Kanıt: ödeme gerçekten denendi mi? ---"
    echo "    ödeme ekranını tarayıcıda açma  : $BROWSER_HITS"
    echo "    PayTR'den dönüş sayfası isteği  : $RETURN_HITS"
    echo "    dış kaynaklı callback POST      : $FOREIGN_HITS"

    if [ "$BROWSER_HITS" -eq 0 ] && [ "$RETURN_HITS" -eq 0 ]; then
      echo ""
      bad "ÖDEME HİÇ DENENMEMİŞ — bu bir callback arızası DEĞİL" \
          "Ödeme ekranı tarayıcıda hiç açılmamış (erişim logunda tek bir tarayıcı isteği yok). PayTR'nin bildirecek bir işlemi olmadı."
      echo ""
      echo "  Yapılacak: aşağıdaki adresi TARAYICIDA açıp 3D Secure adımını bitirin,"
      echo "  sonra bu komutu tekrar çalıştırın."
      echo "    ${BASE}/odeme/${IFTOK:-<token>}"
      echo ""
      echo "  (Token 30 dakika geçerlidir; süresi dolduysa betiği argümansız"
      echo "   çalıştırıp yeni token alın.)"
      echo ""
      printf " SONUÇ: \033[33mödeme bekleniyor\033[0m — entegrasyon arızası saptanmadı\n"
      exit 2
    fi

    echo ""
    if [ "$RETURN_HITS" -eq 0 ] && [ "${AGE:-0}" -lt 120 ]; then
      # En olası durum: ödeme henüz tamamlanmadı. Bunu "bildirim URL'si
      # yanlış" ile karıştırmamak önemli — ikisi tamamen farklı iş gerektirir.
      bad "Ödeme ekranı açılmış ama işlem HENÜZ BİTMEMİŞ görünüyor" \
          "İşlem ${AGE} saniyelik ve PayTR'den dönüş sayfasına düşülmemiş. 3D Secure adımını tamamlayıp tekrar deneyin."
      echo "      Ödeme ekranı: ${BASE}/odeme/${IFTOK:-<token>}"
    else
      bad "PayTR bildirimi ULAŞMADI (${AGE} sn geçti)" \
          "Ödeme ekranı açılmış (dönüş sayfası isteği: ${RETURN_HITS}) ama bildirim gelmemiş — bu GERÇEK bir callback sorunudur."
      echo ""
      echo "  Kontrol listesi:"
      echo "    1) PayTR Paneli > Bildirim URL ŞU OLMALI:"
      echo "       ${BASE}/api/payments/paytr/callback/"
      echo "    2) Tünel hâlâ açık mı:  docker ps --filter name=uc-staging-tunnel"
      echo "    3) Dışarıdan erişim:    bash infra/staging/verify_callback_url.sh ${BASE}"
    fi
    echo ""
    echo "  Son PayTR log satırları:"
    $COMPOSE logs backend --since 30m 2>&1 | grep -i paytr | tail -10 | sed 's/^/    /'
  else
    ok "PayTR bildirimi ulaştı ve İMZASI DOĞRULANDI (işlendi)"
    case "${TXN_STATUS:-}" in
      paid)
        ok "İşlem durumu: paid"
        [ "${TXN_PAID_AT:-}" = "True" ] && ok "paid_at damgalandı" || bad "paid_at boş" "beklenmedik"
        [ "${SR_PAYSTATUS:-}" = "approved" ] && ok "Sipariş: approved" || bad "Sipariş approved değil" "${SR_PAYSTATUS:-}"
        [ "${SR_PAYMETHOD:-}" = "card" ] && ok "Ödeme yöntemi: card" || bad "Yöntem card değil" "${SR_PAYMETHOD:-}"
        case "${PAYMENT_ROW:-}" in
          card/paid/*) ok "Payment kaydı: ${PAYMENT_ROW}" ;;
          *) bad "Payment kaydı beklenen biçimde değil" "${PAYMENT_ROW:-}" ;;
        esac ;;
      failed)
        ok "İşlem durumu: failed (başarısız ödeme testi)"
        echo "      neden: ${TXN_REASON:-}"
        [ "${SR_PAYSTATUS:-}" = "unpaid" ] && ok "Sipariş ödenmemiş kaldı" || bad "Sipariş değişmiş" "${SR_PAYSTATUS:-}"
        [ "${PAYMENT_ROW:-}" = "YOK" ] && ok "Payment kaydı oluşmadı" || bad "Payment kaydı oluşmuş" "${PAYMENT_ROW:-}" ;;
      mismatch)
        bad "TUTAR UYUŞMAZLIĞI" "İmza geçerli ama tutar siparişle örtüşmedi — mutabakat gerekir" ;;
      pending)
        bad "İşlem hâlâ pending" "Bildirim gelmemiş olabilir" ;;
    esac
  fi

  # --- Yinelenen bildirim ---
  if [ "${TXN_STATUS:-}" = "paid" ] || [ "${TXN_STATUS:-}" = "failed" ]; then
    echo ""
    echo "  --- Yinelenen bildirim denemesi (PayTR'nin tekrarını taklit eder) ---"
    BEFORE="${PAYMENT_COUNT:-0}"
    # Gerçek PayTR imzasını yeniden üretmek için ilk bildirimin gövdesi kullanılır.
    REPLAY=$(sh_be "
import json, urllib.parse, urllib.request
from apps.payments.models import PaymentTransaction
from apps.payments import paytr
t = PaymentTransaction.objects.get(merchant_oid='$OID')
p = dict(t.callback_payload or {})
if not p:
    print('NO_PAYLOAD'); raise SystemExit
cfg = paytr.require_config()
p['hash'] = paytr.build_callback_hash(config=cfg, merchant_oid=p['merchant_oid'],
                                      status=p['status'], total_amount=str(p['total_amount']))
req = urllib.request.Request('http://localhost:8000/api/payments/paytr/callback/',
                             data=urllib.parse.urlencode(p).encode())
print('REPLAY_BODY=' + urllib.request.urlopen(req, timeout=15).read().decode().strip())
")
    echo "$REPLAY" | sed 's/^/    /'
    AFTER=$(sh_be "
from apps.payments.models import Payment
print(Payment.objects.filter(service_request_id=$SR_ID).count())" | tr -d ' \r')
    case "$REPLAY" in *"REPLAY_BODY=OK"*) ok "Tekrarda 'OK' döndü" ;; *) bad "Tekrarda OK dönmedi" "$REPLAY" ;; esac
    [ "$AFTER" = "$BEFORE" ] && ok "Payment kaydı ÇOĞALMADI ($BEFORE -> $AFTER)" \
                             || bad "Payment kaydı çoğaldı" "$BEFORE -> $AFTER"
  fi

  echo ""
  echo "  --- PayTR ile ilgili son loglar ---"
  $COMPOSE logs backend --since 30m 2>&1 | grep -i "paytr" | tail -8 | sed 's/^/    /'
  echo ""
  printf " SONUÇ: \033[32m%d başarılı\033[0m, \033[31m%d başarısız\033[0m\n" "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ]
  exit $?
fi

# ---------------------------------------------------------------- 1. AŞAMA --
echo "=============================================================="
echo " ÖN KOŞUL KONTROLLERİ"
echo "=============================================================="

$COMPOSE ps --format '{{.Service}}:{{.State}}' 2>/dev/null | grep -q "backend:running" \
  || die "staging backend çalışmıyor. Önce stack'i ayağa kaldırın (README adım 2)."
ok "staging stack ayakta"

CFG=$(sh_be "
from django.conf import settings
print('ID=%s' % bool(settings.PAYTR_MERCHANT_ID))
print('KEY=%s' % bool(settings.PAYTR_MERCHANT_KEY))
print('SALT=%s' % bool(settings.PAYTR_MERCHANT_SALT))
print('TEST=%s' % settings.PAYTR_TEST_MODE)
print('TOKENURL=%s' % settings.PAYTR_TOKEN_URL)
print('OK_URL=%s' % settings.PAYTR_MERCHANT_OK_URL)")
eval "$(echo "$CFG" | grep -E '^[A-Z_]+=')" 2>/dev/null

[ "${ID:-}" = "True" ] && [ "${KEY:-}" = "True" ] && [ "${SALT:-}" = "True" ] \
  || die "Mağaza bilgileri boş. Çalıştırın: bash infra/staging/set_paytr_keys.sh"
ok "mağaza bilgileri tanımlı (değerler gösterilmiyor)"

# --- TEST MODU KORUMASI: canlı tahsilatı kazara başlatmayı engeller ---
[ "${TEST:-}" = "True" ] || die "PAYTR_TEST_MODE=False! Bu betik yalnızca TEST MODUNDA çalışır. Canlı tahsilat başlatılmayacak."
ok "test modu AÇIK — gerçek para hareketi olmayacak"

[ "${TOKENURL:-}" = "https://www.paytr.com/odeme/api/get-token" ] \
  || die "Token adresi resmî PayTR ucu değil: ${TOKENURL:-}"
ok "hedef: gerçek PayTR ($TOKENURL)"

case "${OK_URL:-}" in
  https://*) ok "dönüş adresi HTTPS: ${OK_URL}" ;;
  *) die "Dönüş adresi HTTPS değil: ${OK_URL:-}" ;;
esac

CBCODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 -X POST "$BASE/api/payments/paytr/callback/" \
  -d "merchant_oid=onkontrol&status=failed&total_amount=0&hash=gecersiz")
CBBODY=$(curl -s --max-time 25 -X POST "$BASE/api/payments/paytr/callback/" \
  -d "merchant_oid=onkontrol&status=failed&total_amount=0&hash=gecersiz")
[ "$CBCODE" = "200" ] || die "Callback ucu dışarıdan erişilemiyor (HTTP $CBCODE). Tünel açık mı?"
case "$CBBODY" in
  *"bad hash"*) ok "callback ucu dışarıdan erişilebilir ve imza doğrulaması aktif" ;;
  *) die "Callback beklenmedik yanıt verdi: $CBBODY" ;;
esac

echo ""
echo "=============================================================="
echo " TEST VERİSİ"
echo "=============================================================="
SR_ID=$(sh_be "
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest
U = get_user_model()
u,_ = U.objects.get_or_create(username='staging_musteri', defaults={
    'email':'staging-test@ornek.com','role':'customer','first_name':'Test',
    'last_name':'Musteri','phone_number':'05555555555'})
u.set_password('StagingTest123!'); u.save()
v,_ = VehicleType.objects.get_or_create(name='Otomobil', defaults={'price_multiplier':1})
s,_ = ServiceType.objects.get_or_create(name=ServiceType.Kind.TOWING, defaults={'recovery_multiplier':1})
sr = ServiceRequest.objects.create(customer=u, vehicle_type=v, service_type=s,
    pickup_lat=38.46, pickup_lng=27.21, pickup_address='Bayrakli/Izmir',
    dropoff_lat=38.42, dropoff_lng=27.14, dropoff_address='Konak/Izmir',
    price=Decimal('10.00'), status=ServiceRequest.Status.ACCEPTED)
print(sr.id)" | tr -d ' \r' | tail -1)
[ -n "$SR_ID" ] || die "Test talebi oluşturulamadı."
ok "talep #$SR_ID — 10.00 TL — durum: accepted (fiyat kesinleşmiş)"

TOKEN=$(curl -s --max-time 25 -X POST "$BASE/api/auth/login/" -H 'Content-Type: application/json' \
  -d '{"username":"staging_musteri","password":"StagingTest123!"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('access',''))" 2>/dev/null)
[ -n "$TOKEN" ] || die "Giriş yapılamadı (JWT alınamadı)."
ok "müşteri JWT alındı"

echo ""
echo "=============================================================="
echo " 1. ADIM — GERÇEK PayTR'DEN TOKEN"
echo "=============================================================="
RESP=$(curl -s --max-time 40 -X POST "$BASE/api/payments/paytr/requests/$SR_ID/init/" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}')
echo "$RESP" | python3 -m json.tool 2>/dev/null | sed 's/^/  /' || echo "  $RESP"

OID=$(echo "$RESP"   | python3 -c "import sys,json;print(json.load(sys.stdin).get('merchant_oid',''))" 2>/dev/null)
IFTOK=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('iframe_token',''))" 2>/dev/null)
PAGE=$(echo "$RESP"  | python3 -c "import sys,json;print(json.load(sys.stdin).get('payment_page_path',''))" 2>/dev/null)

if [ -z "$IFTOK" ]; then
  echo ""
  bad "GERÇEK PayTR token VERMEDİ" "$(echo "$RESP" | head -c 400)"
  echo ""
  echo "  En sık nedenler:"
  echo "    * merchant_id/key/salt panelden farklı  -> set_paytr_keys.sh ile yeniden girin"
  echo "    * mağaza henüz iFrame API için aktif değil -> PayTR destek"
  echo "    * dönüş adresleri mağaza tanımıyla uyuşmuyor"
  echo "  Ayrıntılı neden (PAYTR_DEBUG_ON=true açık):"
  $COMPOSE logs backend --since 3m 2>&1 | grep -i "paytr" | tail -5 | sed 's/^/    /'
  exit 1
fi

ok "GERÇEK PayTR token verdi -> imzamız PayTR tarafından KABUL EDİLDİ"
ok "sipariş no: $OID"
printf "SR_ID=%s\nOID=%s\nIFTOK=%s\n" "$SR_ID" "$OID" "$IFTOK" > "$STATE"

echo ""
echo "=============================================================="
echo " 2. ADIM — ÖDEME EKRANINI TARAYICIDA AÇIN"
echo "=============================================================="
echo ""
echo "    $BASE$PAGE"
echo ""
echo "  PayTR ödeme sayfasında TEST KARTLARI HAZIR GELİR — kart bilgisi"
echo "  girmeniz gerekmez. 3D Secure test adımını tamamlayın."
echo ""
echo "  BAŞARILI test için  : ödeme adımlarını onaylayın"
echo "  BAŞARISIZ test için : ödemeyi iptal edin / vazgeçin"
echo ""
echo "  İşlem bittikten sonra doğrulama için:"
echo "    bash infra/staging/real_paytr_test.sh --verify"
echo ""
printf " ÖN AŞAMA SONUCU: \033[32m%d başarılı\033[0m, \033[31m%d başarısız\033[0m\n" "$PASS" "$FAIL"
