import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest

User = get_user_model()


def _client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def customer(db):
    return User.objects.create_user(
        username="eft_cust", email="eft_cust@test.local", password="x", role=User.Role.CUSTOMER
    )


@pytest.fixture
def service_request(db, customer):
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
        status=ServiceRequest.Status.ACCEPTED,
    )


@pytest.mark.django_db
def test_customer_confirms_transfer_and_admin_approves(customer, service_request):
    response = _client(customer).post(f"/api/requests/{service_request.id}/confirm-transfer/")
    assert response.status_code == 200
    assert response.data["payment_method"] == "bank_transfer"
    assert response.data["payment_status"] == "pending_approval"

    service_request.refresh_from_db()
    assert service_request.payment_method == ServiceRequest.PaymentMethod.BANK_TRANSFER
    assert service_request.payment_status == ServiceRequest.PaymentStatus.PENDING_APPROVAL

    admin = User.objects.create_user(
        username="eft_admin", email="eft_admin@test.local", password="x", role=User.Role.ADMIN
    )
    listed = _client(admin).get("/api/admin/requests/", {"payment_status": "pending_approval"})
    assert listed.status_code == 200
    assert listed.data["results"][0]["id"] == service_request.id

    approved = _client(admin).post(f"/api/admin/requests/{service_request.id}/approve-transfer/")
    assert approved.status_code == 200
    assert approved.data["payment_status"] == "approved"
    service_request.refresh_from_db()
    assert service_request.payment_status == ServiceRequest.PaymentStatus.APPROVED

    again = _client(customer).post(f"/api/requests/{service_request.id}/confirm-transfer/")
    assert again.status_code == 400


@pytest.mark.django_db
def test_only_owner_can_confirm_and_only_admin_can_approve(customer, service_request):
    stranger = User.objects.create_user(
        username="eft_other", email="eft_other@test.local", password="x", role=User.Role.CUSTOMER
    )
    assert _client(stranger).post(f"/api/requests/{service_request.id}/confirm-transfer/").status_code == 404
    assert _client(customer).post(f"/api/admin/requests/{service_request.id}/approve-transfer/").status_code == 403

    _client(customer).post(f"/api/requests/{service_request.id}/confirm-transfer/")
    assert _client(customer).post(f"/api/admin/requests/{service_request.id}/approve-transfer/").status_code == 403


@pytest.mark.django_db
def test_cancelled_request_cannot_confirm_transfer(customer, service_request):
    service_request.status = ServiceRequest.Status.CANCELLED
    service_request.save(update_fields=["status"])
    response = _client(customer).post(f"/api/requests/{service_request.id}/confirm-transfer/")
    assert response.status_code == 400
