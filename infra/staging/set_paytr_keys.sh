#!/usr/bin/env bash
# =============================================================================
#  PayTR MAĞAZA BİLGİLERİNİ GÜVENLİ BİÇİMDE YAZAR
#
#  Değerleri gizli girdiyle (ekrana yazılmadan) alır ve yalnızca
#  infra/staging/.env.staging dosyasına yazar.
#
#  Neden bu betik:
#    * Değerler ekrana YAZILMAZ (`read -s`)
#    * Kabuk geçmişine (~/.bash_history) GİRMEZ — komut satırına yazmazsınız
#    * Dosya 600 izniyle oluşur (yalnızca sizin kullanıcınız okur)
#    * .env.staging .gitignore'dadır — repoya giremez
#    * Betik değerleri hiçbir yere loglamaz, ekrana basmaz
#
#  Kullanım (depo kökünden):
#      bash infra/staging/set_paytr_keys.sh
#
#  Değerler: PayTR Paneli > Destek & Kurulum > Entegrasyon Bilgileri
#            > "API Entegrasyon Bilgileri"
#            (yalnızca Ana Kullanıcı ve Teknik Kullanıcı görebilir)
# =============================================================================
set -euo pipefail

ENV_FILE="$(cd "$(dirname "$0")" && pwd)/.env.staging"
[ -f "$ENV_FILE" ] || { echo "HATA: $ENV_FILE yok. Önce staging'i kurun." >&2; exit 1; }

echo "PayTR mağaza bilgileri (giriş ekranda GÖRÜNMEZ):"
printf "  Mağaza No (merchant_id)        : "; read -rs MID;  echo
printf "  Mağaza Parola (merchant_key)   : "; read -rs MKEY; echo
printf "  Mağaza Gizli Anahtar (salt)    : "; read -rs MSALT; echo

[ -n "$MID" ] && [ -n "$MKEY" ] && [ -n "$MSALT" ] || { echo "HATA: üçü de dolu olmalı." >&2; exit 1; }

MID="$MID" MKEY="$MKEY" MSALT="$MSALT" ENV_FILE="$ENV_FILE" python3 - <<'PY'
import os, pathlib
env = pathlib.Path(os.environ["ENV_FILE"])
vals = {
    "PAYTR_MERCHANT_ID": os.environ["MID"],
    "PAYTR_MERCHANT_KEY": os.environ["MKEY"],
    "PAYTR_MERCHANT_SALT": os.environ["MSALT"],
}
out, seen = [], set()
for line in env.read_text().splitlines():
    key = line.split("=", 1)[0]
    if key in vals:
        out.append(f"{key}={vals[key]}"); seen.add(key)
    else:
        out.append(line)
for key, value in vals.items():
    if key not in seen:
        out.append(f"{key}={value}")
env.write_text("\n".join(out) + "\n")
env.chmod(0o600)
PY

unset MID MKEY MSALT
echo ""
echo "Yazıldı: $ENV_FILE (izin 600). Değerler ekrana veya loga basılmadı."
echo ""
echo "Doğrulama (yalnızca DOLU/BOŞ gösterir, değer göstermez):"
awk -F= '/^PAYTR_MERCHANT_(ID|KEY|SALT)=/ {printf "  %s = %s\n", $1, (length($2)>0 ? "<dolu, " length($2) " karakter>" : "<BOŞ>")}' "$ENV_FILE"
echo ""
echo "Sonraki adım — backend'i yeni değerlerle yeniden başlatın:"
echo "  docker compose -p ubercekici-staging --env-file infra/staging/.env.staging \\"
echo "    -f infra/staging/docker-compose.staging.yml up -d backend"
