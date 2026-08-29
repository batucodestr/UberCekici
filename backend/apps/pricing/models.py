from django.db import models


class VehicleType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=10, blank=True)
    price_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return self.name


class ServiceType(models.Model):
    class Kind(models.TextChoices):
        TOWING = "towing", "Çekici"
        ROADSIDE = "roadside", "Yol Yardım"
        BATTERY = "battery", "Akü"
        TIRE = "tire", "Lastik"
        FUEL = "fuel", "Yakıt"
        RECOVERY = "recovery", "Kurtarma"

    name = models.CharField(max_length=20, choices=Kind.choices, unique=True)
    recovery_multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.get_name_display()


class PriceRule(models.Model):
    city = models.CharField(max_length=100, blank=True, default="")
    base_fee = models.DecimalField(max_digits=8, decimal_places=2, default=150)
    price_per_km = models.DecimalField(max_digits=8, decimal_places=2, default=12)
    night_surcharge = models.DecimalField(max_digits=8, decimal_places=2, default=50)
    night_start_hour = models.PositiveSmallIntegerField(default=22)
    night_end_hour = models.PositiveSmallIntegerField(default=6)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_active", "city")

    def __str__(self):
        return f"Fiyat Kuralı: {self.city or 'Genel'}"
