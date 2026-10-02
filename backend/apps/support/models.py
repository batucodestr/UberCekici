from django.conf import settings
from django.db import models


class SupportTicket(models.Model):
    """Müşteri/sürücü şikayet, istek ve önerileri.

    Kayıtlar mobil uygulamadan (source=MOBILE) açılır ve yönetici panelinde
    işlenir; telefonla gelen bir şikayet için yönetici panelden de kayıt
    açabilir (source=PANEL).
    """

    class Category(models.TextChoices):
        COMPLAINT = "complaint", "Şikayet"
        REQUEST = "request", "İstek"
        SUGGESTION = "suggestion", "Öneri"
        OTHER = "other", "Diğer"

    class Status(models.TextChoices):
        NEW = "new", "Yeni"
        IN_PROGRESS = "in_progress", "İnceleniyor"
        RESOLVED = "resolved", "Çözüldü"
        REJECTED = "rejected", "Reddedildi"

    class Priority(models.TextChoices):
        LOW = "low", "Düşük"
        NORMAL = "normal", "Normal"
        HIGH = "high", "Yüksek"
        URGENT = "urgent", "Acil"

    class Source(models.TextChoices):
        MOBILE = "mobile", "Mobil Uygulama"
        PANEL = "panel", "Yönetici Paneli"
        PHONE = "phone", "Telefon"
        OTHER = "other", "Diğer"

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets",
    )
    service_request = models.ForeignKey(
        "requests.ServiceRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_tickets",
    )

    category = models.CharField(max_length=20, choices=Category.choices, default=Category.COMPLAINT)
    subject = models.CharField(max_length=150)
    message = models.TextField()

    contact_name = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)

    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MOBILE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )
    # Yalnızca panelde görünen iç not; müşteriye gitmez.
    admin_note = models.TextField(blank=True)
    # Müşteriye iletilen yanıt — mobil uygulama bunu kullanıcıya gösterir.
    response = models.TextField(blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_tickets",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "-created_at")),
            models.Index(fields=("category", "-created_at")),
        ]

    OPEN_STATUSES = (Status.NEW, Status.IN_PROGRESS)

    def __str__(self):
        return f"#{self.id} {self.get_category_display()} - {self.subject}"
