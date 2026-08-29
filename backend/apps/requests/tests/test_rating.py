import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.drivers.models import Driver
from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()


@pytest.fixture
def catalog(db):
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    return vehicle, service


def _make_completed_request(customer, driver_user, vehicle, service, **overrides):
    defaults = dict(
        customer=customer,
        driver=driver_user,
        vehicle_type=vehicle,
        service_type=service,
        pickup_lat=41.0,
        pickup_lng=29.0,
        dropoff_lat=41.0,
        dropoff_lng=29.0,
        status=ServiceRequest.Status.COMPLETED,
    )
    defaults.update(overrides)
    return ServiceRequest.objects.create(**defaults)


@pytest.mark.django_db
def test_customer_can_rate_completed_request_and_driver_average_updates(catalog):
    vehicle, service = catalog
    customer = User.objects.create_user(username="rater", email="rater@test.local", password="x", role=User.Role.CUSTOMER)
    driver_user = User.objects.create_user(username="rated_driver", email="rated_driver@test.local", password="x", role=User.Role.DRIVER)
    driver = Driver.objects.create(user=driver_user, rating=5.0)

    req1 = _make_completed_request(customer, driver_user, vehicle, service)

    client = APIClient()
    client.force_authenticate(user=customer)
    response = client.post(f"/api/request/{req1.id}/rate/", {"rating": 3, "comment": "İdare eder"})

    assert response.status_code == 200
    driver.refresh_from_db()
    assert driver.rating == 3.0

    # İkinci bir tamamlanmış talep daha ekleyip ortalamayı doğrula.
    req2 = _make_completed_request(customer, driver_user, vehicle, service)
    client.post(f"/api/request/{req2.id}/rate/", {"rating": 5})
    driver.refresh_from_db()
    assert driver.rating == 4.0  # (3 + 5) / 2


@pytest.mark.django_db
def test_cannot_rate_twice_or_rate_non_completed_request(catalog):
    vehicle, service = catalog
    customer = User.objects.create_user(username="rater2", email="rater2@test.local", password="x", role=User.Role.CUSTOMER)
    driver_user = User.objects.create_user(username="rated_driver2", email="rated_driver2@test.local", password="x", role=User.Role.DRIVER)
    Driver.objects.create(user=driver_user)

    completed = _make_completed_request(customer, driver_user, vehicle, service)
    pending = _make_completed_request(
        customer, driver_user, vehicle, service, status=ServiceRequest.Status.EN_ROUTE
    )

    client = APIClient()
    client.force_authenticate(user=customer)

    first = client.post(f"/api/request/{completed.id}/rate/", {"rating": 4})
    assert first.status_code == 200
    second = client.post(f"/api/request/{completed.id}/rate/", {"rating": 2})
    assert second.status_code == 400

    not_completed = client.post(f"/api/request/{pending.id}/rate/", {"rating": 5})
    assert not_completed.status_code == 400


@pytest.mark.django_db
def test_cannot_rate_someone_elses_request(catalog):
    vehicle, service = catalog
    owner = User.objects.create_user(username="owner", email="owner@test.local", password="x", role=User.Role.CUSTOMER)
    intruder = User.objects.create_user(username="intruder", email="intruder@test.local", password="x", role=User.Role.CUSTOMER)
    driver_user = User.objects.create_user(username="rated_driver3", email="rated_driver3@test.local", password="x", role=User.Role.DRIVER)
    Driver.objects.create(user=driver_user)

    req = _make_completed_request(owner, driver_user, vehicle, service)

    client = APIClient()
    client.force_authenticate(user=intruder)
    response = client.post(f"/api/request/{req.id}/rate/", {"rating": 1})
    assert response.status_code == 404
