import pytest
from django.core.cache import cache

from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.pricing.services import calculate_price


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_price_rule_change_is_reflected_after_cache_invalidation():
    rule = PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)

    first = calculate_price(distance_km=10, vehicle_type=vehicle, service_type=service)
    assert first["base_fee"] == 100

    # Kural admin panelden güncellenir — cache invalidation sinyali devreye girmeli.
    rule.base_fee = 200
    rule.save(update_fields=["base_fee"])

    second = calculate_price(distance_km=10, vehicle_type=vehicle, service_type=service)
    assert second["base_fee"] == 200
