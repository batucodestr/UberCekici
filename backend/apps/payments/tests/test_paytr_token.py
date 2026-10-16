"""1. Adım birim testleri: imza üretimi, sepet biçimi, sipariş numarası.

Bu dosyadaki testler veritabanı ve ağ erişimi gerektirmez.
"""

import base64
import json
from decimal import Decimal

import pytest
import requests

from apps.payments import paytr

from .conftest import (
    TEST_MERCHANT_ID,
    TEST_MERCHANT_SALT,
    FakeTokenResponse,
    paytr_settings,
    sign,
)


def test_to_kurus_converts_and_rounds():
    assert paytr.to_kurus(Decimal("34.56")) == 3456
    assert paytr.to_kurus(Decimal("1250.50")) == 125050
    assert paytr.to_kurus(9) == 900
    # Yarım kuruş yukarı yuvarlanır (ROUND_HALF_UP): eksik tahsilat olmaz.
    assert paytr.to_kurus(Decimal("10.005")) == 1001


def test_build_basket_is_base64_json_with_name_price_quantity():
    encoded = paytr.build_basket([("Cekici hizmeti", Decimal("18.00"), 1), ("Ek kalem", "33.25", 2)])
    decoded = json.loads(base64.b64decode(encoded).decode("utf-8"))
    assert decoded == [["Cekici hizmeti", "18.00", 1], ["Ek kalem", "33.25", 2]]


def test_generate_merchant_oid_is_alphanumeric_unique_and_within_limit():
    oids = {paytr.generate_merchant_oid("SR") for _ in range(200)}
    assert len(oids) == 200  # çakışma yok
    for oid in oids:
        assert oid.startswith("SR")
        assert oid.isalnum(), "PayTR merchant_oid için alfanümerik şartı koyar"
        assert len(oid) <= paytr.MERCHANT_OID_MAX_LENGTH


@paytr_settings
def test_token_hash_matches_official_concatenation_order():
    """paytr_token, resmî dokümandaki sırayla hesaplanmalı.

    merchant_id + user_ip + merchant_oid + email + payment_amount
    + user_basket + no_installment + max_installment + currency + test_mode
    ardından merchant_salt eklenir, merchant_key ile HMAC-SHA256 + base64.
    """
    config = paytr.get_config()
    basket = paytr.build_basket([("Urun", "9.99", 1)])

    token = paytr.build_token_hash(
        config=config,
        user_ip="1.2.3.4",
        merchant_oid="SR1001",
        email="musteri@ornek.com",
        payment_amount=999,
        user_basket=basket,
        no_installment=0,
        max_installment=0,
        currency="TL",
        test_mode=1,
    )

    expected = sign(
        f"{TEST_MERCHANT_ID}1.2.3.4SR1001musteri@ornek.com999{basket}00TL1"
        f"{TEST_MERCHANT_SALT}"
    )
    assert token == expected


@paytr_settings
def test_token_hash_changes_with_every_signed_field():
    """İmzalanan alanlardan biri değişince token da değişmeli."""
    config = paytr.get_config()
    base = dict(
        config=config,
        user_ip="1.2.3.4",
        merchant_oid="SR1001",
        email="musteri@ornek.com",
        payment_amount=999,
        user_basket=paytr.build_basket([("Urun", "9.99", 1)]),
        no_installment=0,
        max_installment=0,
        currency="TL",
        test_mode=1,
    )
    original = paytr.build_token_hash(**base)

    for field, value in [
        ("user_ip", "9.9.9.9"),
        ("merchant_oid", "SR1002"),
        ("email", "baska@ornek.com"),
        ("payment_amount", 1000),
        ("no_installment", 1),
        ("max_installment", 3),
        ("currency", "USD"),
        ("test_mode", 0),
    ]:
        assert paytr.build_token_hash(**{**base, field: value}) != original, field


@paytr_settings
def test_callback_hash_matches_official_order():
    """2. Adım imzası: merchant_oid + merchant_salt + status + total_amount."""
    config = paytr.get_config()
    computed = paytr.build_callback_hash(
        config=config, merchant_oid="SR1001", status="success", total_amount="125050"
    )
    assert computed == sign(f"SR1001{TEST_MERCHANT_SALT}success125050")


@paytr_settings
def test_verify_callback_hash_accepts_valid_and_rejects_tampered():
    valid = {
        "merchant_oid": "SR1001",
        "status": "success",
        "total_amount": "125050",
        "hash": sign(f"SR1001{TEST_MERCHANT_SALT}success125050"),
    }
    assert paytr.verify_callback_hash(valid) is True

    # Tutar değiştirilirse imza tutmaz.
    assert paytr.verify_callback_hash({**valid, "total_amount": "1"}) is False
    # Durum değiştirilirse imza tutmaz.
    assert paytr.verify_callback_hash({**valid, "status": "failed"}) is False
    # Sipariş numarası değiştirilirse imza tutmaz.
    assert paytr.verify_callback_hash({**valid, "merchant_oid": "SR9999"}) is False
    # İmza alanı boş/eksikse reddedilir.
    assert paytr.verify_callback_hash({**valid, "hash": ""}) is False
    assert paytr.verify_callback_hash({"merchant_oid": "SR1001"}) is False


def test_missing_credentials_raise_not_configured():
    from django.test import override_settings

    with override_settings(PAYTR_MERCHANT_ID="", PAYTR_MERCHANT_KEY="", PAYTR_MERCHANT_SALT=""):
        assert paytr.get_config().is_configured is False
        with pytest.raises(paytr.PayTRNotConfigured):
            paytr.require_config()


@paytr_settings
def test_create_iframe_token_sends_mandatory_fields_and_returns_url(monkeypatch):
    captured = {}

    def fake_post(url, data=None, timeout=None):
        captured["url"] = url
        captured["data"] = data
        return FakeTokenResponse({"status": "success", "token": "abc123"})

    monkeypatch.setattr(paytr.requests, "post", fake_post)

    result = paytr.create_iframe_token(
        merchant_oid="SR1001",
        amount=Decimal("1250.50"),
        email="musteri@ornek.com",
        user_ip="1.2.3.4",
        user_name="Ayse Yilmaz",
        user_address="Bayrakli / Izmir",
        user_phone="05551112233",
        basket=[("Cekici hizmeti", Decimal("1250.50"), 1)],
    )

    assert captured["url"] == "https://www.paytr.com/odeme/api/get-token"
    sent = captured["data"]
    # Resmî dokümandaki zorunlu alanların tamamı gönderilmeli.
    for field in (
        "merchant_id",
        "user_ip",
        "merchant_oid",
        "email",
        "payment_amount",
        "user_basket",
        "no_installment",
        "max_installment",
        "paytr_token",
        "user_name",
        "user_address",
        "user_phone",
        "merchant_ok_url",
        "merchant_fail_url",
        "currency",
        "test_mode",
    ):
        assert field in sent, field
        assert sent[field] not in (None, ""), field

    assert sent["payment_amount"] == 125050  # kuruş
    assert sent["test_mode"] == 1
    assert result["token"] == "abc123"
    assert result["iframe_url"] == "https://www.paytr.com/odeme/guvenli/abc123"


@paytr_settings
def test_create_iframe_token_rejects_zero_amount():
    with pytest.raises(paytr.PayTRError):
        paytr.create_iframe_token(
            merchant_oid="SR1001",
            amount=Decimal("0"),
            email="a@b.com",
            user_ip="1.2.3.4",
            user_name="A",
            user_address="B",
            user_phone="05550000000",
            basket=[("x", "0", 1)],
        )


@paytr_settings
def test_create_iframe_token_wraps_failed_status_and_network_errors(monkeypatch):
    monkeypatch.setattr(
        paytr.requests,
        "post",
        lambda *a, **kw: FakeTokenResponse({"status": "failed", "reason": "gecersiz email"}),
    )
    with pytest.raises(paytr.PayTRError, match="gecersiz email"):
        _token_call()

    def boom(*args, **kwargs):
        raise requests.ConnectionError("down")

    monkeypatch.setattr(paytr.requests, "post", boom)
    with pytest.raises(paytr.PayTRError, match="ulaşılamadı"):
        _token_call()


def _token_call():
    return paytr.create_iframe_token(
        merchant_oid="SR1001",
        amount=Decimal("10"),
        email="a@b.com",
        user_ip="1.2.3.4",
        user_name="A",
        user_address="B",
        user_phone="05550000000",
        basket=[("x", "10", 1)],
    )


def test_client_ip_prefers_forwarded_header():
    class FakeRequest:
        def __init__(self, meta):
            self.META = meta

    assert (
        paytr.client_ip(FakeRequest({"HTTP_X_FORWARDED_FOR": "203.0.113.9, 10.0.0.1"}))
        == "203.0.113.9"
    )
    assert paytr.client_ip(FakeRequest({"HTTP_X_REAL_IP": "203.0.113.5"})) == "203.0.113.5"
    assert paytr.client_ip(FakeRequest({"REMOTE_ADDR": "10.1.2.3"})) == "10.1.2.3"
    assert paytr.client_ip(FakeRequest({})) == "0.0.0.0"
    # PayTR user_ip için 39 karakter sınırı koyar.
    long_ip = "a" * 80
    assert len(paytr.client_ip(FakeRequest({"HTTP_X_FORWARDED_FOR": long_ip}))) == 39
