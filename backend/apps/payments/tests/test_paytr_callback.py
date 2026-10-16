"""2. Adım testleri: bildirim doğrulaması, sipariş güncelleme, idempotency.

Hepsi gerçek PayTR sunucusuna erişmeden çalışır; bildirimler resmî imza
algoritmasıyla testin içinde üretilir.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.test import Client
from django.utils import timezone

from apps.drivers.models import Driver, DriverSubscription
from apps.notifications.models import Notification
from apps.payments.models import Payment, PaymentTransaction
from apps.requests.models import ServiceRequest

from .conftest import api_client, callback_hash, callback_payload

CALLBACK_URL = "/api/payments/paytr/callback/"

pytestmark = pytest.mark.django_db


def post_callback(payload):
    """PayTR gibi davranır: oturumsuz, CSRF token'ı olmayan form POST'u.

    `enforce_csrf_checks=True`, callback ucundaki CSRF istisnasının gerçekten
    çalıştığını kanıtlar.
    """
    client = Client(enforce_csrf_checks=True)
    return client.post(CALLBACK_URL, data=payload)


def make_transaction(**kwargs):
    defaults = dict(
        merchant_oid="SRtest0000000000001",
        purpose=PaymentTransaction.Purpose.SERVICE_REQUEST,
        amount=Decimal("1250.50"),
        currency="TL",
        iframe_token="tkn",
        token_created_at=timezone.now(),
    )
    defaults.update(kwargs)
    return PaymentTransaction.objects.create(**defaults)


# --------------------------------------------------------------------------- #
# Başarılı bildirim
# --------------------------------------------------------------------------- #


def test_successful_callback_marks_paid_and_approves_order(
    paytr_config, customer, service_request
):
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)

    response = post_callback(payload)

    # PayTR gövdede yalnızca "OK" bekler.
    assert response.status_code == 200
    assert response.content.decode().strip() == "OK"

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID
    assert txn.paid_at is not None
    assert txn.payment_type == "card"
    assert txn.total_amount == Decimal("1250.50")

    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.APPROVED
    assert service_request.payment_method == ServiceRequest.PaymentMethod.CARD

    # Mevcut nakit/kart özeti modeli de güncellenir.
    payment = Payment.objects.get(service_request=service_request)
    assert payment.method == Payment.Method.CARD
    assert payment.status == Payment.Status.PAID
    assert payment.amount == Decimal("1250.50")

    assert Notification.objects.filter(
        recipient=customer, category=Notification.Category.PAYMENT
    ).exists()


def test_callback_hash_is_not_stored_in_audit_payload(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    post_callback(callback_payload(txn.merchant_oid, "success", 125050))

    txn.refresh_from_db()
    assert "hash" not in txn.callback_payload
    assert txn.callback_payload["merchant_oid"] == txn.merchant_oid


def test_installment_payment_with_higher_total_amount_is_accepted(
    paytr_config, customer, service_request
):
    """total_amount, taksit/vade farkıyla payment_amount'tan yüksek olabilir.

    Doğrulama 1. Adım tutarı (payment_amount) ile yapılır.
    """
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(
        txn.merchant_oid, "success", 125050, total_amount="131000", installment_count="3"
    )

    response = post_callback(payload)
    assert response.content.decode().strip() == "OK"

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID
    assert txn.installment_count == 3
    assert txn.total_amount == Decimal("1310.00")


# --------------------------------------------------------------------------- #
# Geçersiz imza
# --------------------------------------------------------------------------- #


def test_invalid_hash_does_not_change_order(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)
    payload["hash"] = "bu-imza-gecersiz"

    response = post_callback(payload)

    assert response.status_code == 200
    assert "OK" != response.content.decode().strip()
    assert "bad hash" in response.content.decode()

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PENDING
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID
    assert Payment.objects.count() == 0


def test_forged_amount_with_stale_hash_is_rejected(paytr_config, customer, service_request):
    """Saldırgan tutarı büyütüp eski imzayı tekrar kullanamaz."""
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)
    payload["total_amount"] = "999999"  # imza eski tutara göre üretildi

    response = post_callback(payload)
    assert "bad hash" in response.content.decode()

    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID


def test_missing_hash_field_is_rejected(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)
    payload.pop("hash")

    response = post_callback(payload)
    assert "bad hash" in response.content.decode()
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PENDING


def test_hash_signed_with_wrong_salt_is_rejected(paytr_config, customer, service_request):
    """Anahtarı/salt'ı bilmeyen biri geçerli bildirim üretemez."""
    import base64
    import hashlib
    import hmac

    txn = make_transaction(user=customer, service_request=service_request)
    forged = base64.b64encode(
        hmac.new(
            b"yanlis-anahtar",
            f"{txn.merchant_oid}yanlis-saltsuccess125050".encode(),
            hashlib.sha256,
        ).digest()
    ).decode()

    response = post_callback(
        {
            "merchant_oid": txn.merchant_oid,
            "status": "success",
            "total_amount": "125050",
            "payment_amount": "125050",
            "hash": forged,
        }
    )
    assert "bad hash" in response.content.decode()
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID


# --------------------------------------------------------------------------- #
# Tutar uyuşmazlığı
# --------------------------------------------------------------------------- #


def test_amount_mismatch_is_rejected_even_with_valid_hash(
    paytr_config, customer, service_request, admin_user
):
    """İmza doğru ama tahsil edilen tutar siparişle uyuşmuyorsa onaylanmaz."""
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 100)  # 1,00 TL

    response = post_callback(payload)

    assert response.status_code == 200
    assert "amount mismatch" in response.content.decode()

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.MISMATCH
    assert txn.paid_at is None

    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID
    assert Payment.objects.count() == 0

    # Yöneticiye manuel mutabakat bildirimi düşer.
    assert Notification.objects.filter(
        recipient=admin_user, category=Notification.Category.PAYMENT
    ).exists()


def test_currency_mismatch_is_rejected(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050, currency="USD")

    response = post_callback(payload)
    assert "amount mismatch" in response.content.decode()

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.MISMATCH
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID


# --------------------------------------------------------------------------- #
# Başarısız ödeme
# --------------------------------------------------------------------------- #


def test_failed_callback_keeps_order_unpaid(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(
        txn.merchant_oid,
        "failed",
        125050,
        failed_reason_code="6",
        failed_reason_msg="Musteri odemeyi tamamlamadi",
    )

    response = post_callback(payload)

    # Başarısız ödeme de geçerli bir bildirimdir: PayTR "OK" bekler.
    assert response.content.decode().strip() == "OK"

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.FAILED
    assert txn.failed_reason_code == "6"
    assert txn.failed_reason_msg == "Musteri odemeyi tamamlamadi"

    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID
    assert Payment.objects.count() == 0


def test_failed_then_success_for_same_order_number_is_ignored(
    paytr_config, customer, service_request
):
    """Başarısız bildirim kaydı kesinleştirir; aynı oid sonradan onaylanamaz."""
    txn = make_transaction(user=customer, service_request=service_request)
    post_callback(callback_payload(txn.merchant_oid, "failed", 125050, failed_reason_code="3"))
    response = post_callback(callback_payload(txn.merchant_oid, "success", 125050))

    assert response.content.decode().strip() == "OK"
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.FAILED
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID


# --------------------------------------------------------------------------- #
# Yinelenen bildirim (idempotency)
# --------------------------------------------------------------------------- #


def test_duplicate_success_callback_is_idempotent(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)

    first = post_callback(payload)
    second = post_callback(payload)
    third = post_callback(payload)

    for response in (first, second, third):
        assert response.content.decode().strip() == "OK"

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID
    paid_at = txn.paid_at

    # Tek ödeme kaydı, tek bildirim; zaman damgası değişmedi.
    assert Payment.objects.filter(service_request=service_request).count() == 1
    assert (
        Notification.objects.filter(
            recipient=customer, category=Notification.Category.PAYMENT
        ).count()
        == 1
    )
    txn.refresh_from_db()
    assert txn.paid_at == paid_at


def test_duplicate_callback_cannot_reopen_cancelled_order(
    paytr_config, customer, service_request
):
    """Sipariş sonradan iptal edildiyse yinelenen bildirim onu geri açmaz."""
    txn = make_transaction(user=customer, service_request=service_request)
    post_callback(callback_payload(txn.merchant_oid, "success", 125050))

    service_request.refresh_from_db()
    service_request.status = ServiceRequest.Status.CANCELLED
    service_request.payment_status = ServiceRequest.PaymentStatus.REJECTED
    service_request.save(update_fields=["status", "payment_status"])

    post_callback(callback_payload(txn.merchant_oid, "success", 125050))

    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.CANCELLED
    assert service_request.payment_status == ServiceRequest.PaymentStatus.REJECTED


# --------------------------------------------------------------------------- #
# Bilinmeyen sipariş
# --------------------------------------------------------------------------- #


def test_unknown_order_number_is_not_accepted(paytr_config):
    response = post_callback(callback_payload("SRbilinmeyen999", "success", 10000))

    assert response.status_code == 200
    assert "order not found" in response.content.decode()
    assert PaymentTransaction.objects.count() == 0


# --------------------------------------------------------------------------- #
# Paket (abonelik) ödemesi
# --------------------------------------------------------------------------- #


def test_subscription_callback_activates_plan_once(paytr_config, driver_user):
    txn = make_transaction(
        merchant_oid="DStest0000000000001",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=driver_user,
        subscription_plan="three_day",
        amount=Decimal("450.00"),
        service_request=None,
    )
    payload = callback_payload(txn.merchant_oid, "success", 45000)

    response = post_callback(payload)
    assert response.content.decode().strip() == "OK"

    driver = Driver.objects.get(user=driver_user)
    assert driver.has_active_subscription() is True
    assert driver.subscription_status == Driver.SubscriptionStatus.ACTIVE
    assert driver.subscription_plan == "three_day"
    first_expiry = driver.subscription_expires_at
    assert first_expiry > timezone.now() + timedelta(hours=71)
    assert first_expiry < timezone.now() + timedelta(hours=73)

    subscription = DriverSubscription.objects.get(driver=driver)
    assert subscription.status == DriverSubscription.Status.ACTIVE
    assert subscription.amount == Decimal("450.00")

    txn.refresh_from_db()
    assert txn.driver_subscription_id == subscription.id


def test_duplicate_subscription_callback_does_not_extend_twice(paytr_config, driver_user):
    """Yinelenen bildirim paketi ikinci kez uzatmamalı."""
    txn = make_transaction(
        merchant_oid="DStest0000000000002",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=driver_user,
        subscription_plan="weekly",
        amount=Decimal("800.00"),
        service_request=None,
    )
    payload = callback_payload(txn.merchant_oid, "success", 80000)

    post_callback(payload)
    driver = Driver.objects.get(user=driver_user)
    first_expiry = driver.subscription_expires_at

    post_callback(payload)
    post_callback(payload)

    driver.refresh_from_db()
    assert driver.subscription_expires_at == first_expiry
    assert DriverSubscription.objects.filter(driver=driver).count() == 1


def test_failed_subscription_callback_does_not_activate_plan(paytr_config, driver_user):
    txn = make_transaction(
        merchant_oid="DStest0000000000003",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=driver_user,
        subscription_plan="three_day",
        amount=Decimal("450.00"),
        service_request=None,
    )
    post_callback(
        callback_payload(txn.merchant_oid, "failed", 45000, failed_reason_code="10")
    )

    driver = Driver.objects.get(user=driver_user)
    assert driver.has_active_subscription() is False
    assert DriverSubscription.objects.count() == 0


def test_subscription_callback_extends_existing_active_package(paytr_config, driver_user):
    """Aktif paketin üstüne satın alınan süre, kalan sürenin sonuna eklenir."""
    driver = Driver.objects.get(user=driver_user)
    driver.subscription_status = Driver.SubscriptionStatus.ACTIVE
    driver.subscription_plan = "three_day"
    existing_expiry = timezone.now() + timedelta(hours=24)
    driver.subscription_expires_at = existing_expiry
    driver.save()

    txn = make_transaction(
        merchant_oid="DStest0000000000004",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=driver_user,
        subscription_plan="three_day",
        amount=Decimal("450.00"),
        service_request=None,
    )
    post_callback(callback_payload(txn.merchant_oid, "success", 45000))

    driver.refresh_from_db()
    assert driver.subscription_expires_at > existing_expiry + timedelta(hours=71)


# --------------------------------------------------------------------------- #
# Uç davranışı
# --------------------------------------------------------------------------- #


def test_callback_requires_no_authentication_and_bypasses_csrf(
    paytr_config, customer, service_request
):
    """PayTR oturum açamaz ve CSRF token'ı gönderemez."""
    txn = make_transaction(user=customer, service_request=service_request)
    response = post_callback(callback_payload(txn.merchant_oid, "success", 125050))

    assert response.status_code == 200  # 401/403 DEĞİL
    assert response.content.decode().strip() == "OK"


def test_callback_is_not_throttled(paytr_config, customer, service_request):
    """Bildirim ucu throttle dışında: yoğun anda ödeme bildirimi kaybolmamalı.

    DRF AnonRateThrottle varsayılanı 60/dk; buradaki 70 istek throttle açık
    olsaydı 429 görürdü.
    """
    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)

    statuses = {post_callback(payload).status_code for _ in range(70)}
    assert statuses == {200}


def test_callback_rejects_get(paytr_config):
    client = Client()
    assert client.get(CALLBACK_URL).status_code == 405


# --------------------------------------------------------------------------- #
# Durum sorgulama ucu
# --------------------------------------------------------------------------- #


def test_status_endpoint_is_limited_to_owner_and_admin(
    paytr_config, customer, service_request, admin_user, driver_user
):
    txn = make_transaction(user=customer, service_request=service_request)
    url = f"/api/payments/paytr/transactions/{txn.merchant_oid}/"

    owner = api_client(customer).get(url)
    assert owner.status_code == 200
    assert owner.data["status"] == "pending"
    # Token ve ham bildirim gövdesi dışarı verilmez.
    assert "iframe_token" not in owner.data
    assert "callback_payload" not in owner.data

    assert api_client(admin_user).get(url).status_code == 200
    # Sipariş numarasını bilen başka bir kullanıcı işlemi göremez.
    assert api_client(driver_user).get(url).status_code == 404
    assert api_client().get(url).status_code == 401


def test_status_endpoint_reflects_verified_payment(paytr_config, customer, service_request):
    txn = make_transaction(user=customer, service_request=service_request)
    post_callback(callback_payload(txn.merchant_oid, "success", 125050))

    response = api_client(customer).get(
        f"/api/payments/paytr/transactions/{txn.merchant_oid}/"
    )
    assert response.data["status"] == "paid"
    assert Decimal(response.data["amount"]) == Decimal("1250.50")


def test_admin_transaction_list_is_admin_only(
    paytr_config, customer, service_request, admin_user
):
    make_transaction(user=customer, service_request=service_request)
    url = "/api/admin/payment-transactions/"

    assert api_client(admin_user).get(url).status_code == 200
    assert api_client(admin_user).get(url).data["count"] == 1
    assert api_client(customer).get(url).status_code == 403


def test_hash_verification_runs_before_order_lookup(paytr_config, customer, service_request):
    """Geçersiz imzalı bildirim, var olmayan siparişi bile sorgulamadan reddedilir."""
    response = post_callback(
        {
            "merchant_oid": "SRbilinmeyen999",
            "status": "success",
            "total_amount": "100",
            "payment_amount": "100",
            "hash": "gecersiz",
        }
    )
    assert "bad hash" in response.content.decode()
    assert "order not found" not in response.content.decode()


def test_valid_hash_for_other_amount_field_combination(paytr_config, customer, service_request):
    """payment_amount alanı yoksa total_amount'a düşülür (geriye dönük güvenlik)."""
    txn = make_transaction(user=customer, service_request=service_request)
    payload = {
        "merchant_oid": txn.merchant_oid,
        "status": "success",
        "total_amount": "125050",
        "hash": callback_hash(txn.merchant_oid, "success", "125050"),
    }
    response = post_callback(payload)
    assert response.content.decode().strip() == "OK"
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID


def test_unknown_plan_is_accepted_but_left_for_manual_review(
    paytr_config, driver_user, admin_user
):
    """Tanınmayan plan 500 ile PayTR'yi tekrar denemeye sokmamalı."""
    txn = make_transaction(
        merchant_oid="DStest0000000000005",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=driver_user,
        subscription_plan="monthly",  # paket tablosunda yok
        amount=Decimal("450.00"),
        service_request=None,
    )
    response = post_callback(callback_payload(txn.merchant_oid, "success", 45000))

    assert response.status_code == 200
    assert response.content.decode().strip() == "OK"

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID

    # Paket açılmadı; mutabakat yöneticiye bırakıldı.
    driver = Driver.objects.get(user=driver_user)
    assert driver.has_active_subscription() is False
    assert DriverSubscription.objects.count() == 0
    assert Notification.objects.filter(
        recipient=admin_user, title="Ödeme manuel kontrol gerektiriyor"
    ).exists()


def test_subscription_payment_without_driver_profile_is_flagged(
    paytr_config, customer, admin_user
):
    """Sürücü profili silinmiş hesabın ödemesi sessizce kaybolmamalı."""
    txn = make_transaction(
        merchant_oid="DStest0000000000006",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=customer,  # sürücü profili yok
        subscription_plan="three_day",
        amount=Decimal("450.00"),
        service_request=None,
    )
    response = post_callback(callback_payload(txn.merchant_oid, "success", 45000))

    assert response.content.decode().strip() == "OK"
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID
    assert DriverSubscription.objects.count() == 0
    assert Notification.objects.filter(
        recipient=admin_user, title="Ödeme manuel kontrol gerektiriyor"
    ).exists()


# --------------------------------------------------------------------------- #
# Yönetici mutabakat ucu
# --------------------------------------------------------------------------- #


def test_admin_transaction_list_filters_by_status_and_purpose(
    paytr_config, customer, driver_user, service_request, admin_user
):
    make_transaction(user=customer, service_request=service_request)
    paid = make_transaction(
        merchant_oid="SRtest0000000000009", user=customer, service_request=service_request
    )
    post_callback(callback_payload(paid.merchant_oid, "success", 125050))
    make_transaction(
        merchant_oid="DStest0000000000009",
        purpose=PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION,
        user=driver_user,
        subscription_plan="weekly",
        amount=Decimal("800.00"),
        service_request=None,
    )

    client = api_client(admin_user)
    assert client.get("/api/admin/payment-transactions/").data["count"] == 3
    assert client.get("/api/admin/payment-transactions/", {"status": "paid"}).data["count"] == 1
    assert client.get("/api/admin/payment-transactions/", {"status": "pending"}).data["count"] == 2
    assert (
        client.get(
            "/api/admin/payment-transactions/", {"purpose": "driver_subscription"}
        ).data["count"]
        == 1
    )
    # Sipariş numarasıyla arama
    found = client.get("/api/admin/payment-transactions/", {"search": "DStest0000000000009"})
    assert found.data["count"] == 1


def test_admin_cannot_mark_a_payment_as_paid_by_hand(
    paytr_config, customer, service_request, admin_user
):
    """Mutabakat ucu SALT-OKUNUR: ödeme durumu yalnızca imzalı bildirimle değişir."""
    txn = make_transaction(user=customer, service_request=service_request)
    client = api_client(admin_user)
    detail = f"/api/admin/payment-transactions/{txn.id}/"

    assert client.post("/api/admin/payment-transactions/", {"status": "paid"}).status_code == 405
    assert client.patch(detail, {"status": "paid"}).status_code == 405
    assert client.put(detail, {"status": "paid"}).status_code == 405
    assert client.delete(detail).status_code == 405

    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PENDING
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID


# --------------------------------------------------------------------------- #
# Yapılandırma eksikken bildirim ucu
# --------------------------------------------------------------------------- #


def test_callback_without_credentials_fails_cleanly_not_with_500(customer, service_request):
    """Mağaza sırları tanımsızken bildirim ucu 500 ile patlamamalı.

    Regresyon: `verify_callback_hash` -> `require_config()` PayTRNotConfigured
    fırlatıyordu ve bu, kimlik doğrulaması olmayan dışa açık uçta HTTP 500
    üretiyordu (staging dağıtımında yakalandı). Beklenen davranış: kontrollü
    hata gövdesi, HTTP 200 ve "OK" DEĞİL.
    """
    from django.test import override_settings

    with override_settings(
        PAYTR_MERCHANT_ID="", PAYTR_MERCHANT_KEY="", PAYTR_MERCHANT_SALT=""
    ):
        txn = make_transaction(user=customer, service_request=service_request)
        response = post_callback(
            {
                "merchant_oid": txn.merchant_oid,
                "status": "success",
                "total_amount": "125050",
                "payment_amount": "125050",
                "hash": "herhangi",
            }
        )

    assert response.status_code == 200
    body = response.content.decode().strip()
    assert body != "OK", "Doğrulanamayan bildirime OK dönülmemeli"
    assert "not configured" in body

    # Sipariş hiçbir şekilde etkilenmemeli.
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PENDING
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID
    assert Payment.objects.count() == 0


# --------------------------------------------------------------------------- #
# ACK yalnızca veritabanı işlemi başarıyla tamamlanınca verilir
# --------------------------------------------------------------------------- #


def test_no_ack_when_database_work_fails(paytr_config, customer, service_request):
    """Sipariş güncellemesi başarısız olursa PayTR'ye "OK" DÖNÜLMEZ.

    PayTR "OK" yanıtını siparişin tamamlandığının kanıtı sayar ve bir daha
    bildirim göndermez. Bu yüzden ACK, veritabanı işlemi commit edilmeden
    verilmemelidir; aksi halde para tahsil edilmişken sipariş sessizce
    ödenmemiş kalır ve tekrar denenmez.

    Burada sipariş güncelleme adımını patlatıyoruz ve şunu doğruluyoruz:
      1. yanıt "OK" DEĞİL,
      2. işlem `paid` olarak KALMIYOR (atomic blok geri alınıyor),
      3. yani PayTR tekrar deneyebilir.
    """
    from unittest.mock import patch

    txn = make_transaction(user=customer, service_request=service_request)
    payload = callback_payload(txn.merchant_oid, "success", 125050)

    with patch(
        "apps.payments.services._apply_service_request_payment",
        side_effect=RuntimeError("veritabanı hatası"),
    ):
        try:
            response = post_callback(payload)
            body = response.content.decode().strip()
        except RuntimeError:
            # Django test istemcisi istisnayı yeniden fırlatabilir; bu da
            # kabul edilebilir davranıştır: 500 döner, ACK verilmez.
            body = "<500>"

    assert body != "OK", "Veritabanı işlemi başarısızken ACK verilmemeli"

    # Atomic blok geri alındığı için işlem kesinleşmemiş olmalı.
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PENDING
    assert txn.paid_at is None

    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID
    assert Payment.objects.count() == 0

    # Geri alma sonrası AYNI bildirim yeniden işlenebilmeli (PayTR tekrar dener).
    retry = post_callback(payload)
    assert retry.content.decode().strip() == "OK"
    txn.refresh_from_db()
    assert txn.status == PaymentTransaction.Status.PAID
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.APPROVED
