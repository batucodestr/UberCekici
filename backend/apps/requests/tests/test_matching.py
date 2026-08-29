import pytest
from django.contrib.auth import get_user_model

from apps.drivers.models import Driver, DriverLocation
from apps.notifications.models import Notification
from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.requests.models import ServiceRequest
from apps.requests.tasks import find_driver_for_request

User = get_user_model()


def _make_driver(username, lat, lng, *, online=True, approved=True):
    user = User.objects.create_user(username=username, email=f"{username}@test.local", password="x", role=User.Role.DRIVER)
    driver = Driver.objects.create(
        user=user,
        is_online=online,
        approval_status=(
            Driver.ApprovalStatus.APPROVED if approved else Driver.ApprovalStatus.PENDING
        ),
    )
    DriverLocation.objects.create(driver=driver, latitude=lat, longitude=lng)
    return driver


@pytest.fixture
def customer(db):
    return User.objects.create_user(username="cust", email="cust@test.local", password="x", role=User.Role.CUSTOMER)


@pytest.fixture
def catalog(db):
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    return vehicle, service


@pytest.mark.django_db
def test_only_nearby_online_approved_drivers_are_notified(customer, catalog):
    vehicle, service = catalog
    pickup_lat, pickup_lng = 41.0082, 28.9784  # İstanbul

    near_driver = _make_driver("near", 41.02, 28.99)  # birkaç km
    far_driver = _make_driver("far", 39.9334, 32.8597)  # Ankara, ~350km
    offline_driver = _make_driver("offline", 41.01, 28.98, online=False)
    unapproved_driver = _make_driver("unapproved", 41.01, 28.98, approved=False)

    service_request = ServiceRequest.objects.create(
        customer=customer,
        vehicle_type=vehicle,
        service_type=service,
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        dropoff_lat=pickup_lat,
        dropoff_lng=pickup_lng,
        status=ServiceRequest.Status.SEARCHING,
    )

    find_driver_for_request(service_request.id)

    notified_usernames = set(
        Notification.objects.filter(category=Notification.Category.NEW_REQUEST).values_list(
            "recipient__username", flat=True
        )
    )
    assert notified_usernames == {"near"}
    assert far_driver.user.username not in notified_usernames
    assert offline_driver.user.username not in notified_usernames
    assert unapproved_driver.user.username not in notified_usernames
