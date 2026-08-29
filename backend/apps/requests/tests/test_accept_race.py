import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()


@pytest.fixture
def customer(db):
    return User.objects.create_user(username="cust2", email="cust2@test.local", password="x", role=User.Role.CUSTOMER)


@pytest.fixture
def catalog(db):
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    return vehicle, service


@pytest.mark.django_db
def test_second_driver_cannot_accept_already_taken_request(customer, catalog):
    vehicle, service = catalog
    service_request = ServiceRequest.objects.create(
        customer=customer,
        vehicle_type=vehicle,
        service_type=service,
        pickup_lat=41.0,
        pickup_lng=29.0,
        dropoff_lat=41.0,
        dropoff_lng=29.0,
        status=ServiceRequest.Status.SEARCHING,
    )

    driver_a = User.objects.create_user(username="driver_a", email="driver_a@test.local", password="x", role=User.Role.DRIVER)
    driver_b = User.objects.create_user(username="driver_b", email="driver_b@test.local", password="x", role=User.Role.DRIVER)

    client_a = APIClient()
    client_a.force_authenticate(user=driver_a)
    client_b = APIClient()
    client_b.force_authenticate(user=driver_b)

    response_a = client_a.post(f"/api/request/{service_request.id}/accept/")
    response_b = client_b.post(f"/api/request/{service_request.id}/accept/")

    assert response_a.status_code == 200
    assert response_b.status_code == 400

    service_request.refresh_from_db()
    assert service_request.driver_id == driver_a.id
    assert service_request.status == ServiceRequest.Status.DRIVER_FOUND
