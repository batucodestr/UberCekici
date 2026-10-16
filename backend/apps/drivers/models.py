from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Driver(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Onay Bekliyor"
        APPROVED = "approved", "Onaylandı"
        REJECTED = "rejected", "Reddedildi"

    class SubscriptionStatus(models.TextChoices):
        INACTIVE = "inactive", "Paketi yok"
        PENDING_APPROVAL = "pending_approval", "Ödeme onayı bekliyor"
        ACTIVE = "active", "Aktif"
        EXPIRED = "expired", "Süresi doldu"

    class SubscriptionPlan(models.TextChoices):
        THREE_DAY = "three_day", "3 Gün"
        DAILY = "daily", "3 Gün"  # eski anahtar; three_day ile aynı paket
        WEEKLY = "weekly", "Haftalık"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="driver_profile"
    )
    is_online = models.BooleanField(default=False)
    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING
    )
    vehicle_plate = models.CharField(max_length=20, blank=True)
    vehicle_model = models.CharField(max_length=100, blank=True)
    license_document = models.FileField(upload_to="driver_documents/", blank=True, null=True)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.0)
    subscription_status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.INACTIVE,
    )
    subscription_plan = models.CharField(
        max_length=20, choices=SubscriptionPlan.choices, blank=True
    )
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def has_active_subscription(self) -> bool:
        return (
            self.subscription_status == self.SubscriptionStatus.ACTIVE
            and self.subscription_expires_at is not None
            and self.subscription_expires_at > timezone.now()
        )

    def __str__(self):
        return f"Sürücü: {self.user.username}"


# Müşteriye gösterilmez. Süre, onay anından itibaren eklenir.
# "daily" eski istemciler içindir; three_day ile aynı 72 saat / 450 TL pakettir.
SUBSCRIPTION_PLANS = {
    Driver.SubscriptionPlan.THREE_DAY: {
        "amount": Decimal("450.00"),
        "duration": timedelta(hours=72),
        "label": "3 Gün",
    },
    Driver.SubscriptionPlan.WEEKLY: {
        "amount": Decimal("800.00"),
        "duration": timedelta(days=7),
        "label": "Haftalık",
    },
}
PLAN_ALIASES = {Driver.SubscriptionPlan.DAILY: Driver.SubscriptionPlan.THREE_DAY}

COMPANY_BANK = {
    "bank_name": "Ziraat Bankası",
    "account_name": "Gökhan Akça",
    "iban": "TR55 0001 0008 0396 8668 8550 01",
}


class DriverSubscription(models.Model):
    class Status(models.TextChoices):
        PENDING_APPROVAL = "pending_approval", "Ödeme onayı bekliyor"
        ACTIVE = "active", "Aktif"
        REJECTED = "rejected", "Reddedildi"

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.CharField(max_length=20, choices=Driver.SubscriptionPlan.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING_APPROVAL)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.driver.user.username} {self.plan} {self.status}"


class DriverLocation(models.Model):
    driver = models.OneToOneField(Driver, on_delete=models.CASCADE, related_name="location")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    heading = models.FloatField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.driver.user.username} @ ({self.latitude}, {self.longitude})"
