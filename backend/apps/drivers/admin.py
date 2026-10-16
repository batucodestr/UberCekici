from django.contrib import admin, messages
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Driver, DriverLocation, DriverSubscription
from .views import activate_driver_subscription


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "approval_status",
        "subscription_status",
        "subscription_plan",
        "subscription_expires_at",
        "approve_subscription_button",
        "is_online",
        "vehicle_plate",
        "rating",
    )
    list_filter = ("approval_status", "subscription_status", "is_online")
    search_fields = ("user__username", "vehicle_plate")

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                "<int:pk>/approve-subscription/",
                self.admin_site.admin_view(self.approve_subscription_view),
                name="drivers_driver_approve_subscription",
            ),
        ]
        return custom + urls

    def get_list_display(self, request):
        self._request = request
        return super().get_list_display(request)

    @admin.display(description="Paket onayı")
    def approve_subscription_button(self, obj):
        pending = obj.subscriptions.filter(status=DriverSubscription.Status.PENDING_APPROVAL).exists()
        if not pending:
            return "—"
        url = reverse("admin:drivers_driver_approve_subscription", args=[obj.pk])
        token = get_token(self._request)
        return format_html(
            '<form method="post" action="{}" style="display:inline">'
            '<input type="hidden" name="csrfmiddlewaretoken" value="{}">'
            '<button type="submit" class="button">Paketi onayla</button>'
            "</form>",
            url,
            token,
        )

    def approve_subscription_view(self, request, pk):
        if request.method != "POST":
            return redirect("admin:drivers_driver_changelist")
        driver = get_object_or_404(Driver, pk=pk)
        pending = (
            driver.subscriptions.filter(status=DriverSubscription.Status.PENDING_APPROVAL)
            .order_by("-created_at")
            .first()
        )
        if pending is None:
            self.message_user(request, "Onaylanacak paket ödemesi yok.", level=messages.WARNING)
        else:
            expires_at = activate_driver_subscription(driver, pending.plan)
            pending.status = DriverSubscription.Status.ACTIVE
            pending.expires_at = expires_at
            pending.save(update_fields=["status", "expires_at"])
            self.message_user(request, f"{driver.user.username} paketi {expires_at:%d.%m.%Y %H:%M} tarihine kadar aktif.")
        return redirect("admin:drivers_driver_changelist")


@admin.register(DriverLocation)
class DriverLocationAdmin(admin.ModelAdmin):
    list_display = ("driver", "latitude", "longitude", "updated_at")
