from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Category(models.TextChoices):
        NEW_REQUEST = "new_request", "Yeni Sipariş"
        CANCELLED = "cancelled", "İptal"
        PAYMENT = "payment", "Ödeme"
        DRIVER_OFFLINE = "driver_offline", "Sürücü Çevrimdışı"
        GENERAL = "general", "Genel"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=150)
    body = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.title
