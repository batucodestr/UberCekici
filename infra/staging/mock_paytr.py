#!/usr/bin/env python3
"""Yerel sahte PayTR sunucusu — uçtan uca akışı gerçek PayTR'siz denemek için.

NE YAPAR
    1. `POST /odeme/api/get-token` ucunu PayTR gibi karşılar ve gelen
       `paytr_token` imzasını **bağımsız olarak yeniden hesaplayıp doğrular**.
       İmza tutmazsa gerçek PayTR gibi `{"status":"failed","reason":...}`
       döner. Böylece 1. Adım imzamızın doğruluğu kanıtlanır.
    2. Zorunlu alanların varlığını ve PayTR'nin karakter/biçim sınırlarını
       denetler (merchant_oid alfanümerik ≤64, payment_amount tamsayı, vb.).
    3. `POST /notify` ile, kaydettiği bir siparişe ait **imzalı** ödeme
       bildirimini mağazanın callback adresine gönderir (2. Adım).

NE YAPMAZ
    Gerçek kart işlemez, 3D Secure yapmaz, para hareketi oluşturmaz.
    Gerçek PayTR entegrasyonunun yerini TUTMAZ; yalnızca protokol
    uyumluluğunu ve kendi uçlarımızın davranışını doğrular.

KULLANIM
    python3 mock_paytr.py --port 9009 \
        --merchant-id 123456 --merchant-key KEY --merchant-salt SALT
"""

import argparse
import base64
import hashlib
import hmac
import json
import re
import threading
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

CONFIG = {}
# merchant_oid -> 1. Adım'da gelen sipariş bilgisi
ORDERS: dict[str, dict] = {}
LOCK = threading.Lock()

MANDATORY_FIELDS = (
    "merchant_id", "user_ip", "merchant_oid", "email", "payment_amount",
    "paytr_token", "user_basket", "no_installment", "max_installment",
    "user_name", "user_address", "user_phone",
    "merchant_ok_url", "merchant_fail_url", "currency", "test_mode",
)


def sign(message: str) -> str:
    return base64.b64encode(
        hmac.new(CONFIG["key"].encode(), message.encode("utf-8"), hashlib.sha256).digest()
    ).decode()


def validate_token_request(form: dict) -> tuple[bool, str]:
    """PayTR'nin 1. Adım'da uyguladığı doğrulamaları taklit eder."""
    for field in MANDATORY_FIELDS:
        if not form.get(field):
            return False, f"zorunlu alan eksik: {field}"

    oid = form["merchant_oid"]
    if not oid.isalnum():
        return False, "merchant_oid alfanumerik olmali"
    if len(oid) > 64:
        return False, "merchant_oid 64 karakteri asamaz"
    if not re.fullmatch(r"\d+", str(form["payment_amount"])):
        return False, "payment_amount kurus cinsinden tamsayi olmali"
    if int(form["payment_amount"]) <= 0:
        return False, "payment_amount sifirdan buyuk olmali"
    if form["merchant_id"] != CONFIG["id"]:
        return False, "magaza bulunamadi"
    if len(form["email"]) > 100 or "@" not in form["email"]:
        return False, "gecersiz email"
    if len(form["user_name"]) > 60:
        return False, "user_name 60 karakteri asamaz"
    if len(form["user_address"]) > 400:
        return False, "user_address 400 karakteri asamaz"
    if len(form["user_phone"]) > 20:
        return False, "user_phone 20 karakteri asamaz"
    for url_field in ("merchant_ok_url", "merchant_fail_url"):
        if len(form[url_field]) > 400:
            return False, f"{url_field} 400 karakteri asamaz"
    if str(form["no_installment"]) not in ("0", "1"):
        return False, "no_installment 0 veya 1 olmali"
    if str(form["test_mode"]) not in ("0", "1"):
        return False, "test_mode 0 veya 1 olmali"
    try:
        basket = json.loads(base64.b64decode(form["user_basket"]).decode())
        assert isinstance(basket, list) and basket
        for item in basket:
            assert isinstance(item, list) and len(item) == 3
    except Exception:
        return False, "user_basket base64(JSON) dizisi olmali"

    # --- Asıl sınav: imza ---
    expected = sign(
        f"{form['merchant_id']}{form['user_ip']}{form['merchant_oid']}{form['email']}"
        f"{form['payment_amount']}{form['user_basket']}{form['no_installment']}"
        f"{form['max_installment']}{form['currency']}{form['test_mode']}"
        + CONFIG["salt"]
    )
    if not hmac.compare_digest(expected, form["paytr_token"]):
        return False, "PAYTR_TOKEN dogrulanamadi (hash hatali)"
    return True, ""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # sessiz
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        payload = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _form(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode()
        return {k: v[0] for k, v in urllib.parse.parse_qs(raw, keep_blank_values=True).items()}

    def do_GET(self):
        if self.path.startswith("/orders"):
            with LOCK:
                self._send(200, json.dumps(ORDERS, ensure_ascii=False))
            return
        if self.path.startswith("/odeme/guvenli/"):
            # Gerçek PayTR'nin ödeme formu yerine basit bir yer tutucu.
            token = self.path.rsplit("/", 1)[-1]
            self._send(200, f"<html><body>MOCK PAYTR FORM token={token}</body></html>",
                       "text/html; charset=utf-8")
            return
        self._send(404, "{}")

    def do_POST(self):
        if self.path.startswith("/odeme/api/get-token"):
            form = self._form()
            ok, reason = validate_token_request(form)
            if not ok:
                print(f"  [mock] TOKEN REDDEDILDI: {reason}", flush=True)
                self._send(200, json.dumps({"status": "failed", "reason": reason}))
                return
            token = "mocktoken" + hashlib.sha1(form["merchant_oid"].encode()).hexdigest()[:20]
            with LOCK:
                ORDERS[form["merchant_oid"]] = {
                    "payment_amount": int(form["payment_amount"]),
                    "currency": form["currency"],
                    "ok_url": form["merchant_ok_url"],
                    "fail_url": form["merchant_fail_url"],
                    "token": token,
                    "test_mode": form["test_mode"],
                }
            print(f"  [mock] TOKEN VERILDI oid={form['merchant_oid']} "
                  f"tutar={form['payment_amount']} kurus (imza DOGRULANDI)", flush=True)
            self._send(200, json.dumps({"status": "success", "token": token}))
            return

        if self.path.startswith("/notify"):
            # Mağazanın callback adresine imzalı bildirim gönder.
            req = self._form()
            oid = req["merchant_oid"]
            status = req.get("status", "success")
            callback_url = req["callback_url"]
            with LOCK:
                order = ORDERS.get(oid, {})
            amount = int(req.get("payment_amount") or order.get("payment_amount") or 0)
            total = int(req.get("total_amount") or amount)
            # Bozuk imza senaryosunu da test edebilmek için:
            bad_hash = req.get("bad_hash") == "1"
            h = "gecersiz-imza" if bad_hash else sign(f"{oid}{CONFIG['salt']}{status}{total}")
            fields = {
                "merchant_oid": oid, "status": status,
                "total_amount": str(total), "payment_amount": str(amount),
                "payment_type": req.get("payment_type", "card"),
                "currency": order.get("currency", "TL"),
                "test_mode": order.get("test_mode", "1"),
                "hash": h,
            }
            if status == "failed":
                fields["failed_reason_code"] = req.get("failed_reason_code", "0")
                fields["failed_reason_msg"] = req.get("failed_reason_msg", "mock hata")
            data = urllib.parse.urlencode(fields).encode()
            try:
                with urllib.request.urlopen(
                    urllib.request.Request(callback_url, data=data), timeout=15
                ) as resp:
                    body = resp.read().decode()
                    code = resp.status
            except Exception as exc:  # noqa: BLE001
                body, code = f"ISTEK HATASI: {exc}", 0
            print(f"  [mock] BILDIRIM -> {callback_url} ({status}) => {code} {body!r}", flush=True)
            self._send(200, json.dumps({"http_status": code, "body": body}))
            return

        self._send(404, "{}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9009)
    parser.add_argument("--merchant-id", required=True)
    parser.add_argument("--merchant-key", required=True)
    parser.add_argument("--merchant-salt", required=True)
    args = parser.parse_args()
    CONFIG.update(id=args.merchant_id, key=args.merchant_key, salt=args.merchant_salt)
    print(f"[mock] sahte PayTR 0.0.0.0:{args.port} dinliyor", flush=True)
    HTTPServer(("0.0.0.0", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
