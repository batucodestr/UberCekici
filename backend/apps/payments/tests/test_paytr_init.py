"""Ödeme başlatma uçlarının testleri: yetki, tutar bütünlüğü, iş kuralları."""

import json
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone

from apps.drivers.models import Driver, DriverSubscription
from apps.payments.models import PaymentTransaction
from apps.requests.models import ServiceRequest

from .conftest import api_client

User = get_user_model()

pytestmark = pytest.mark.django_db


def _init_url(request_id):
    return f"/api/payments/paytr/requests/{request_id}/init/"


SUBSCRIPTION_URL = "/api/payments/paytr/subscription/init/"


def test_init_creates_pending_transaction_with_server_price(
    paytr_config, mock_token_request, customer, service_request
):
    response = api_client(customer).post(_init_url(service_request.id))

    assert response.status_code == 201
    assert response.data["iframe_token"] == "test-iframe-token"
    assert response.data["iframe_url"] == (
        "https://www.paytr.com/odeme/guvenli/test-iframe-token"
    )
    assert response.data["payment_page_path"] == "/odeme/test-iframe-token"
    assert Decimal(response.data["amount"]) == Decimal("1250.50")

    txn = PaymentTransaction.objects.get(merchant_oid=response.data["merchant_oid"])
    assert txn.status == PaymentTransaction.Status.PENDING
    assert txn.purpose == PaymentTransaction.Purpose.SERVICE_REQUEST
    assert txn.service_request_id == service_request.id
    assert txn.user_id == customer.id
    assert txn.amount == Decimal("1250.50")

    # Ödeme henüz onaylanmadı: talep hâlâ ödenmemiş durumda olmalı.
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.UNPAID


def test_client_cannot_override_amount(
    paytr_config, mock_token_request, customer, service_request
):
    """İstemci tutar/sepet göndermeye çalışsa bile sunucu fiyatı kullanılır."""
    response = api_client(customer).post(
        _init_url(service_request.id),
        {"amount": "1.00", "payment_amount": 100, "price": "1.00", "total_amount": "1.00"},
        format="json",
    )
    assert response.status_code == 201

    sent = mock_token_request.call_args.kwargs["data"]
    assert sent["payment_amount"] == 125050  # 1250.50 TL, istemcinin 1.00'ı değil

    basket = json.loads(__import__("base64").b64decode(sent["user_basket"]).decode())
    assert basket[0][1] == "1250.50"

    txn = PaymentTransaction.objects.get(merchant_oid=response.data["merchant_oid"])
    assert txn.amount == Decimal("1250.50")


def test_init_sends_mandatory_paytr_fields(
    paytr_config, mock_token_request, customer, service_request
):
    api_client(customer).post(_init_url(service_request.id))
    sent = mock_token_request.call_args.kwargs["data"]

    assert sent["merchant_id"] == "123456"
    assert sent["email"] == customer.email
    assert sent["currency"] == "TL"
    assert sent["test_mode"] == 1
    assert sent["user_name"]
    assert sent["user_address"]
    assert sent["user_phone"]
    # ok/fail adresleri işlemin merchant_oid'si ile çağrılır.
    oid = sent["merchant_oid"]
    assert sent["merchant_ok_url"] == f"https://example.test/odeme/basarili?oid={oid}"
    assert sent["merchant_fail_url"] == f"https://example.test/odeme/basarisiz?oid={oid}"


def test_foreign_customer_cannot_start_payment_for_another_order(
    paytr_config, mock_token_request, service_request
):
    """Sipariş numarası tahmin edilse bile başkasının talebi ödenemez."""
    stranger = User.objects.create_user(
        username="paytr_other",
        email="paytr_other@test.local",
        password="x",
        role=User.Role.CUSTOMER,
    )
    response = api_client(stranger).post(_init_url(service_request.id))
    assert response.status_code == 404
    assert PaymentTransaction.objects.count() == 0
    mock_token_request.assert_not_called()


def test_anonymous_and_driver_cannot_start_service_payment(
    paytr_config, mock_token_request, service_request, driver_user
):
    assert api_client().post(_init_url(service_request.id)).status_code == 401
    assert api_client(driver_user).post(_init_url(service_request.id)).status_code == 403
    mock_token_request.assert_not_called()


def test_cancelled_request_cannot_be_paid(
    paytr_config, mock_token_request, customer, service_request
):
    service_request.status = ServiceRequest.Status.CANCELLED
    service_request.save(update_fields=["status"])

    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 400
    assert "İptal" in response.data["detail"]
    mock_token_request.assert_not_called()


def test_already_approved_request_cannot_be_paid_again(
    paytr_config, mock_token_request, customer, service_request
):
    service_request.payment_status = ServiceRequest.PaymentStatus.APPROVED
    service_request.save(update_fields=["payment_status"])

    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 400
    mock_token_request.assert_not_called()


def test_zero_price_request_cannot_be_paid(
    paytr_config, mock_token_request, customer, service_request
):
    service_request.price = Decimal("0")
    service_request.save(update_fields=["price"])

    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 400
    mock_token_request.assert_not_called()


def test_repeated_init_reuses_valid_token_instead_of_new_order_number(
    paytr_config, mock_token_request, customer, service_request
):
    """Aynı talep için ikinci kez 'Öde'ye basmak PayTR'ye yeni istek atmaz."""
    first = api_client(customer).post(_init_url(service_request.id))
    second = api_client(customer).post(_init_url(service_request.id))

    assert first.data["merchant_oid"] == second.data["merchant_oid"]
    assert mock_token_request.call_count == 1
    assert PaymentTransaction.objects.count() == 1


def test_expired_token_creates_new_order_number(
    paytr_config, mock_token_request, customer, service_request
):
    """Token süresi geçtiyse yeni merchant_oid üretilir.

    PayTR, tamamlanmış/zaman aşımına uğramış bir merchant_oid'nin tekrar
    kullanılmasına izin vermez.
    """
    from django.utils import timezone
    from datetime import timedelta

    first = api_client(customer).post(_init_url(service_request.id))
    txn = PaymentTransaction.objects.get()
    txn.token_created_at = timezone.now() - timedelta(hours=2)
    txn.save(update_fields=["token_created_at"])

    second = api_client(customer).post(_init_url(service_request.id))
    assert second.data["merchant_oid"] != first.data["merchant_oid"]
    assert mock_token_request.call_count == 2
    assert PaymentTransaction.objects.count() == 2


def test_missing_credentials_return_503_without_leaking_configuration(
    mock_token_request, customer, service_request
):
    with override_settings(PAYTR_MERCHANT_ID="", PAYTR_MERCHANT_KEY="", PAYTR_MERCHANT_SALT=""):
        response = api_client(customer).post(_init_url(service_request.id))

    assert response.status_code == 503
    detail = response.data["detail"]
    for secret in ("merchant_key", "merchant_salt", "PAYTR_MERCHANT_KEY"):
        assert secret not in detail
    mock_token_request.assert_not_called()


def test_paytr_rejection_returns_502(paytr_config, mock_token_request, customer, service_request):
    from .conftest import FakeTokenResponse

    mock_token_request.return_value = FakeTokenResponse(
        {"status": "failed", "reason": "magaza kapali"}
    )
    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 502
    assert PaymentTransaction.objects.get().status == PaymentTransaction.Status.PENDING


# --------------------------------------------------------------------------- #
# Sürücü paketi ödemesi
# --------------------------------------------------------------------------- #


def test_subscription_init_uses_fixed_plan_price(paytr_config, mock_token_request, driver_user):
    response = api_client(driver_user).post(
        SUBSCRIPTION_URL, {"plan": "three_day", "amount": "1.00"}, format="json"
    )
    assert response.status_code == 201
    assert Decimal(response.data["amount"]) == Decimal("450.00")
    assert mock_token_request.call_args.kwargs["data"]["payment_amount"] == 45000

    txn = PaymentTransaction.objects.get()
    assert txn.purpose == PaymentTransaction.Purpose.DRIVER_SUBSCRIPTION
    assert txn.subscription_plan == "three_day"
    assert txn.amount == Decimal("450.00")

    # Ödeme onaylanmadan paket açılmamalı ve abonelik kaydı oluşmamalı.
    driver = Driver.objects.get(user=driver_user)
    assert driver.has_active_subscription() is False
    assert driver.subscription_status == Driver.SubscriptionStatus.INACTIVE
    assert DriverSubscription.objects.count() == 0


def test_subscription_init_accepts_legacy_daily_alias(
    paytr_config, mock_token_request, driver_user
):
    response = api_client(driver_user).post(SUBSCRIPTION_URL, {"plan": "daily"})
    assert response.status_code == 201
    assert Decimal(response.data["amount"]) == Decimal("450.00")
    assert PaymentTransaction.objects.get().subscription_plan == "three_day"


def test_subscription_init_weekly_price(paytr_config, mock_token_request, driver_user):
    response = api_client(driver_user).post(SUBSCRIPTION_URL, {"plan": "weekly"})
    assert Decimal(response.data["amount"]) == Decimal("800.00")


def test_subscription_init_rejects_unknown_plan_and_non_drivers(
    paytr_config, mock_token_request, driver_user, customer
):
    assert api_client(driver_user).post(SUBSCRIPTION_URL, {"plan": "monthly"}).status_code == 400
    assert api_client(customer).post(SUBSCRIPTION_URL, {"plan": "weekly"}).status_code == 403
    assert api_client().post(SUBSCRIPTION_URL, {"plan": "weekly"}).status_code == 401
    mock_token_request.assert_not_called()


# --------------------------------------------------------------------------- #
# Fiyat kesinleşmeden tahsilat yapılmaması
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize("status", ["created", "searching"])
def test_payment_cannot_start_before_price_is_final(
    paytr_config, mock_token_request, customer, service_request, status
):
    """CREATED/SEARCHING aşamasında kart ödemesi açılmaz.

    Bu aşamada kabul edilecek bir teklif `ServiceRequest.price`'ı değiştirebilir;
    önce ödeme alınırsa tahsil edilen tutar ile talebin ücreti ayrışır.
    """
    service_request.status = status
    service_request.save(update_fields=["status"])

    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 400
    assert "sürücü atandıktan" in response.data["detail"]
    assert PaymentTransaction.objects.count() == 0
    mock_token_request.assert_not_called()


@pytest.mark.parametrize(
    "status", ["accepted", "driver_found", "en_route", "arrived", "completed"]
)
def test_payment_allowed_once_price_is_final(
    paytr_config, mock_token_request, customer, service_request, status
):
    service_request.status = status
    service_request.save(update_fields=["status"])

    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 201
    assert Decimal(response.data["amount"]) == Decimal("1250.50")


def test_accepting_an_offer_can_no_longer_outdate_a_paid_amount(
    paytr_config, mock_token_request, customer, service_request, driver_user
):
    """Regresyon: teklif kabulü ödenmiş tutarı geçersizleştiremez.

    Eski davranışta sıra şöyle işletilebiliyordu: searching aşamasında 1250.50 ₺
    öde -> payment_status=approved -> 2000 ₺'lik teklifi kabul et -> price=2000.
    Sonuçta 2000 ₺'lik talep "ödendi" görünürken kasaya 1250.50 ₺ girmiş olurdu.
    """
    from apps.drivers.models import Driver
    from apps.requests.models import Offer

    # 1) Talep teklif toplayan aşamada
    service_request.status = ServiceRequest.Status.SEARCHING
    service_request.save(update_fields=["status"])

    # 2) Kart ödemesi artık bu aşamada başlatılamıyor
    assert api_client(customer).post(_init_url(service_request.id)).status_code == 400

    # 3) Sürücü teklif verir, müşteri kabul eder -> fiyat kesinleşir
    driver = Driver.objects.get(user=driver_user)
    driver.subscription_status = Driver.SubscriptionStatus.ACTIVE
    driver.subscription_plan = "weekly"
    driver.subscription_expires_at = timezone.now() + timedelta(days=3)
    driver.save()
    offer = Offer.objects.create(
        request=service_request, driver=driver_user, amount=Decimal("2000.00")
    )
    accepted = api_client(customer).post(f"/api/offers/{offer.id}/accept/")
    assert accepted.status_code == 200

    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.ACCEPTED
    assert service_request.price == Decimal("2000.00")

    # 4) Ödeme artık kesinleşmiş tutar üzerinden alınır
    response = api_client(customer).post(_init_url(service_request.id))
    assert response.status_code == 201
    assert Decimal(response.data["amount"]) == Decimal("2000.00")
    assert mock_token_request.call_args.kwargs["data"]["payment_amount"] == 200000

    # 5) Ödeme kesinleştikten sonra teklif kabulüyle fiyat değiştirilemez
    #    (talep artık SEARCHING değil, AcceptOfferView'in CAS koşulu tutmaz).
    other_offer = Offer.objects.create(
        request=service_request, driver=driver_user, amount=Decimal("3500.00")
    )
    rejected = api_client(customer).post(f"/api/offers/{other_offer.id}/accept/")
    assert rejected.status_code == 400
    service_request.refresh_from_db()
    assert service_request.price == Decimal("2000.00")
