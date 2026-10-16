from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.drivers.models import COMPANY_BANK, Driver, DriverSubscription
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def driver_user(db):
    user = User.objects.create_user(
        username="sub_driver", email="sub_driver@test.local", password="x", role=User.Role.DRIVER
    )
    Driver.objects.create(user=user, approval_status=Driver.ApprovalStatus.APPROVED)
    return user


@pytest.fixture
def service_request(db):
    customer = User.objects.create_user(
        username="sub_cust", email="sub_cust@test.local", password="x", role=User.Role.CUSTOMER
    )
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    return ServiceRequest.objects.create(
        customer=customer,
        vehicle_type=vehicle,
        service_type=service,
        pickup_lat=41.0,
        pickup_lng=29.0,
        dropoff_lat=41.1,
        dropoff_lng=29.1,
        status=ServiceRequest.Status.SEARCHING,
    )


@pytest.mark.django_db
def test_purchase_notifies_transfer_without_activating(driver_user):
    response = _client(driver_user).post("/api/driver/subscription/purchase/", {"plan": "three_day"})
    assert response.status_code == 200
    assert response.data["plan"] == "three_day"
    assert response.data["amount"] == "450.00"
    assert response.data["iban"] == COMPANY_BANK["iban"]
    assert response.data["account_name"] == "Gökhan Akça"
    assert response.data["subscription_status"] == "pending_approval"
    assert response.data["subscription_expires_at"] is None

    weekly = _client(driver_user).post("/api/driver/subscription/purchase/", {"plan": "weekly"})
    assert weekly.status_code == 200
    assert weekly.data["amount"] == "800.00"
    assert weekly.data["plan"] == "weekly"
    assert DriverSubscription.objects.filter(driver__user=driver_user).count() == 1
    assert DriverSubscription.objects.get(driver__user=driver_user).amount == Decimal("800.00")

    alias = _client(driver_user).post("/api/driver/subscription/purchase/", {"plan": "daily"})
    assert alias.status_code == 200
    assert alias.data["plan"] == "three_day"
    assert alias.data["amount"] == "450.00"


@pytest.mark.django_db
def test_customer_cannot_purchase_and_invalid_plan_is_rejected(driver_user):
    customer = User.objects.create_user(
        username="sub_other", email="sub_other@test.local", password="x", role=User.Role.CUSTOMER
    )
    assert _client(customer).post("/api/driver/subscription/purchase/", {"plan": "daily"}).status_code == 403
    assert _client(driver_user).post("/api/driver/subscription/purchase/", {"plan": "monthly"}).status_code == 400


@pytest.mark.django_db
def test_offer_requires_active_subscription_then_allows_after_approval(driver_user, service_request):
    blocked = _client(driver_user).post(
        f"/api/requests/{service_request.id}/offers/", {"amount": "1500"}
    )
    assert blocked.status_code == 403
    assert blocked.data["detail"] == "Lütfen teklif verebilmek için aktif bir paket satın alın"

    _client(driver_user).post("/api/driver/subscription/purchase/", {"plan": "three_day"})
    still_blocked = _client(driver_user).post(
        f"/api/requests/{service_request.id}/offers/", {"amount": "1500"}
    )
    assert still_blocked.status_code == 403

    admin = User.objects.create_user(
        username="sub_admin", email="sub_admin@test.local", password="x", role=User.Role.ADMIN
    )
    profile = driver_user.driver_profile
    approved = _client(admin).post(f"/api/admin/drivers/{profile.id}/approve-subscription/")
    assert approved.status_code == 200
    assert approved.data["subscription_status"] == "active"

    profile.refresh_from_db()
    assert profile.subscription_plan == "three_day"
    assert profile.subscription_expires_at > timezone.now() + timedelta(hours=71)
    assert profile.subscription_expires_at < timezone.now() + timedelta(hours=73)

    offered = _client(driver_user).post(
        f"/api/requests/{service_request.id}/offers/", {"amount": "1500"}
    )
    assert offered.status_code == 201

    profile.subscription_expires_at = timezone.now() - timedelta(minutes=1)
    profile.save(update_fields=["subscription_expires_at"])
    expired = _client(driver_user).post(
        f"/api/requests/{service_request.id}/offers/", {"amount": "1600"}
    )
    assert expired.status_code == 403
