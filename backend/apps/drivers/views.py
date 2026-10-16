from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole, IsDriver

from .models import COMPANY_BANK, PLAN_ALIASES, SUBSCRIPTION_PLANS, Driver, DriverLocation, DriverSubscription
from .serializers import (
    AdminDriverSerializer,
    DriverLocationSerializer,
    DriverSerializer,
    NearbyDriverSerializer,
)


class AdminDriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.select_related("user", "location").order_by("-created_at")
    serializer_class = AdminDriverSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)
    filterset_fields = ("approval_status", "is_online", "subscription_status")
    search_fields = ("user__username", "user__email", "vehicle_plate", "vehicle_model")
    ordering_fields = ("created_at", "rating", "total_earnings")

    @extend_schema(request=None, responses=AdminDriverSerializer)
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        driver = self.get_object()
        driver.approval_status = Driver.ApprovalStatus.APPROVED
        driver.save(update_fields=["approval_status"])
        return Response(AdminDriverSerializer(driver).data)

    @extend_schema(request=None, responses=AdminDriverSerializer)
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        driver = self.get_object()
        driver.approval_status = Driver.ApprovalStatus.REJECTED
        driver.is_online = False
        driver.save(update_fields=["approval_status", "is_online"])
        return Response(AdminDriverSerializer(driver).data)

    @extend_schema(request=None, responses=AdminDriverSerializer)
    @action(detail=True, methods=["post"], url_path="approve-subscription")
    def approve_subscription(self, request, pk=None):
        driver = self.get_object()
        pending = (
            driver.subscriptions.filter(status=DriverSubscription.Status.PENDING_APPROVAL)
            .order_by("-created_at")
            .first()
        )
        if pending is None:
            return Response(
                {"detail": "Onaylanacak bekleyen bir paket ödemesi yok."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        expires_at = activate_driver_subscription(driver, pending.plan)
        pending.status = DriverSubscription.Status.ACTIVE
        pending.expires_at = expires_at
        pending.save(update_fields=["status", "expires_at"])
        driver.refresh_from_db()
        return Response(AdminDriverSerializer(driver).data)


def activate_driver_subscription(driver, plan):
    """Onay anından, varsa mevcut bitişin üstüne paket süresini ekler."""
    plan = PLAN_ALIASES.get(plan, plan)
    spec = SUBSCRIPTION_PLANS[plan]
    now = timezone.now()
    start = now
    if driver.subscription_expires_at and driver.subscription_expires_at > now:
        start = driver.subscription_expires_at
    expires_at = start + spec["duration"]
    driver.subscription_status = Driver.SubscriptionStatus.ACTIVE
    driver.subscription_plan = plan
    driver.subscription_expires_at = expires_at
    driver.save(
        update_fields=["subscription_status", "subscription_plan", "subscription_expires_at"]
    )
    return expires_at


class PurchaseSubscriptionView(APIView):
    """Sürücü paket seçer ve havale bildirimini kaydeder. Paket, ödeme onaylanınca açılır."""

    permission_classes = (permissions.IsAuthenticated, IsDriver)

    @extend_schema(
        request=inline_serializer(
            "PurchaseSubscriptionRequest",
            {"plan": serializers.ChoiceField(choices=list(SUBSCRIPTION_PLANS))},
        ),
        responses=inline_serializer(
            "PurchaseSubscriptionResponse",
            {
                "plan": serializers.CharField(),
                "amount": serializers.DecimalField(max_digits=10, decimal_places=2),
                "subscription_status": serializers.CharField(),
                "subscription_expires_at": serializers.DateTimeField(allow_null=True),
                "bank_name": serializers.CharField(),
                "account_name": serializers.CharField(),
                "iban": serializers.CharField(),
            },
        ),
    )
    def post(self, request):
        plan = PLAN_ALIASES.get(request.data.get("plan"), request.data.get("plan"))
        if plan not in SUBSCRIPTION_PLANS:
            return Response(
                {"detail": "Geçerli bir paket seçin: three_day veya weekly."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        driver = Driver.objects.get(user=request.user)
        spec = SUBSCRIPTION_PLANS[plan]
        pending = driver.subscriptions.filter(status=DriverSubscription.Status.PENDING_APPROVAL).first()
        if pending is None:
            DriverSubscription.objects.create(driver=driver, plan=plan, amount=spec["amount"])
        else:
            pending.plan = plan
            pending.amount = spec["amount"]
            pending.save(update_fields=["plan", "amount"])

        if not driver.has_active_subscription():
            driver.subscription_status = Driver.SubscriptionStatus.PENDING_APPROVAL
            driver.subscription_plan = plan
            driver.save(update_fields=["subscription_status", "subscription_plan"])

        return Response(
            {
                "plan": plan,
                "amount": str(spec["amount"]),
                "subscription_status": driver.subscription_status,
                "subscription_expires_at": driver.subscription_expires_at,
                "bank_name": COMPANY_BANK["bank_name"],
                "account_name": COMPANY_BANK["account_name"],
                "iban": COMPANY_BANK["iban"],
            }
        )


class NearbyDriversView(generics.ListAPIView):
    serializer_class = NearbyDriverSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Driver.objects.filter(
            is_online=True,
            approval_status=Driver.ApprovalStatus.APPROVED,
            location__isnull=False,
        ).select_related("location", "user")


class MyDriverProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = DriverSerializer
    permission_classes = (permissions.IsAuthenticated, IsDriver)

    def get_object(self):
        return Driver.objects.select_related("user", "location").get(user=self.request.user)


class ToggleOnlineView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsDriver)

    @extend_schema(
        request=None,
        responses=inline_serializer(
            "ToggleOnlineResponse", {"is_online": serializers.BooleanField()}
        ),
    )
    def post(self, request):
        driver = Driver.objects.get(user=request.user)
        driver.is_online = not driver.is_online
        driver.save(update_fields=["is_online"])
        return Response({"is_online": driver.is_online})


class UpdateLocationView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsDriver)

    @extend_schema(request=DriverLocationSerializer, responses=DriverLocationSerializer)
    def post(self, request):
        driver = Driver.objects.get(user=request.user)
        serializer = DriverLocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        location, _ = DriverLocation.objects.update_or_create(
            driver=driver, defaults=serializer.validated_data
        )

        channel_layer = get_channel_layer()
        location_payload = {
            "driver_id": driver.id,
            "latitude": str(location.latitude),
            "longitude": str(location.longitude),
        }
        async_to_sync(channel_layer.group_send)(
            "admin_live",
            {"type": "driver.location", "kind": "driver_location", "data": location_payload},
        )

        from apps.requests.models import ServiceRequest

        active_request = (
            ServiceRequest.objects.filter(
                driver=request.user,
                status__in=[
                    ServiceRequest.Status.DRIVER_FOUND,
                    ServiceRequest.Status.EN_ROUTE,
                    ServiceRequest.Status.ARRIVED,
                ],
            )
            .order_by("-created_at")
            .first()
        )
        if active_request is not None:
            async_to_sync(channel_layer.group_send)(
                f"request_{active_request.id}",
                {"type": "driver.location", "kind": "driver_location", "data": location_payload},
            )

        return Response(DriverLocationSerializer(location).data, status=status.HTTP_200_OK)
