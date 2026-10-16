"""Yapılandırma güvenlik ağı.

Bu testler kod yollarını değil **dağıtım ayarlarını** doğrular. Amaç, PayTR'ye
gönderilen dönüş adreslerinin bu siteyi fiilen sunan bir alan adına işaret
ettiğinden emin olmak: yanlış alan adı, ödeme başarıyla tahsil edildikten
sonra müşterinin erişilemeyen bir sayfaya düşmesine yol açar ve bu, hatanın
en pahalı anda ortaya çıktığı sessiz bir arızadır.
"""

from urllib.parse import urlparse

from django.conf import settings
from django.test import override_settings

from apps.payments import paytr


def _host(url: str) -> str:
    return urlparse(url).hostname or ""


def test_return_urls_point_to_a_host_this_site_serves():
    """ok/fail adreslerinin host'u ALLOWED_HOSTS içinde olmalı.

    Aksi halde Django o host'a gelen isteği reddeder — yani adres bize ait
    değildir ya da yapılandırma eksiktir.
    """
    for url in (settings.PAYTR_MERCHANT_OK_URL, settings.PAYTR_MERCHANT_FAIL_URL):
        host = _host(url)
        assert host, f"Dönüş adresi host içermiyor: {url!r}"
        assert host in settings.ALLOWED_HOSTS, (
            f"{url!r} adresindeki host ({host}) ALLOWED_HOSTS içinde değil. "
            "Ödeme sonrası müşteri erişilemeyen bir sayfaya düşer."
        )


def test_return_urls_use_https():
    """PayTR dönüş adresleri HTTPS olmalı (kart ödemesi akışı)."""
    for url in (settings.PAYTR_MERCHANT_OK_URL, settings.PAYTR_MERCHANT_FAIL_URL):
        assert url.startswith("https://"), f"HTTPS olmayan dönüş adresi: {url!r}"


def test_return_urls_are_the_routes_the_frontend_actually_serves():
    """Adresler frontend'deki rotalarla birebir aynı olmalı.

    Rotalar: frontend/src/App.tsx -> /odeme/basarili, /odeme/basarisiz
    """
    assert settings.PAYTR_MERCHANT_OK_URL.endswith("/odeme/basarili")
    assert settings.PAYTR_MERCHANT_FAIL_URL.endswith("/odeme/basarisiz")


def test_return_urls_stay_within_paytr_length_limit():
    """PayTR merchant_ok_url/merchant_fail_url için 400 karakter sınırı koyar.

    Adrese ayrıca `?oid=<merchant_oid>` (en fazla 64 karakter) eklenir.
    """
    for url in (settings.PAYTR_MERCHANT_OK_URL, settings.PAYTR_MERCHANT_FAIL_URL):
        assert len(url) + len("?oid=") + paytr.MERCHANT_OID_MAX_LENGTH <= 400


def test_official_endpoints_are_not_overridden_by_accident():
    """Resmî PayTR uçları dokümantasyondaki değerlerde kalmalı."""
    assert settings.PAYTR_TOKEN_URL == "https://www.paytr.com/odeme/api/get-token"
    assert settings.PAYTR_IFRAME_URL_TEMPLATE == "https://www.paytr.com/odeme/guvenli/{token}"
    assert "{token}" in settings.PAYTR_IFRAME_URL_TEMPLATE


def test_test_mode_is_the_default():
    """Varsayılan test modudur; canlı tahsilat yalnızca açık ayarla yapılır."""
    assert settings.PAYTR_TEST_MODE is True, (
        "PAYTR_TEST_MODE varsayılanı True olmalı — aksi halde eksik "
        "yapılandırmayla gerçek tahsilat riski doğar."
    )


def test_installment_settings_are_within_paytr_limits():
    """PayTR: no_installment 0/1, max_installment 0 veya 2..12."""
    assert settings.PAYTR_NO_INSTALLMENT in (0, 1)
    assert settings.PAYTR_MAX_INSTALLMENT == 0 or 2 <= settings.PAYTR_MAX_INSTALLMENT <= 12


def test_currency_is_supported_by_paytr():
    assert settings.PAYTR_CURRENCY in ("TL", "TRY", "EUR", "USD", "GBP", "RUB")


def test_credentials_are_not_hardcoded_in_settings():
    """Mağaza sırları yalnızca ortamdan gelir; repoda gömülü değer olmamalı.

    Bu ortamda .env içinde PAYTR_* tanımlı olmadığı için değerler boştur;
    dolu olsalar bile ortamdan geldikleri için testin amacı sabit (hardcoded)
    bir değer bırakılmadığını doğrulamaktır.
    """
    settings_source = (settings.BASE_DIR / "config" / "settings.py").read_text()
    for name in ("PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT", "PAYTR_MERCHANT_ID"):
        assert f'config("{name}", default="")' in settings_source, (
            f"{name} ortam değişkeninden boş varsayılanla okunmalı."
        )


@override_settings(
    PAYTR_MERCHANT_OK_URL="https://baska-alan-adi.example/odeme/basarili",
    PAYTR_MERCHANT_FAIL_URL="https://baska-alan-adi.example/odeme/basarisiz",
)
def test_guard_actually_catches_a_foreign_return_domain():
    """Yukarıdaki korumanın gerçekten yakaladığını kanıtlar (meta-test)."""
    import pytest

    with pytest.raises(AssertionError):
        test_return_urls_point_to_a_host_this_site_serves()
