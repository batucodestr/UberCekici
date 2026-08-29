from django.contrib import admin

from .models import Driver, DriverLocation


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("user", "approval_status", "is_online", "vehicle_plate", "rating")
    list_filter = ("approval_status", "is_online")
    search_fields = ("user__username", "vehicle_plate")


@admin.register(DriverLocation)
class DriverLocationAdmin(admin.ModelAdmin):
    list_display = ("driver", "latitude", "longitude", "updated_at")
