"""PayTR testleri için ortak fixture'lar.

Hiçbir test gerçek mağaza sırrı ya da PayTR sunucusuna erişim gerektirmez:
kimlik bilgileri `override_settings` ile sahte değerlere sabitlenir ve token
isteği `requests.post` seviyesinde mock'lanır.
"""

import base64
import hashlib
import hmac
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

from apps.drivers.models import Driver
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()

# Testlerde kullanılan sahte mağaza bilgileri — gerçek değerler ortam
# değişkenlerinden gelir ve repoda bulunmaz.
TEST_MERCHANT_ID = "123456"
TEST_MERCHANT_KEY = "test-merchant-key"
TEST_MERCHANT_SALT = "test-merchant-salt"

paytr_settings = override_settings(
    PAYTR_MERCHANT_ID=TEST_MERCHANT_ID,
    PAYTR_MERCHANT_KEY=TEST_MERCHANT_KEY,
    PAYTR_MERCHANT_SALT=TEST_MERCHANT_SALT,
    PAYTR_TEST_MODE=True,
    PAYTR_MERCHANT_OK_URL="https://example.test/odeme/basarili",
    PAYTR_MERCHANT_FAIL_URL="https://example.test/odeme/basarisiz",
)


@pytest.fixture
def paytr_config():
    """PayTR ayarlarını testler boyunca sahte değerlere sabitler."""
    with paytr_settings:
        yield


def api_client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    return client


def sign(message: str) -> str:
    """Testlerin, üretim kodundan BAĞIMSIZ olarak imzayı yeniden hesaplaması.

    Bilinçli olarak apps.payments.paytr içindeki yardımcılar kullanılmaz;
    aksi halde test, algoritmayı değil kendi kendini doğrulardı.
    """
    return base64.b64encode(
        hmac.new(TEST_MERCHANT_KEY.encode(), message.encode("utf-8"), hashlib.sha256).digest()
    ).decode()


def callback_hash(merchant_oid: str, status: str, total_amount: str) -> str:
    """2. Adım imzası: merchant_oid + merchant_salt + status + total_amount."""
    return sign(f"{merchant_oid}{TEST_MERCHANT_SALT}{status}{total_amount}")


def callback_payload(merchant_oid: str, status: str, amount_kurus: int, **extra) -> dict:
    total_amount = str(extra.pop("total_amount", amount_kurus))
    payload = {
        "merchant_oid": merchant_oid,
        "status": status,
        "total_amount": total_amount,
        "payment_amount": str(amount_kurus),
        "payment_type": "card",
        "currency": "TL",
        "test_mode": "1",
        "hash": callback_hash(merchant_oid, status, total_amount),
    }
    payload.update(extra)
    return payload


class FakeTokenResponse:
    """requests.post yanıtının mock'u."""

    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests

            raise requests.HTTPError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


@pytest.fixture
def mock_token_request():
    """PayTR token ucunu mock'lar; gönderilen veriyi incelemek için döner."""
    with patch("apps.payments.paytr.requests.post") as mocked:
        mocked.return_value = FakeTokenResponse(
            {"status": "success", "token": "test-iframe-token"}
        )
        yield mocked


@pytest.fixture
def customer(db):
    return User.objects.create_user(
        username="paytr_cust",
        email="paytr_cust@test.local",
        password="x",
        role=User.Role.CUSTOMER,
        first_name="Ayse",
        last_name="Yilmaz",
        phone_number="05551112233",
    )


@pytest.fixture
def driver_user(db):
    user = User.objects.create_user(
        username="paytr_driver",
        email="paytr_driver@test.local",
        password="x",
        role=User.Role.DRIVER,
    )
    Driver.objects.create(user=user, approval_status=Driver.ApprovalStatus.APPROVED)
    return user


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="paytr_admin", email="paytr_admin@test.local", password="x", role=User.Role.ADMIN
    )


@pytest.fixture
def service_request(db, customer):
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    return ServiceRequest.objects.create(
        customer=customer,
        vehicle_type=vehicle,
        service_type=service,
        pickup_lat=41.0,
        pickup_lng=29.0,
        pickup_address="Bayrakli / Izmir",
        dropoff_lat=41.1,
        dropoff_lng=29.1,
        price=Decimal("1250.50"),
        status=ServiceRequest.Status.ACCEPTED,
    )
