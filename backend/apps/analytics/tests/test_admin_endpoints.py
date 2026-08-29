import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.drivers.models import Driver

User = get_user_model()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        username="admin_ep", email="admin_ep@test.local", password="x", role=User.Role.ADMIN
    )


@pytest.fixture
def client_as_admin(admin):
    client = APIClient()
    client.force_authenticate(user=admin)
    return client


@pytest.mark.django_db
def test_non_admin_cannot_list_admin_users(db):
    customer = User.objects.create_user(username="cust3", email="cust3@test.local", password="x", role=User.Role.CUSTOMER)
    client = APIClient()
    client.force_authenticate(user=customer)

    response = client.get("/api/admin/users/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_can_change_user_role(client_as_admin):
    target = User.objects.create_user(username="target1", email="target1@test.local", password="x", role=User.Role.CUSTOMER)

    response = client_as_admin.patch(
        f"/api/admin/users/{target.id}/", {"is_active_account": False}, format="json"
    )

    assert response.status_code == 200
    target.refresh_from_db()
    assert target.is_active_account is False


@pytest.mark.django_db
def test_admin_can_approve_pending_driver(client_as_admin):
    driver_user = User.objects.create_user(
        username="pendingdriver", email="pendingdriver@test.local", password="x", role=User.Role.DRIVER
    )
    driver = Driver.objects.create(user=driver_user)
    assert driver.approval_status == Driver.ApprovalStatus.PENDING

    response = client_as_admin.post(f"/api/admin/drivers/{driver.id}/approve/")

    assert response.status_code == 200
    driver.refresh_from_db()
    assert driver.approval_status == Driver.ApprovalStatus.APPROVED


@pytest.mark.django_db
def test_admin_can_search_and_filter_requests(client_as_admin):
    response = client_as_admin.get("/api/admin/requests/?status=searching")
    assert response.status_code == 200
