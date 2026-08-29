from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()


@pytest.fixture(autouse=True)
def _mock_reverse_geocode():
    # Talep oluşturma testleri gerçek Nominatim ağ çağrısına bağımlı olmasın —
    # deterministik ve hızlı kalsınlar.
    with patch(
        "apps.requests.serializers.reverse_geocode", return_value="Test Adresi"
    ) as mocked:
        yield mocked


@pytest.fixture
def customer(db):
    user = User.objects.create_user(
        username="customer1", email="customer1@test.local", password="StrongPass123!", role=User.Role.CUSTOMER
    )
    return user


@pytest.fixture
def catalog(db):
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    return vehicle, service


@pytest.mark.django_db
def test_client_supplied_price_and_distance_are_ignored(customer, catalog):
    vehicle, service = catalog
    client = APIClient()
    client.force_authenticate(user=customer)

    payload = {
        "vehicle_type": vehicle.id,
        "service_type": service.id,
        # İstanbul (Kadıköy) -> Ankara civarı, gerçek mesafe ~350km.
        "pickup_lat": "40.9909",
        "pickup_lng": "29.0304",
        "pickup_address": "Kadıköy",
        "dropoff_lat": "39.9334",
        "dropoff_lng": "32.8597",
        "dropoff_address": "Ankara",
        # Kötü niyetli client neredeyse sıfır fiyat/mesafe göndermeye çalışıyor.
        "distance_km": 0.1,
        "duration_minutes": 1,
        "price": "1.00",
        "contact_name": "Test Müşteri",
        "contact_phone": "05001112233",
    }
    response = client.post("/api/request/", payload)

    assert response.status_code == 201
    created = ServiceRequest.objects.get(id=response.data["id"])

    # Sunucu kendi hesabını yapmış, client'ın gönderdiği değerleri kullanmamış olmalı.
    assert created.distance_km > 100
    assert float(created.price) > 1000
    assert response.data["distance_km"] != 0.1
    assert response.data["price"] != "1.00"


@pytest.mark.django_db
def test_client_supplied_address_is_ignored_and_geocoded_server_side(customer, catalog):
    vehicle, service = catalog
    client = APIClient()
    client.force_authenticate(user=customer)

    payload = {
        "vehicle_type": vehicle.id,
        "service_type": service.id,
        "pickup_lat": "40.9909",
        "pickup_lng": "29.0304",
        "pickup_address": "Client'ın uydurduğu sahte adres",
        "dropoff_lat": "39.9334",
        "dropoff_lng": "32.8597",
        "dropoff_address": "Başka bir sahte adres",
        "contact_name": "Test Müşteri",
        "contact_phone": "05001112233",
    }
    response = client.post("/api/request/", payload)

    assert response.status_code == 201
    assert response.data["pickup_address"] == "Test Adresi"
    assert response.data["dropoff_address"] == "Test Adresi"
    assert response.data["pickup_address"] != "Client'ın uydurduğu sahte adres"
