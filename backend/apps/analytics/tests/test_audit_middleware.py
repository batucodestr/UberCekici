import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.analytics.models import AuditLog
from apps.pricing.models import PriceRule

User = get_user_model()


@pytest.fixture
def admin(db):
    return User.objects.create_user(
        username="admin_audit", email="admin_audit@test.local", password="StrongPass123!", role=User.Role.ADMIN
    )


@pytest.mark.django_db
def test_mutating_request_records_previous_and_new_value(admin):
    rule = PriceRule.objects.create(city="", base_fee=100, price_per_km=10, night_surcharge=0)

    client = APIClient()
    client.force_authenticate(user=admin)
    response = client.patch(
        f"/api/price-rules/{rule.id}/", {"base_fee": "150.00"}, format="json"
    )

    assert response.status_code == 200

    log = AuditLog.objects.filter(model_name="PriceRule", object_id=str(rule.id)).latest(
        "created_at"
    )
    assert log.action == AuditLog.Action.UPDATE
    assert log.previous_value["base_fee"] == "100.00"
    assert log.new_value["base_fee"] == "150.00"
