from django.conf import settings
from django.db import models

from apps.pricing.models import ServiceType, VehicleType


class ServiceRequest(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Talep Alındı"
        SEARCHING = "searching", "Operatör Aranıyor"
        DRIVER_FOUND = "driver_found", "Sürücü Bulundu"
        EN_ROUTE = "en_route", "Yolda"
        ARRIVED = "arrived", "Geldi"
        COMPLETED = "completed", "Tamamlandı"
        CANCELLED = "cancelled", "İptal Edildi"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="service_requests"
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_requests",
    )
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.PROTECT)
    service_type = models.ForeignKey(ServiceType, on_delete=models.PROTECT)

    pickup_lat = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_lng = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_address = models.CharField(max_length=255, blank=True)
    dropoff_lat = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_lng = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_address = models.CharField(max_length=255, blank=True)

    distance_km = models.FloatField(default=0)
    duration_minutes = models.FloatField(default=0)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    contact_name = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    note = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    rating_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"Talep #{self.id} - {self.get_status_display()}"
