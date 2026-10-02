import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.drivers.models import Driver
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _user(username, role):
    return User.objects.create_user(
        username=username, email=f"{username}@test.local", password="x", role=role
    )


@pytest.fixture
def customer(db):
    return _user("status_cust", User.Role.CUSTOMER)


@pytest.fixture
def make_request(db, customer):
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)

    def _make(status=ServiceRequest.Status.SEARCHING, driver=None):
        return ServiceRequest.objects.create(
            customer=customer,
            driver=driver,
            vehicle_type=vehicle,
            service_type=service,
            pickup_lat=41.0,
            pickup_lng=29.0,
            dropoff_lat=41.1,
            dropoff_lng=29.1,
            status=status,
        )

    return _make


def _set_status(user, service_request, new_status):
    return _client(user).post(
        f"/api/request/{service_request.id}/status/", {"status": new_status}
    )


@pytest.mark.django_db
def test_driver_cannot_update_unassigned_request(make_request):
    service_request = make_request()
    driver = _user("status_free", User.Role.DRIVER)

    response = _set_status(driver, service_request, "en_route")

    assert response.status_code == 403
    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.SEARCHING


@pytest.mark.django_db
def test_driver_cannot_update_another_drivers_request(make_request):
    owner_driver = _user("status_owner", User.Role.DRIVER)
    other_driver = _user("status_other", User.Role.DRIVER)
    service_request = make_request(ServiceRequest.Status.ACCEPTED, driver=owner_driver)

    for new_status in ("en_route", "completed", "cancelled"):
        assert _set_status(other_driver, service_request, new_status).status_code == 403

    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.ACCEPTED


@pytest.mark.django_db
def test_assigned_driver_moves_accepted_request_through_flow(make_request):
    driver = _user("status_assigned", User.Role.DRIVER)
    service_request = make_request(ServiceRequest.Status.ACCEPTED, driver=driver)

    for new_status in ("en_route", "arrived", "completed"):
        response = _set_status(driver, service_request, new_status)
        assert response.status_code == 200
        assert response.data["status"] == new_status


@pytest.mark.django_db
def test_accepted_offer_then_driver_goes_en_route(customer, make_request):
    user = _user("status_bidder", User.Role.DRIVER)
    Driver.objects.create(user=user, approval_status=Driver.ApprovalStatus.APPROVED)
    service_request = make_request()

    offer = _client(user).post(
        f"/api/requests/{service_request.id}/offers/", {"amount": "1500"}
    ).data
    assert _client(customer).post(f"/api/offers/{offer['id']}/accept/").status_code == 200

    response = _set_status(user, service_request, "en_route")

    assert response.status_code == 200
    service_request.refresh_from_db()
    assert service_request.status == ServiceRequest.Status.EN_ROUTE


@pytest.mark.django_db
def test_customer_may_only_cancel_own_request(customer, make_request):
    service_request = make_request()
    stranger = _user("status_stranger", User.Role.CUSTOMER)

    assert _set_status(customer, service_request, "completed").status_code == 403
    assert _set_status(stranger, service_request, "cancelled").status_code == 403
    assert _set_status(customer, service_request, "cancelled").status_code == 200


@pytest.mark.django_db
def test_admin_can_update_any_request_and_missing_request_is_404(make_request):
    admin = _user("status_admin", User.Role.ADMIN)
    service_request = make_request()

    assert _set_status(admin, service_request, "cancelled").status_code == 200
    assert _client(admin).post("/api/request/999999/status/", {"status": "en_route"}).status_code == 404
