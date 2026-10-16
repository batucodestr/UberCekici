from django.contrib import admin, messages
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Offer, ServiceRequest


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "driver",
        "vehicle_type",
        "service_type",
        "status",
        "payment_method",
        "payment_status",
        "price",
        "approve_transfer_button",
        "created_at",
    )
    list_filter = ("status", "payment_status", "payment_method", "vehicle_type", "service_type")
    search_fields = ("customer__username", "driver__username", "contact_phone")
    actions = ("approve_bank_transfers",)

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "<int:pk>/approve-transfer/",
                self.admin_site.admin_view(self.approve_transfer_view),
                name="requests_servicerequest_approve_transfer",
            ),
        ]
        return custom + urls

    def get_list_display(self, request):
        self._request = request
        return super().get_list_display(request)

    @admin.display(description="Havale onayı")
    def approve_transfer_button(self, obj):
        if (
            obj.payment_method != ServiceRequest.PaymentMethod.BANK_TRANSFER
            or obj.payment_status != ServiceRequest.PaymentStatus.PENDING_APPROVAL
        ):
            return "—"
        url = reverse("admin:requests_servicerequest_approve_transfer", args=[obj.pk])
        token = get_token(self._request)
        return format_html(
            '<form method="post" action="{}" style="display:inline">'
            '<input type="hidden" name="csrfmiddlewaretoken" value="{}">'
            '<button type="submit" class="button">Ödemeyi onayla</button>'
            "</form>",
            url,
            token,
        )

    def approve_transfer_view(self, request, pk):
        if request.method != "POST":
            return redirect("admin:requests_servicerequest_changelist")
        service_request = get_object_or_404(ServiceRequest, pk=pk)
        if (
            service_request.payment_method == ServiceRequest.PaymentMethod.BANK_TRANSFER
            and service_request.payment_status == ServiceRequest.PaymentStatus.PENDING_APPROVAL
        ):
            service_request.payment_status = ServiceRequest.PaymentStatus.APPROVED
            service_request.save(update_fields=["payment_status", "updated_at"])
            self.message_user(request, f"Talep #{service_request.id} ödemesi onaylandı.")
        else:
            self.message_user(
                request,
                f"Talep #{service_request.id} için onaylanacak havale yok.",
                level=messages.WARNING,
            )
        return redirect("admin:requests_servicerequest_changelist")

    @admin.action(description="Seçili havale ödemelerini onayla")
    def approve_bank_transfers(self, request, queryset):
        updated = queryset.filter(
            payment_method=ServiceRequest.PaymentMethod.BANK_TRANSFER,
            payment_status=ServiceRequest.PaymentStatus.PENDING_APPROVAL,
        ).update(payment_status=ServiceRequest.PaymentStatus.APPROVED)
        self.message_user(request, f"{updated} havale ödemesi onaylandı.")


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ("id", "request", "driver", "amount", "eta_minutes", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("driver__username", "request__id")
