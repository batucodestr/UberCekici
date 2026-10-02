from django.contrib import admin

from .models import SupportTicket


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id", "category", "subject", "status", "priority", "created_by", "created_at")
    list_filter = ("status", "category", "priority", "source")
    list_select_related = ("created_by",)
    search_fields = ("subject", "message", "contact_name", "contact_phone", "created_by__username")
    raw_id_fields = ("created_by", "assigned_to", "resolved_by", "service_request")
    readonly_fields = ("created_at", "updated_at", "responded_at", "resolved_at")
