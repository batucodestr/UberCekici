import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.pricing.models import ServiceType, VehicleType
from apps.requests.models import ServiceRequest
from apps.support.models import SupportTicket

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
    return _user("ticket_cust", User.Role.CUSTOMER)


@pytest.fixture
def admin(db):
    return _user("ticket_admin", User.Role.ADMIN)


@pytest.fixture
def ticket(db, customer):
    return SupportTicket.objects.create(
        created_by=customer,
        category=SupportTicket.Category.COMPLAINT,
        subject="Sürücü geç geldi",
        message="Operatör 1 saat sonra ulaştı.",
    )


@pytest.mark.django_db
def test_customer_creates_ticket_and_admins_are_notified(customer, admin):
    customer.phone_number = "05551112233"
    customer.save(update_fields=["phone_number"])

    response = _client(customer).post(
        "/api/support/tickets/",
        {"category": "complaint", "subject": "Fiyat yüksek", "message": "Beklediğimden pahalı."},
    )

    assert response.status_code == 201
    created = SupportTicket.objects.get(id=response.data["id"])
    assert created.created_by == customer
    assert created.status == SupportTicket.Status.NEW
    assert created.source == SupportTicket.Source.MOBILE
    # İletişim bilgisi boş gönderildiğinde hesaptan doldurulur.
    assert created.contact_phone == "05551112233"
    assert created.contact_email == customer.email
    assert Notification.objects.filter(
        recipient=admin, category=Notification.Category.SUPPORT
    ).count() == 1


@pytest.mark.django_db
def test_customer_only_sees_own_tickets(customer, ticket):
    other = _user("ticket_other", User.Role.CUSTOMER)
    SupportTicket.objects.create(created_by=other, subject="Başkasının kaydı", message="...")

    response = _client(customer).get("/api/support/tickets/")

    assert response.status_code == 200
    assert [row["id"] for row in response.data["results"]] == [ticket.id]
    # İç notlar müşteri serializer'ında yer almaz.
    assert "admin_note" not in response.data["results"][0]


@pytest.mark.django_db
def test_ticket_cannot_be_linked_to_someone_elses_request(customer):
    other = _user("ticket_req_owner", User.Role.CUSTOMER)
    vehicle = VehicleType.objects.create(name="Otomobil", price_multiplier=1)
    service = ServiceType.objects.create(name=ServiceType.Kind.TOWING, recovery_multiplier=1)
    foreign_request = ServiceRequest.objects.create(
        customer=other,
        vehicle_type=vehicle,
        service_type=service,
        pickup_lat=41.0,
        pickup_lng=29.0,
        dropoff_lat=41.1,
        dropoff_lng=29.1,
    )

    response = _client(customer).post(
        "/api/support/tickets/",
        {"subject": "Yanlış talep", "message": "...", "service_request": foreign_request.id},
    )

    assert response.status_code == 400
    assert SupportTicket.objects.count() == 0


@pytest.mark.django_db
def test_non_admin_cannot_use_admin_ticket_endpoints(customer, ticket):
    driver = _user("ticket_driver", User.Role.DRIVER)

    assert _client(customer).get("/api/admin/tickets/").status_code == 403
    assert _client(driver).get("/api/admin/tickets/").status_code == 403
    assert _client(driver).patch(f"/api/admin/tickets/{ticket.id}/", {"status": "resolved"}).status_code == 403


@pytest.mark.django_db
def test_admin_response_notifies_customer_and_stamps_resolution(admin, customer, ticket):
    response = _client(admin).patch(
        f"/api/admin/tickets/{ticket.id}/",
        {"status": "resolved", "response": "Özür dileriz, indirim tanımlandı.", "priority": "high"},
    )

    assert response.status_code == 200
    ticket.refresh_from_db()
    assert ticket.status == SupportTicket.Status.RESOLVED
    assert ticket.responded_at is not None
    assert ticket.resolved_at is not None
    assert ticket.resolved_by == admin
    assert Notification.objects.filter(
        recipient=customer, category=Notification.Category.SUPPORT
    ).count() == 1


@pytest.mark.django_db
def test_reopening_a_ticket_clears_resolution_fields(admin, ticket):
    _client(admin).patch(f"/api/admin/tickets/{ticket.id}/", {"status": "resolved"})

    _client(admin).patch(f"/api/admin/tickets/{ticket.id}/", {"status": "in_progress"})

    ticket.refresh_from_db()
    assert ticket.status == SupportTicket.Status.IN_PROGRESS
    assert ticket.resolved_at is None
    assert ticket.resolved_by is None


@pytest.mark.django_db
def test_admin_can_open_ticket_from_panel(admin):
    response = _client(admin).post(
        "/api/admin/tickets/",
        {
            "subject": "Telefonla gelen şikayet",
            "message": "Müşteri çağrı merkezini aradı.",
            "category": "complaint",
            "contact_name": "Ali Veli",
            "contact_phone": "05550001122",
            "priority": "urgent",
        },
    )

    assert response.status_code == 201
    created = SupportTicket.objects.get(id=response.data["id"])
    assert created.source == SupportTicket.Source.PANEL
    assert created.created_by is None


@pytest.mark.django_db
def test_admin_ticket_stats(admin, ticket):
    SupportTicket.objects.create(
        subject="Acil",
        message="...",
        category=SupportTicket.Category.REQUEST,
        priority=SupportTicket.Priority.URGENT,
    )
    SupportTicket.objects.create(
        subject="Kapalı", message="...", status=SupportTicket.Status.RESOLVED
    )

    response = _client(admin).get("/api/admin/tickets/stats/")

    assert response.status_code == 200
    assert response.data["total"] == 3
    assert response.data["open"] == 2
    assert response.data["new"] == 2
    assert response.data["resolved"] == 1
    assert response.data["urgent_open"] == 1
    assert response.data["today"] == 3
    assert {row["category"] for row in response.data["by_category"]} == {"complaint", "request"}


@pytest.mark.django_db
def test_admin_can_filter_tickets_by_status_and_category(admin, ticket):
    SupportTicket.objects.create(
        subject="İstek", message="...", category=SupportTicket.Category.REQUEST
    )

    by_category = _client(admin).get("/api/admin/tickets/?category=request")
    by_status = _client(admin).get("/api/admin/tickets/?status=resolved")

    assert [row["subject"] for row in by_category.data["results"]] == ["İstek"]
    assert by_status.data["count"] == 0
