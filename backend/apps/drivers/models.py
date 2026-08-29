from django.conf import settings
from django.db import models


class Driver(models.Model):
    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", "Onay Bekliyor"
        APPROVED = "approved", "Onaylandı"
        REJECTED = "rejected", "Reddedildi"

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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sürücü: {self.user.username}"


class DriverLocation(models.Model):
    driver = models.OneToOneField(Driver, on_delete=models.CASCADE, related_name="location")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    heading = models.FloatField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.driver.user.username} @ ({self.latitude}, {self.longitude})"
