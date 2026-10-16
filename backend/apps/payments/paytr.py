"""PayTR iFrame API — imza üretimi, token isteği ve bildirim doğrulaması.

Resmî dokümantasyon:
  - https://dev.paytr.com/iframe-api
  - https://dev.paytr.com/iframe-api/iframe-api-1-adim  (token oluşturma)
  - https://dev.paytr.com/iframe-api/iframe-api-2-adim  (ödeme bildirimi)

Bu modül bilinçli olarak Django modellerinden bağımsızdır: yalnızca imza/HTTP
katmanını kapsar, sipariş tarafındaki iş kuralları `apps.payments.services`
içindedir. Böylece hash algoritması gerçek bir sipariş veya mağaza sırrı
olmadan birim testlerle doğrulanabilir.

GÜVENLİK: merchant_key ve merchant_salt yalnızca bu modül içinde kullanılır ve
hiçbir log kaydına, hata mesajına veya API yanıtına yazılmaz.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import secrets
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# PayTR, merchant_oid için "en fazla 64 karakter, alfanümerik" şartı koyar;
# tire/alt çizgi gibi karakterler reddedilir.
MERCHANT_OID_MAX_LENGTH = 64


class PayTRError(Exception):
    """PayTR tarafından dönen ya da istek sırasında oluşan genel hata."""


class PayTRNotConfigured(PayTRError):
    """Mağaza kimlik bilgileri (id/key/salt) ortam değişkenlerinde tanımlı değil."""


@dataclass(frozen=True)
class PayTRConfig:
    merchant_id: str
    merchant_key: bytes
    merchant_salt: str
    token_url: str
    iframe_url_template: str
    merchant_ok_url: str
    merchant_fail_url: str
    test_mode: bool
    debug_on: bool
    timeout_limit: int
    no_installment: int
    max_installment: int
    currency: str
    request_timeout: int

    @property
    def is_configured(self) -> bool:
        return bool(self.merchant_id and self.merchant_key and self.merchant_salt)


def get_config() -> PayTRConfig:
    """Ayarları her çağrıda okur; testlerde `override_settings` ile değiştirilebilir."""
    return PayTRConfig(
        merchant_id=str(settings.PAYTR_MERCHANT_ID or ""),
        merchant_key=str(settings.PAYTR_MERCHANT_KEY or "").encode(),
        merchant_salt=str(settings.PAYTR_MERCHANT_SALT or ""),
        token_url=settings.PAYTR_TOKEN_URL,
        iframe_url_template=settings.PAYTR_IFRAME_URL_TEMPLATE,
        merchant_ok_url=settings.PAYTR_MERCHANT_OK_URL,
        merchant_fail_url=settings.PAYTR_MERCHANT_FAIL_URL,
        test_mode=bool(settings.PAYTR_TEST_MODE),
        debug_on=bool(settings.PAYTR_DEBUG_ON),
        timeout_limit=int(settings.PAYTR_TIMEOUT_LIMIT),
        no_installment=int(settings.PAYTR_NO_INSTALLMENT),
        max_installment=int(settings.PAYTR_MAX_INSTALLMENT),
        currency=settings.PAYTR_CURRENCY,
        request_timeout=int(settings.PAYTR_REQUEST_TIMEOUT),
    )


def require_config() -> PayTRConfig:
    config = get_config()
    if not config.is_configured:
        raise PayTRNotConfigured(
            "PayTR mağaza bilgileri tanımlı değil "
            "(PAYTR_MERCHANT_ID / PAYTR_MERCHANT_KEY / PAYTR_MERCHANT_SALT)."
        )
    return config


# --------------------------------------------------------------------------- #
# Yardımcılar
# --------------------------------------------------------------------------- #


def to_kurus(amount: Decimal | int | float | str) -> int:
    """TL tutarını PayTR'nin beklediği kuruş tam sayısına çevirir (34.56 -> 3456)."""
    value = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(value * 100)


def generate_merchant_oid(prefix: str) -> str:
    """Benzersiz, tahmin edilemez ve alfanümerik sipariş numarası üretir.

    Sipariş numarası PayTR'ye gider ve bildirimde geri döner; tahmin edilebilir
    olması (ör. düz sipariş id'si) bir saldırganın geçerli imza olmadan bile
    hangi siparişi hedeflediğini bilmesine yol açar. Bu yüzden sonuna
    kriptografik rastgele bir ek konur. Tek güvenlik sınırı imza doğrulamasıdır;
    rastgelelik ek bir katmandır.
    """
    oid = f"{prefix}{secrets.token_hex(10)}"
    if not oid.isalnum() or len(oid) > MERCHANT_OID_MAX_LENGTH:
        raise PayTRError("Üretilen merchant_oid PayTR kısıtlarına uymuyor.")
    return oid


def build_basket(items: list[tuple[str, Decimal | str, int]]) -> str:
    """Sepeti PayTR'nin istediği base64(JSON) biçimine çevirir.

    Her kalem [ürün adı, birim fiyat (metin), adet] sırasıyla yazılır:
        [["Örnek ürün", "18.00", 1]]
    """
    basket = [[name, str(price), int(quantity)] for name, price, quantity in items]
    payload = json.dumps(basket, ensure_ascii=False).encode("utf-8")
    return base64.b64encode(payload).decode("utf-8")


def _sign(config: PayTRConfig, message: str) -> str:
    return base64.b64encode(
        hmac.new(config.merchant_key, message.encode("utf-8"), hashlib.sha256).digest()
    ).decode("utf-8")


def build_token_hash(
    *,
    config: PayTRConfig,
    user_ip: str,
    merchant_oid: str,
    email: str,
    payment_amount: int,
    user_basket: str,
    no_installment: int,
    max_installment: int,
    currency: str,
    test_mode: int,
) -> str:
    """1. Adım imzası (paytr_token).

    Resmî birleştirme sırası:
        merchant_id + user_ip + merchant_oid + email + payment_amount
        + user_basket + no_installment + max_installment + currency + test_mode
    Sonuna merchant_salt eklenir, merchant_key ile HMAC-SHA256 imzalanır ve
    base64 kodlanır.
    """
    hash_str = (
        f"{config.merchant_id}{user_ip}{merchant_oid}{email}{payment_amount}"
        f"{user_basket}{no_installment}{max_installment}{currency}{test_mode}"
    )
    return _sign(config, hash_str + config.merchant_salt)


def build_callback_hash(
    *, config: PayTRConfig, merchant_oid: str, status: str, total_amount: str
) -> str:
    """2. Adım imzası.

    Resmî birleştirme sırası (salt, merchant_oid ile status arasındadır):
        merchant_oid + merchant_salt + status + total_amount
    """
    hash_str = f"{merchant_oid}{config.merchant_salt}{status}{total_amount}"
    return _sign(config, hash_str)


def verify_callback_hash(payload: dict, config: PayTRConfig | None = None) -> bool:
    """Bildirimin gerçekten PayTR'den geldiğini sabit zamanlı karşılaştırmayla doğrular."""
    config = config or require_config()
    received = payload.get("hash") or ""
    merchant_oid = payload.get("merchant_oid")
    status = payload.get("status")
    total_amount = payload.get("total_amount")
    if not (merchant_oid and status is not None and total_amount is not None):
        return False

    expected = build_callback_hash(
        config=config,
        merchant_oid=merchant_oid,
        status=status,
        total_amount=str(total_amount),
    )
    # compare_digest: imza karşılaştırmasında erken çıkışlı `==` yerine sabit
    # zamanlı karşılaştırma kullanılır (timing attack).
    return hmac.compare_digest(expected, str(received))


def iframe_url(token: str) -> str:
    return get_config().iframe_url_template.format(token=token)


# --------------------------------------------------------------------------- #
# 1. Adım: token isteği
# --------------------------------------------------------------------------- #


def create_iframe_token(
    *,
    merchant_oid: str,
    amount: Decimal,
    email: str,
    user_ip: str,
    user_name: str,
    user_address: str,
    user_phone: str,
    basket: list[tuple[str, Decimal | str, int]],
    ok_url: str | None = None,
    fail_url: str | None = None,
    no_installment: int | None = None,
    max_installment: int | None = None,
    lang: str = "tr",
) -> dict:
    """PayTR'den iFrame token'ı alır ve {token, iframe_url, payment_amount} döner.

    Tutar **çağıran tarafından sunucuda hesaplanmış** olmalıdır; bu fonksiyon
    istemciden gelen hiçbir değeri kullanmaz.
    """
    config = require_config()

    payment_amount = to_kurus(amount)
    if payment_amount <= 0:
        raise PayTRError("Ödeme tutarı sıfırdan büyük olmalı.")

    user_basket = build_basket(basket)
    no_installment = config.no_installment if no_installment is None else int(no_installment)
    max_installment = config.max_installment if max_installment is None else int(max_installment)
    test_mode = 1 if config.test_mode else 0

    paytr_token = build_token_hash(
        config=config,
        user_ip=user_ip,
        merchant_oid=merchant_oid,
        email=email,
        payment_amount=payment_amount,
        user_basket=user_basket,
        no_installment=no_installment,
        max_installment=max_installment,
        currency=config.currency,
        test_mode=test_mode,
    )

    payload = {
        "merchant_id": config.merchant_id,
        "user_ip": user_ip,
        "merchant_oid": merchant_oid,
        "email": email,
        "payment_amount": payment_amount,
        "paytr_token": paytr_token,
        "user_basket": user_basket,
        "debug_on": 1 if config.debug_on else 0,
        "no_installment": no_installment,
        "max_installment": max_installment,
        "user_name": user_name,
        "user_address": user_address,
        "user_phone": user_phone,
        "merchant_ok_url": ok_url or config.merchant_ok_url,
        "merchant_fail_url": fail_url or config.merchant_fail_url,
        "timeout_limit": config.timeout_limit,
        "currency": config.currency,
        "test_mode": test_mode,
        "lang": lang,
    }

    try:
        response = requests.post(
            config.token_url, data=payload, timeout=config.request_timeout
        )
        response.raise_for_status()
        result = response.json()
    except requests.RequestException as exc:
        # str(exc) PayTR'nin URL'sini içerebilir ama hiçbir sır içermez;
        # gönderilen payload bilinçli olarak loglanmaz.
        logger.error("PayTR token isteği başarısız (oid=%s): %s", merchant_oid, exc)
        raise PayTRError("Ödeme sağlayıcısına ulaşılamadı.") from exc
    except ValueError as exc:
        logger.error("PayTR token yanıtı JSON değil (oid=%s).", merchant_oid)
        raise PayTRError("Ödeme sağlayıcısından geçersiz yanıt alındı.") from exc

    if result.get("status") != "success":
        reason = result.get("reason", "bilinmeyen hata")
        logger.error("PayTR token reddedildi (oid=%s): %s", merchant_oid, reason)
        raise PayTRError(f"Ödeme başlatılamadı: {reason}")

    token = result["token"]
    return {
        "token": token,
        "iframe_url": config.iframe_url_template.format(token=token),
        "payment_amount": payment_amount,
        "test_mode": config.test_mode,
    }


def client_ip(request) -> str:
    """İstemcinin dış IP'sini çıkarır (en fazla 39 karakter — PayTR sınırı).

    Caddy, X-Forwarded-For / X-Real-IP başlıklarını Cloudflare'in
    CF-Connecting-IP değerinden doldurur (bkz. infra/caddy). Doğrudan
    REMOTE_ADDR, proxy'nin kendi IP'si olduğu için son tercihtir.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        # İlk değer orijinal istemcidir; aradaki proxy'ler sona eklenir.
        candidate = forwarded.split(",")[0].strip()
        if candidate:
            return candidate[:39]
    return (
        request.META.get("HTTP_X_REAL_IP")
        or request.META.get("REMOTE_ADDR")
        or "0.0.0.0"
    )[:39]
