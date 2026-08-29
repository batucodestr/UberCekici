import pytest

from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.pricing.services import calculate_price


@pytest.mark.django_db
def test_calculate_price_uses_base_and_distance_fee():
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)

    result = calculate_price(distance_km=10, vehicle_type=vehicle, service_type=service)

    assert result["base_fee"] == 100
    assert result["distance_fee"] == 100
    assert result["total"] == 200


@pytest.mark.django_db
def test_calculate_price_applies_vehicle_multiplier():
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Kamyon", price_multiplier=2)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)

    result = calculate_price(distance_km=10, vehicle_type=vehicle, service_type=service)

    assert result["vehicle_fee"] == 100
    assert result["total"] == 300
