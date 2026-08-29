import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_same_email_cannot_register_two_accounts():
    client = APIClient()
    register_url = reverse("register")

    first = client.post(
        register_url,
        {
            "username": "cust_a",
            "email": "shared@example.com",
            "password": "StrongPass123!",
            "role": "customer",
        },
    )
    assert first.status_code == 201

    second = client.post(
        register_url,
        {
            "username": "driver_a",
            "email": "shared@example.com",
            "password": "StrongPass123!",
            "role": "driver",
        },
    )
    assert second.status_code == 400
    assert "email" in second.data["detail"]


@pytest.mark.django_db
def test_change_password_requires_correct_current_password():
    user = User.objects.create_user(
        username="pwuser", email="pwuser@example.com", password="OldPass123!", role="customer"
    )
    client = APIClient()
    client.force_authenticate(user=user)

    wrong = client.post(
        "/api/auth/change-password/",
        {"current_password": "WrongPass!", "new_password": "NewPass123!"},
    )
    assert wrong.status_code == 400

    correct = client.post(
        "/api/auth/change-password/",
        {"current_password": "OldPass123!", "new_password": "NewPass123!"},
    )
    assert correct.status_code == 204

    user.refresh_from_db()
    assert user.check_password("NewPass123!")
