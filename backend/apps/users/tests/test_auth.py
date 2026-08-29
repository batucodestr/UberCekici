import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.mark.django_db
def test_register_creates_customer_and_login_returns_role():
    client = APIClient()
    register_url = reverse("register")
    payload = {
        "username": "test_customer",
        "email": "test@example.com",
        "password": "StrongPass123!",
        "role": User.Role.CUSTOMER,
    }
    response = client.post(register_url, payload)
    assert response.status_code == 201

    login_url = reverse("login")
    login_response = client.post(
        login_url, {"username": "test_customer", "password": "StrongPass123!"}
    )
    assert login_response.status_code == 200
    assert login_response.data["role"] == User.Role.CUSTOMER
    assert "access" in login_response.data


@pytest.mark.django_db
def test_admin_role_cannot_be_registered_directly():
    client = APIClient()
    register_url = reverse("register")
    payload = {
        "username": "sneaky_admin",
        "email": "sneaky@example.com",
        "password": "StrongPass123!",
        "role": User.Role.ADMIN,
    }
    response = client.post(register_url, payload)
    assert response.status_code == 400
