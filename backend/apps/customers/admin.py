from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("user", "default_address", "loyalty_points", "created_at")
    search_fields = ("user__username", "user__email")
