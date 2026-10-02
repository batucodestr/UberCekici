from django.utils import timezone

from apps.notifications.models import Notification
from apps.users.models import User

from .models import SupportTicket

CATEGORY_PREFIX = {
    SupportTicket.Category.COMPLAINT: "Yeni şikayet",
    SupportTicket.Category.REQUEST: "Yeni istek",
    SupportTicket.Category.SUGGESTION: "Yeni öneri",
    SupportTicket.Category.OTHER: "Yeni kayıt",
}


def notify_admins_new_ticket(ticket: SupportTicket) -> None:
    """Panelde oturum açan yöneticilere anlık bildirim düşürür.

    Notification post_save sinyali mesajı yöneticinin WebSocket kanalına da
    gönderir, böylece panel yenilenmeden görünür.
    """
    prefix = CATEGORY_PREFIX.get(ticket.category, "Yeni kayıt")
    admins = User.objects.filter(role=User.Role.ADMIN, is_active_account=True)
    Notification.objects.bulk_create(
        [
            Notification(
                recipient=admin,
                title=f"{prefix} #{ticket.id}",
                body=ticket.subject,
                category=Notification.Category.SUPPORT,
            )
            for admin in admins
        ]
    )


def notify_customer_ticket_response(ticket: SupportTicket) -> None:
    """Yönetici yanıt yazdığında kaydı açan kullanıcıyı bilgilendirir."""
    if ticket.created_by_id is None:
        return
    Notification.objects.create(
        recipient_id=ticket.created_by_id,
        title=f"Talebiniz yanıtlandı (#{ticket.id})",
        body=ticket.response[:500],
        category=Notification.Category.SUPPORT,
    )


def apply_admin_status_changes(ticket: SupportTicket, previous: dict, actor) -> list:
    """Durum/yanıt değişimine bağlı zaman damgalarını doldurur.

    `previous` güncelleme öncesi {"status", "response"} değerlerini taşır.
    Değişen alan adlarını döndürür, böylece çağıran tek bir save() yapabilir.
    """
    changed = []
    now = timezone.now()

    if ticket.response and ticket.response != previous.get("response"):
        ticket.responded_at = now
        changed.append("responded_at")

    is_closed = ticket.status in (SupportTicket.Status.RESOLVED, SupportTicket.Status.REJECTED)
    was_closed = previous.get("status") in (
        SupportTicket.Status.RESOLVED,
        SupportTicket.Status.REJECTED,
    )
    if is_closed and not was_closed:
        ticket.resolved_at = now
        ticket.resolved_by = actor
        changed += ["resolved_at", "resolved_by"]
    elif not is_closed and was_closed:
        ticket.resolved_at = None
        ticket.resolved_by = None
        changed += ["resolved_at", "resolved_by"]

    return changed
