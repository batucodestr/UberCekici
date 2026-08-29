from django.contrib import admin

from .models import ServiceRequest


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "driver",
        "vehicle_type",
        "service_type",
        "status",
        "price",
        "created_at",
    )
    list_filter = ("status", "vehicle_type", "service_type")
    search_fields = ("customer__username", "driver__username", "contact_phone")
