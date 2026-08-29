from django.db import models

from apps.requests.models import ServiceRequest


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Nakit"
        CARD = "card", "Kart"

    class Status(models.TextChoices):
        PENDING = "pending", "Bekliyor"
        PAID = "paid", "Ödendi"
        FAILED = "failed", "Başarısız"
        REFUNDED = "refunded", "İade Edildi"

    service_request = models.OneToOneField(
        ServiceRequest, on_delete=models.CASCADE, related_name="payment"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ödeme #{self.id} - {self.status}"
