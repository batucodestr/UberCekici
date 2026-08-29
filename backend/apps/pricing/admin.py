from django.contrib import admin

from .models import PriceRule, ServiceType, VehicleType


@admin.register(VehicleType)
class VehicleTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "price_multiplier", "is_active")


@admin.register(ServiceType)
class ServiceTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "recovery_multiplier", "is_active")


@admin.register(PriceRule)
class PriceRuleAdmin(admin.ModelAdmin):
    list_display = ("city", "base_fee", "price_per_km", "night_surcharge", "is_active")
