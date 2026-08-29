from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "service_request", "amount", "method", "status", "created_at")
    list_filter = ("method", "status")
