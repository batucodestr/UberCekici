import pytest
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_login_endpoint_is_rate_limited():
    cache.clear()
    client = APIClient()
    login_url = reverse("login")

    responses = [
        client.post(login_url, {"username": "nobody", "password": "wrong"})
        for _ in range(11)
    ]

    assert responses[-1].status_code == 429
    assert any(r.status_code == 401 for r in responses[:-1])
