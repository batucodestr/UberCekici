#!/usr/bin/env bash
# =============================================================================
#  CALLBACK URL DOĞRULAMA
#
#  PayTR panelindeki "Bildirim URL" alanına bir adres GİRMEDEN ÖNCE bu betiği
#  çalıştırın. Adres yanlış ya da erişilemezse PayTR ödemeyi tahsil eder ama
#  bildirimi ulaştıramaz; sipariş panelde "Devam Ediyor" kalır ve sizin
#  sisteminizde hiç onaylanmaz.
#
#  Kullanım:
#     bash infra/staging/verify_callback_url.sh https://alan-adiniz.com
#
#  ÖNEMLİ: Betiği mümkünse SUNUCUNUN DIŞINDAN (kendi bilgisayarınızdan)
#  çalıştırın. Sunucunun kendi üstünden yapılan istek, dışarıya kapalı bir
#  güvenlik duvarını/WAF'ı fark etmez.
# =============================================================================
set -uo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "Kullanım: $0 https://alan-adiniz.com" >&2; exit 2
fi
BASE="${BASE%/}"
CALLBACK="$BASE/api/payments/paytr/callback/"
HOST=$(printf '%s' "$BASE" | sed -E 's#^https?://##; s#/.*##; s#:.*##')

PASS=0; FAIL=0; WARN=0
ok()   { PASS=$((PASS+1)); printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  \033[31m✗\033[0m %s\n      → %s\n" "$1" "$2"; }
warn() { WARN=$((WARN+1)); printf "  \033[33m!\033[0m %s\n      → %s\n" "$1" "$2"; }

echo "=============================================================="
echo " Doğrulanan adres: $CALLBACK"
echo "=============================================================="

# --- 1. Şema HTTPS mi? -------------------------------------------------------
case "$BASE" in
  https://*) ok "HTTPS kullanılıyor" ;;
  *) bad "HTTPS kullanılmıyor" "PayTR bildirimi için geçerli sertifikalı HTTPS gerekir" ;;
esac

# --- 2. Alan adı ASCII/punycode mi? -----------------------------------------
case "$HOST" in
  *[!a-zA-Z0-9.-]*) bad "Alan adında ASCII dışı karakter var: $HOST" \
       "IDN alan adlarını punycode yazın (ör. kurtarıcım.com.tr -> xn--kurtarcm-ykbb.com.tr)" ;;
  *_*) bad "Alan adında alt çizgi var: $HOST" "Alt çizgi RFC 1034/1035'e aykırıdır; sunucu isteği reddeder" ;;
  *) ok "Alan adı biçimi geçerli: $HOST" ;;
esac

# --- 3. DNS çözümleniyor mu? -------------------------------------------------
IPS=$(getent ahostsv4 "$HOST" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')
if [ -z "$IPS" ]; then
  bad "DNS çözümlenemedi: $HOST" "Alan adı yayında değil ya da yazım hatası var"
else
  ok "DNS çözümleniyor: $IPS"
fi

# --- 4. TLS sertifikası geçerli mi? -----------------------------------------
TLSRES=$(curl -s -o /dev/null -w '%{ssl_verify_result}' --max-time 20 "$BASE/" 2>/dev/null)
if [ "$TLSRES" = "0" ]; then
  ok "TLS sertifikası geçerli"
else
  bad "TLS sertifikası doğrulanamadı (kod: ${TLSRES:-yok})" \
      "PayTR geçersiz sertifikalı adrese bildirim göndermez"
fi

# --- 5. Site ayakta mı? ------------------------------------------------------
ROOT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/" 2>/dev/null)
case "$ROOT" in
  200|301|302) ok "Site yanıt veriyor (HTTP $ROOT)" ;;
  403|401) bad "Site $ROOT döndürüyor" "Alan adı bu sunucuya gitmiyor ya da önünde bir engel var" ;;
  000) bad "Siteye hiç ulaşılamadı" "Ağ/DNS/güvenlik duvarı engeli" ;;
  *) warn "Site beklenmedik yanıt verdi (HTTP $ROOT)" "Yine de callback kontrolüne devam ediliyor" ;;
esac

# --- 6. Callback ucu yayında mı ve POST kabul ediyor mu? --------------------
# Kasıtlı olarak GEÇERSİZ imzalı bir bildirim gönderiyoruz. Bu güvenlidir:
# hiçbir sipariş değişmez; yalnızca ucun ayakta olduğunu kanıtlar.
BODY=$(curl -s --max-time 25 -X POST "$CALLBACK" \
  -d "merchant_oid=erisimtesti" -d "status=failed" -d "total_amount=0" -d "hash=gecersiz" 2>/dev/null)
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 -X POST "$CALLBACK" \
  -d "merchant_oid=erisimtesti" -d "status=failed" -d "total_amount=0" -d "hash=gecersiz" 2>/dev/null)

case "$CODE" in
  200)
    case "$BODY" in
      *"bad hash"*)
        ok "Callback ucu yayında ve imza doğrulaması çalışıyor"
        ok "Geçersiz bildirim reddedildi (hiçbir sipariş değişmedi)" ;;
      *"store not configured"*)
        ok "Callback ucu yayında (POST kabul ediyor)"
        warn "Mağaza bilgileri henüz tanımlı değil" \
             "PAYTR_MERCHANT_ID/KEY/SALT doldurulana kadar imza doğrulanamaz" ;;
      *OK*)
        bad "Uç 'OK' döndürdü ama imza geçersizdi" "Ciddi: imza doğrulaması devre dışı olabilir" ;;
      *)
        warn "Uç 200 döndü, gövde beklenmedik" "Gelen: $(printf '%s' "$BODY" | head -c 120)" ;;
    esac ;;
  404) bad "Callback ucu bulunamadı (404)" "Yeni kod bu ortama henüz dağıtılmamış" ;;
  401|403) bad "Callback ucu korumalı (HTTP $CODE)" \
       "PayTR oturum açamaz. Önündeki auth/IP kısıtını ya da WAF kuralını kaldırın" ;;
  405) bad "Uç POST kabul etmiyor (405)" "PayTR bildirimi POST ile gönderir" ;;
  429) bad "Uç hız sınırına takıldı (429)" "Callback throttle dışında olmalı" ;;
  502|503|504) bad "Sunucu hatası (HTTP $CODE)" "Uygulama ayakta değil" ;;
  000) bad "Callback adresine ulaşılamadı" "DNS/güvenlik duvarı/tünel kapalı" ;;
  *) bad "Beklenmedik yanıt (HTTP $CODE)" "Gelen: $(printf '%s' "$BODY" | head -c 120)" ;;
esac

# --- 7. Bot koruması / WAF sunucu-sunucu isteği engelliyor mu? --------------
# PayTR tarayıcı değildir: User-Agent göndermez, JS çalıştırmaz, çerez tutmaz.
UA=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 -X POST "$CALLBACK" \
  -H 'User-Agent:' -d "merchant_oid=erisimtesti&status=failed&total_amount=0&hash=gecersiz" 2>/dev/null)
if [ "$UA" = "$CODE" ]; then
  ok "User-Agent'sız (sunucu-sunucu) istek de aynı yanıtı alıyor"
else
  bad "User-Agent'sız istek farklı yanıt alıyor (HTTP $UA)" \
      "Cloudflare bot koruması PayTR'nin bildirimini engelleyebilir — bu yol için kuralı gevşetin"
fi

# --- 8. Yönlendirme var mı? --------------------------------------------------
REDIR=$(curl -s -o /dev/null -w '%{num_redirects}' --max-time 25 -X POST "$CALLBACK" \
  -d "merchant_oid=erisimtesti&status=failed&total_amount=0&hash=gecersiz" 2>/dev/null)
if [ "${REDIR:-0}" = "0" ]; then
  ok "Yönlendirme yok (POST gövdesi korunuyor)"
else
  warn "$REDIR yönlendirme var" "Yönlendirmede POST gövdesi kaybolabilir; nihai adresi doğrudan girin"
fi

echo ""
echo "=============================================================="
printf " %d başarılı, %d uyarı, %d başarısız\n" "$PASS" "$WARN" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  echo ""
  echo " SONUÇ: Bu adres PayTR paneline girilebilir:"
  echo "   $CALLBACK"
else
  echo ""
  echo " SONUÇ: Bu adresi PayTR paneline GİRMEYİN — önce yukarıdaki"
  echo "        başarısız maddeleri giderin."
fi
echo "=============================================================="
[ "$FAIL" -eq 0 ]
