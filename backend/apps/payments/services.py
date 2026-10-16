"""PayTR ödemelerinin sipariş tarafı: başlatma ve doğrulanmış bildirimin işlenmesi.

Akışın iki altın kuralı:

1. **Tutar hiçbir zaman istemciden gelmez.** Hizmet talebinde sunucuda
   hesaplanmış `ServiceRequest.price`, paket satışında `SUBSCRIPTION_PLANS`
   tablosundaki sabit fiyat kullanılır.
2. **Ödeme başarısı yalnızca imzası doğrulanmış 2. Adım bildirimiyle belirlenir.**
   Kullanıcının `merchant_ok_url`'e dönmesi ödeme kanıtı sayılmaz.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification
from apps.requests.models import ServiceRequest
from apps.users.models import User

from . import paytr
from .models import Payment, PaymentTransaction

logger = logging.getLogger(__name__)

# PayTR'ye gönderilen yanıt gövdeleri. Mağaza "OK" dışında bir şey dönerse
# PayTR bildirimi başarısız sayar ve sipariş panelde "Devam Ediyor" kalır.
RESPONSE_OK = "OK"
RESPONSE_BAD_HASH = "PAYTR notification failed: bad hash"
RESPONSE_UNKNOWN_ORDER = "PAYTR notification failed: order not found"
RESPONSE_AMOUNT_MISMATCH = "PAYTR notification failed: amount mismatch"
RESPONSE_NOT_CONFIGURED = "PAYTR notification failed: store not configured"


class PaymentNotAllowed(Exception):
    """Ödeme başlatma iş kuralları nedeniyle reddedildi (HTTP 400)."""


# Kart ödemesinin açılabildiği talep durumları.
#
# NEDEN KISITLI: `AcceptOfferView`, talep hâlâ SEARCHING iken kabul edilen
# teklifin tutarını `ServiceRequest.price` üzerine YAZAR
# (bkz. apps/requests/views.py — CAS koşulu status=SEARCHING). Müşteri
# CREATED/SEARCHING aşamasında kartla ödeyebilseydi şu açık oluşurdu:
#   1) talep searching, fiyat = motor tahmini (ör. 1250 ₺)
#   2) müşteri kartla 1250 ₺ öder, bildirim gelir, payment_status=approved
#   3) müşteri 2000 ₺'lik teklifi kabul eder -> price=2000 olur
#   4) sonuç: 2000 ₺'lik talep "ödendi" görünür, kasaya 1250 ₺ girmiştir.
# Teklif kabulünden sonra (ACCEPTED) ya da sürücü talebi doğrudan aldıktan
# sonra (DRIVER_FOUND) fiyat değişmez; ödeme ancak o noktadan sonra alınır.
PAYABLE_REQUEST_STATUSES = (
    ServiceRequest.Status.ACCEPTED,
    ServiceRequest.Status.DRIVER_FOUND,
    ServiceRequest.Status.EN_ROUTE,
    ServiceRequest.Status.ARRIVED,
    ServiceRequest.Status.COMPLETED,
)


# --------------------------------------------------------------------------- #
# 1. Adım — ödeme başlatma
# --------------------------------------------------------------------------- #


def _customer_identity(user, service_request: ServiceRequest | None = None) -> dict:
    """PayTR'nin zorunlu tuttuğu müşteri alanlarını mevcut verilerden doldurur.

    Alanlar boş gönderilemez; eksik bilgide PayTR token'ı reddeder. Bu yüzden
    hesap bilgisi -> talep bilgisi -> güvenli varsayılan sırasıyla doldurulur.
    """
    full_name = (f"{user.first_name} {user.last_name}".strip()) or user.username
    phone = user.phone_number
    address = ""

    if service_request is not None:
        full_name = service_request.contact_name or full_name
        phone = service_request.contact_phone or phone
        address = service_request.pickup_address or ""

    profile = getattr(user, "customer_profile", None)
    if not address and profile is not None:
        address = getattr(profile, "default_address", "") or ""

    return {
        # PayTR karakter sınırları: name 60, address 400, phone 20.
        "user_name": full_name[:60],
        "user_address": (address or "Adres bildirilmedi")[:400],
        "user_phone": (phone or "0000000000")[:20],
        "email": user.email,
    }


def _reusable_transaction(**filters) -> PaymentTransaction | None:
    """Henüz geçerli token'ı olan bekleyen işlemi döndürür.

    Her "Öde" tıklamasında PayTR'ye yeni token isteği göndermemek için, aynı
    sipariş ve aynı tutar için alınmış ve süresi dolmamış token yeniden
    kullanılır. Süresi dolan ya da tutarı değişen işlem için yeni bir
    merchant_oid üretilir (PayTR tamamlanmış bir oid'in tekrar kullanılmasına
    izin vermez).
    """
    ttl = timedelta(minutes=settings.PAYTR_TOKEN_TTL_MINUTES)
    cutoff = timezone.now() - ttl
    return (
        PaymentTransaction.objects.filter(
            status=PaymentTransaction.Status.PENDING,
            token_created_at__gte=cutoff,
            **filters,
        )
        .exclude(iframe_token="")
        .order_by("-created_at")
        .first()
    )


def _start_payment(
    *,
    request,
    purpose: str,
    oid_prefix: str,
    amount: Decimal,
    basket: list[tuple[str, Decimal | str, int]],
    identity: dict,
    service_request: ServiceRequest | None = None,
    subscription_plan: str = "",
) -> PaymentTransaction:
    """İşlem kaydını oluşturur, token'ı alır ve kaydı günceller."""
    if amount is None or Decimal(amount) <= 0:
        raise PaymentNotAllowed("Ödenecek tutar hesaplanamadı.")

    reuse_filters = {"amount": amount, "purpose": purpose}
    if service_request is not None:
        reuse_filters["service_request"] = service_request
    else:
        reuse_filters["user"] = request.user
        reuse_filters["subscription_plan"] = subscription_plan

    existing = _reusable_transaction(**reuse_filters)
    if existing is not None:
        return existing

    config = paytr.get_config()
    txn = PaymentTransaction.objects.create(
        merchant_oid=paytr.generate_merchant_oid(oid_prefix),
        purpose=purpose,
        user=request.user,
        service_request=service_request,
        subscription_plan=subscription_plan,
        amount=amount,
        currency=config.currency,
        test_mode=config.test_mode,
    )

    # ok/fail sayfası, kullanıcının hangi işlemden döndüğünü bilsin diye
    # merchant_oid ile çağrılır. Sayfa bunu yalnızca sunucudan DOĞRULANMIŞ
    # durumu sormak için kullanır; kendisi ödeme kanıtı değildir.
    result = paytr.create_iframe_token(
        merchant_oid=txn.merchant_oid,
        amount=amount,
        user_ip=paytr.client_ip(request),
        basket=basket,
        ok_url=f"{config.merchant_ok_url}?oid={txn.merchant_oid}",
        fail_url=f"{config.merchant_fail_url}?oid={txn.merchant_oid}",
        **identity,
    )

    txn.iframe_token = result["token"]
    txn.token_created_at = timezone.now()
    txn.save(update_fields=["iframe_token", "token_created_at", "updated_at"])
    return txn


def start_service_request_payment(request, service_request: ServiceRequest) -> PaymentTransaction:
    """Müşterinin kendi hizmet talebi için kart ödemesi başlatır."""
    if service_request.status == ServiceRequest.Status.CANCELLED:
        raise PaymentNotAllowed("İptal edilmiş bir talep için ödeme başlatılamaz.")
    if service_request.payment_status == ServiceRequest.PaymentStatus.APPROVED:
        raise PaymentNotAllowed("Bu talebin ödemesi zaten onaylandı.")
    # Fiyat kesinleşmeden tahsilat yapılmaz (bkz. PAYABLE_REQUEST_STATUSES).
    if service_request.status not in PAYABLE_REQUEST_STATUSES:
        raise PaymentNotAllowed(
            "Ödeme, talebe bir sürücü atandıktan veya teklif kabul edildikten "
            "sonra alınabilir."
        )

    # Tutar DAİMA sunucudaki talep kaydından okunur (fiyat motoru ya da
    # müşterinin kabul ettiği teklif tarafından yazılmıştır).
    amount = Decimal(service_request.price or 0)
    if amount <= 0:
        raise PaymentNotAllowed("Talebin ücreti henüz belirlenmedi.")

    service_name = getattr(service_request.service_type, "name", "hizmet")
    return _start_payment(
        request=request,
        purpose=PaymentTransaction.Purpose.SERVICE_REQUEST,
        oid_prefix="SR",
        amount=amount,
        basket=[(f"Cekici hizmeti #{service_request.id} ({service_name})", amount, 1)],
        identity=_customer_identity(request.user, service_request),
        service_request=service_request,
    )


def start_subscription_payment(request, driver, plan: str) -> PaymentTransaction:
    """Sürücünün paket (abonelik) ödemesini başlatır."""
    from apps.drivers.models import PLAN_ALIASES, SUBSCRIPTION_PLANS

    plan = PLAN_ALIASES.get(plan, plan)
    spec = SUBSCRIPTION_PLANS.get(plan)
    if spec is None:
        raise PaymentNotAllowed("Geçerli bir paket seçin: three_day veya weekly.")

    # Fiyat sunucudaki sabit paket tablosundan gelir; istemci tutar gönderemez.
    amount = spec["amount"]
    return _start_payment(
        request=request,
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        oid_prefix="DS",
        amount=amount,
        basket=[(f"Surucu paketi - {spec['label']}", amount, 1)],
        identity=_customer_identity(request.user),
        subscription_plan=plan,
    )


# --------------------------------------------------------------------------- #
# 2. Adım — bildirim işleme
# --------------------------------------------------------------------------- #


def _sanitized_payload(payload: dict) -> dict:
    """Bildirimi denetim için saklar; imza alanı kayda yazılmaz."""
    return {key: value for key, value in payload.items() if key != "hash"}


def _apply_service_request_payment(txn: PaymentTransaction) -> None:
    """Onaylanmış kart ödemesini talebe işler."""
    service_request = txn.service_request
    if service_request is None:
        return

    service_request.payment_method = ServiceRequest.PaymentMethod.CARD
    service_request.payment_status = ServiceRequest.PaymentStatus.APPROVED
    service_request.save(update_fields=["payment_method", "payment_status", "updated_at"])

    # Mevcut nakit/kart özeti modeli de güncel kalsın.
    Payment.objects.update_or_create(
        service_request=service_request,
        defaults={
            "amount": txn.amount,
            "method": Payment.Method.CARD,
            "status": Payment.Status.PAID,
        },
    )

    Notification.objects.create(
        recipient_id=service_request.customer_id,
        title="Ödemeniz alındı",
        body=f"#{service_request.id} numaralı talebinizin {txn.amount} ₺ tutarındaki ödemesi onaylandı.",
        category=Notification.Category.PAYMENT,
    )


def _apply_subscription_payment(txn: PaymentTransaction) -> None:
    """Onaylanmış paket ödemesini sürücü aboneliğine işler."""
    from apps.drivers.models import PLAN_ALIASES, SUBSCRIPTION_PLANS, Driver, DriverSubscription
    from apps.drivers.views import activate_driver_subscription

    if txn.user_id is None:
        return

    # Plan adı tanınmıyorsa (ör. paket tablosu değişmiş, elle bozulmuş kayıt)
    # atomic blok içinde KeyError ile 500 dönmek PayTR'yi sonsuz tekrar
    # denemeye sokar. Ödemeyi kabul edip mutabakatı yöneticiye bırakıyoruz.
    if PLAN_ALIASES.get(txn.subscription_plan, txn.subscription_plan) not in SUBSCRIPTION_PLANS:
        logger.error(
            "PayTR: paket ödemesinin planı tanınmıyor (oid=%s, plan=%r)",
            txn.merchant_oid,
            txn.subscription_plan,
        )
        _notify_admins_manual_review(
            txn, "Ödeme alındı ancak paket planı tanınmadı; paketi elle tanımlayın."
        )
        return

    driver = Driver.objects.filter(user_id=txn.user_id).first()
    if driver is None:
        logger.error("PayTR: paket ödemesinin sürücü profili yok (oid=%s)", txn.merchant_oid)
        _notify_admins_manual_review(
            txn, "Ödeme alındı ancak ödeyen hesabın sürücü profili bulunamadı."
        )
        return

    expires_at = activate_driver_subscription(driver, txn.subscription_plan)
    subscription = DriverSubscription.objects.create(
        driver=driver,
        plan=driver.subscription_plan,
        amount=txn.amount,
        status=DriverSubscription.Status.ACTIVE,
        expires_at=expires_at,
    )
    txn.driver_subscription = subscription

    Notification.objects.create(
        recipient_id=txn.user_id,
        title="Paketiniz aktif",
        body=f"{txn.amount} ₺ ödemeniz alındı; paketiniz {expires_at:%d.%m.%Y %H:%M} tarihine kadar geçerli.",
        category=Notification.Category.PAYMENT,
    )


def _notify_admins_manual_review(txn: PaymentTransaction, message: str) -> None:
    """Otomatik işlenemeyen ödemeyi yöneticilerin mutabakat kuyruğuna düşürür."""
    admins = User.objects.filter(role=User.Role.ADMIN, is_active_account=True)
    Notification.objects.bulk_create(
        [
            Notification(
                recipient=admin,
                title="Ödeme manuel kontrol gerektiriyor",
                body=f"{txn.merchant_oid}: {message}",
                category=Notification.Category.PAYMENT,
            )
            for admin in admins
        ]
    )


def _notify_admins_mismatch(txn: PaymentTransaction, reported_kurus: int) -> None:
    admins = User.objects.filter(role=User.Role.ADMIN, is_active_account=True)
    Notification.objects.bulk_create(
        [
            Notification(
                recipient=admin,
                title="Ödeme tutarı uyuşmuyor",
                body=(
                    f"{txn.merchant_oid}: beklenen {paytr.to_kurus(txn.amount)} kuruş, "
                    f"bildirilen {reported_kurus} kuruş. İşlem onaylanmadı, "
                    "manuel mutabakat gerekiyor."
                ),
                category=Notification.Category.PAYMENT,
            )
            for admin in admins
        ]
    )


def process_callback(payload: dict) -> tuple[str, bool]:
    """PayTR bildirimini doğrular ve siparişi günceller.

    Dönüş: (PayTR'ye yazılacak gövde, işlem kabul edildi mi).

    Sıralama bilinçlidir: imza -> sipariş -> yinelenen kontrolü -> tutar.
    İmza geçerli değilse hiçbir sipariş alanına dokunulmaz.
    """
    try:
        signature_ok = paytr.verify_callback_hash(payload)
    except paytr.PayTRNotConfigured:
        # Mağaza sırları tanımsızken imza DOĞRULANAMAZ. Bildirim ucu kimlik
        # doğrulaması olmadan dışarıya açık olduğu için bu durum 500 ile
        # patlamamalı: kontrollü bir hata gövdesi döneriz. "OK" DÖNÜLMEZ —
        # aksi halde PayTR siparişi tamamlanmış sayar, oysa biz onu hiç
        # doğrulayamadık.
        logger.error(
            "PayTR bildirimi işlenemedi: mağaza bilgileri tanımlı değil (oid=%s)",
            payload.get("merchant_oid"),
        )
        return RESPONSE_NOT_CONFIGURED, False

    if not signature_ok:
        logger.warning(
            "PayTR bildirimi reddedildi: imza geçersiz (oid=%s)",
            payload.get("merchant_oid"),
        )
        return RESPONSE_BAD_HASH, False

    merchant_oid = payload["merchant_oid"]
    reported_status = payload.get("status")
    now = timezone.now()

    with transaction.atomic():
        txn = (
            PaymentTransaction.objects.select_for_update()
            .filter(merchant_oid=merchant_oid)
            .first()
        )
        if txn is None:
            # İmza doğru ama sipariş bizde yok: OK dönmek ödemeyi sessizce
            # kaybetmek olurdu. Hata dönerek PayTR panelinde iz bırakıyoruz.
            logger.error("PayTR bildirimi: bilinmeyen sipariş (oid=%s)", merchant_oid)
            return RESPONSE_UNKNOWN_ORDER, False

        # --- Yinelenen bildirim ---
        # PayTR ağ sorunlarında aynı bildirimi tekrar gönderebilir. Kayıt
        # kesinleşmişse hiçbir şey yapmadan OK dönülür; hizmet/paket ikinci
        # kez tanımlanmaz.
        if txn.is_final:
            logger.info(
                "PayTR bildirimi yinelenen, atlandı (oid=%s, durum=%s)",
                merchant_oid,
                txn.status,
            )
            return RESPONSE_OK, True

        txn.callback_payload = _sanitized_payload(payload)
        txn.notified_at = now
        txn.payment_type = str(payload.get("payment_type", ""))[:20]
        installment = payload.get("installment_count")
        if installment not in (None, ""):
            try:
                txn.installment_count = int(installment)
            except (TypeError, ValueError):
                txn.installment_count = None

        total_amount = payload.get("total_amount")
        if total_amount not in (None, ""):
            txn.total_amount = Decimal(str(total_amount)) / 100

        if reported_status != "success":
            txn.status = PaymentTransaction.Status.FAILED
            txn.failed_reason_code = str(payload.get("failed_reason_code", ""))[:10]
            txn.failed_reason_msg = str(payload.get("failed_reason_msg", ""))[:255]
            txn.save()
            # Sipariş/paket durumuna DOKUNULMAZ: ödenmemiş olarak kalır.
            logger.info(
                "PayTR ödeme başarısız (oid=%s, kod=%s)", merchant_oid, txn.failed_reason_code
            )
            return RESPONSE_OK, True

        # --- Tutar doğrulaması ---
        # Karşılaştırma `payment_amount` (1. Adım tutarı) ile yapılır;
        # `total_amount` taksit/vade farkıyla daha yüksek olabilir.
        expected_kurus = paytr.to_kurus(txn.amount)
        reported_kurus = payload.get("payment_amount", payload.get("total_amount"))
        try:
            reported_kurus = int(reported_kurus)
        except (TypeError, ValueError):
            reported_kurus = -1

        if reported_kurus != expected_kurus:
            # Kayıt `mismatch` ile KESİNLEŞİR: ilk bildirime hata gövdesi
            # döndüğümüz için PayTR panelinde iz kalır, olası tekrar denemede
            # ise yukarıdaki yinelenen kontrolü "OK" döndürüp döngüyü bitirir.
            # Sipariş hiçbir koşulda onaylanmaz; mutabakat yöneticiye kalır.
            txn.status = PaymentTransaction.Status.MISMATCH
            txn.failed_reason_msg = (
                f"Tutar uyuşmazlığı: beklenen {expected_kurus}, gelen {reported_kurus}"
            )
            txn.save()
            logger.error(
                "PayTR tutar uyuşmazlığı (oid=%s): beklenen %s, gelen %s",
                merchant_oid,
                expected_kurus,
                reported_kurus,
            )
            _notify_admins_mismatch(txn, reported_kurus)
            return RESPONSE_AMOUNT_MISMATCH, False

        currency = payload.get("currency")
        if currency and currency != txn.currency:
            txn.status = PaymentTransaction.Status.MISMATCH
            txn.failed_reason_msg = f"Para birimi uyuşmazlığı: {currency} != {txn.currency}"
            txn.save()
            logger.error(
                "PayTR para birimi uyuşmazlığı (oid=%s): %s != %s",
                merchant_oid,
                currency,
                txn.currency,
            )
            return RESPONSE_AMOUNT_MISMATCH, False

        # --- Başarılı ---
        txn.status = PaymentTransaction.Status.PAID
        txn.paid_at = now
        if txn.purpose == PaymentTransaction.Purpose.SERVICE_REQUEST:
            _apply_service_request_payment(txn)
        elif txn.purpose == PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION:
            _apply_subscription_payment(txn)
        txn.save()

    # WebSocket yayını transaction dışında: commit edilmemiş veriyi yayınlamamak
    # ve kanal hatasının ödemeyi geri almaması için.
    if txn.purpose == PaymentTransaction.Purpose.SERVICE_REQUEST and txn.service_request_id:
        from apps.requests.services import broadcast_request_update

        txn.service_request.refresh_from_db()
        try:
            broadcast_request_update(txn.service_request)
        except Exception:  # pragma: no cover - kanal katmanı erişilemezse
            logger.exception("PayTR: talep güncellemesi yayınlanamadı (oid=%s)", merchant_oid)

    logger.info("PayTR ödeme onaylandı (oid=%s, tutar=%s)", merchant_oid, txn.amount)
    return RESPONSE_OK, True
