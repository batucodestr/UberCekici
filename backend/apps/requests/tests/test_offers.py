from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.drivers.models import Driver
from apps.pricing.models import PriceRule, ServiceType, VehicleType
from apps.requests.models import Offer, ServiceRequest

User = get_user_model()


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _driver(username, approval=Driver.ApprovalStatus.APPROVED):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.local", password="x", role=User.Role.DRIVER
    )
    Driver.objects.create(user=user, approval_status=approval, vehicle_plate="34 ABC 123")
    return user


@pytest.fixture
def customer(db):
    return User.objects.create_user(
        username="offer_cust", email="offer_cust@test.local", password="x", role=User.Role.CUSTOMER
    )


@pytest.fixture
def service_request(db, customer):
    PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)
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
        price=Decimal("900.00"),
        status=ServiceRequest.Status.SEARCHING,
    )


@pytest.mark.django_db
def test_driver_can_submit_offer_and_customer_lists_it(customer, service_request):
    driver = _driver("offer_d1")

    response = _client(driver).post(
        f"/api/requests/{service_request.id}/offers/",
        {"amount": "1500.00", "eta_minutes": 20, "note": "Hemen çıkıyorum"},
    )
    assert response.status_code == 201
    assert response.data["status"] == "pending"
    assert response.data["driver"]["id"] == driver.id
    assert response.data["vehicle_plate"] == "34 ABC 123"

    listing = _client(customer).get(f"/api/requests/{service_request.id}/offers/")
    assert listing.status_code == 200
    assert [o["id"] for o in listing.data] == [response.data["id"]]


@pytest.mark.django_db
def test_offer_rules_for_drivers(customer, service_request):
    pending_driver = _driver("offer_pending", approval=Driver.ApprovalStatus.PENDING)
    assert (
        _client(pending_driver)
        .post(f"/api/requests/{service_request.id}/offers/", {"amount": "1000"})
        .status_code
        == 403
    )

    assert (
        _client(customer)
        .post(f"/api/requests/{service_request.id}/offers/", {"amount": "1000"})
        .status_code
        == 403
    )

    driver = _driver("offer_dup")
    client = _client(driver)
    assert client.post(f"/api/requests/{service_request.id}/offers/", {"amount": "1000"}).status_code == 201
    duplicate = client.post(f"/api/requests/{service_request.id}/offers/", {"amount": "900"})
    assert duplicate.status_code == 400

    assert client.post(f"/api/requests/{service_request.id}/offers/", {"amount": "0"}).status_code == 400


@pytest.mark.django_db
def test_driver_sees_only_own_offers_and_stranger_is_denied(customer, service_request):
    d1, d2 = _driver("offer_own1"), _driver("offer_own2")
    _client(d1).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1000"})
    _client(d2).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1100"})

    own = _client(d1).get(f"/api/requests/{service_request.id}/offers/")
    assert [o["driver"]["id"] for o in own.data] == [d1.id]

    stranger = User.objects.create_user(
        username="offer_stranger", email="s@test.local", password="x", role=User.Role.CUSTOMER
    )
    assert _client(stranger).get(f"/api/requests/{service_request.id}/offers/").status_code == 403


@pytest.mark.django_db
def test_accepting_offer_assigns_driver_price_and_rejects_others(customer, service_request):
    d1, d2 = _driver("offer_acc1"), _driver("offer_acc2")
    winner = _client(d1).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1500"}).data
    loser = _client(d2).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1700"}).data

    response = _client(customer).post(f"/api/offers/{winner['id']}/accept/")
    assert response.status_code == 200
    assert response.data["status"] == "accepted"

    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.ACCEPTED
    assert service_request.driver_id == d1.id
    assert service_request.price == Decimal("1500.00")
    assert Offer.objects.get(pk=winner["id"]).status == Offer.Status.ACCEPTED
    assert Offer.objects.get(pk=loser["id"]).status == Offer.Status.REJECTED

    # Kabulden sonra ne yeni teklif ne de ikinci bir kabul mümkün.
    again = _client(customer).post(f"/api/offers/{loser['id']}/accept/")
    assert again.status_code == 400
    late = _client(_driver("offer_late")).post(
        f"/api/requests/{service_request.id}/offers/", {"amount": "800"}
    )
    assert late.status_code == 400


@pytest.mark.django_db
def test_only_request_owner_can_accept_or_reject(customer, service_request):
    driver = _driver("offer_owner")
    offer = _client(driver).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1200"}).data

    other = User.objects.create_user(
        username="offer_other", email="o@test.local", password="x", role=User.Role.CUSTOMER
    )
    assert _client(other).post(f"/api/offers/{offer['id']}/accept/").status_code == 404
    assert _client(other).post(f"/api/offers/{offer['id']}/reject/").status_code == 404
    assert _client(driver).post(f"/api/offers/{offer['id']}/accept/").status_code == 403

    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.SEARCHING
    assert service_request.driver_id is None


@pytest.mark.django_db
def test_rejecting_offer_keeps_request_open_and_driver_can_rebid(customer, service_request):
    driver = _driver("offer_rej")
    offer = _client(driver).post(f"/api/requests/{service_request.id}/offers/", {"amount": "2000"}).data

    response = _client(customer).post(f"/api/offers/{offer['id']}/reject/")
    assert response.status_code == 200
    assert response.data["status"] == "rejected"
    assert _client(customer).post(f"/api/offers/{offer['id']}/reject/").status_code == 400

    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.SEARCHING
    assert service_request.price == Decimal("900.00")

    rebid = _client(driver).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1800"})
    assert rebid.status_code == 201


@pytest.mark.django_db
def test_customer_cancel_rejects_pending_offers(customer, service_request):
    driver = _driver("offer_cancel")
    offer = _client(driver).post(f"/api/requests/{service_request.id}/offers/", {"amount": "1300"}).data

    response = _client(customer).post(
        f"/api/request/{service_request.id}/status/", {"status": "cancelled"}
    )
    assert response.status_code == 200
    assert Offer.objects.get(pk=offer["id"]).status == Offer.Status.REJECTED
