from django.contrib import admin

from .models import Payment, PaymentTransaction


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "service_request", "amount", "method", "status", "created_at")
    list_filter = ("method", "status")


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    """PayTR işlemleri yalnızca okunur: durum değişikliği sadece imzası
    doğrulanmış bildirimle yapılır, panelden elle 'ödendi' işaretlenemez."""

    list_display = (
        "merchant_oid",
        "purpose",
        "status",
        "amount",
        "user",
        "test_mode",
        "paid_at",
        "created_at",
    )
    list_filter = ("status", "purpose", "test_mode")
    search_fields = ("merchant_oid", "user__username", "user__email")
    date_hierarchy = "created_at"
    readonly_fields = [field.name for field in PaymentTransaction._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
