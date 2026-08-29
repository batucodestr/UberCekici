from datetime import timedelta

from django.db.models import Avg, Count, Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole
from apps.drivers.models import Driver
from apps.payments.models import Payment
from apps.requests.models import ServiceRequest

from .models import AuditLog
from .serializers import AuditLogSerializer


class DashboardStatsView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)

    @extend_schema(
        responses=inline_serializer(
            "DashboardStatsResponse",
            {
                "daily_orders": serializers.IntegerField(),
                "active_drivers": serializers.IntegerField(),
                "pending_requests": serializers.IntegerField(),
                "daily_revenue": serializers.FloatField(),
                "weekly_revenue": serializers.FloatField(),
                "completed_jobs": serializers.IntegerField(),
                "average_eta_minutes": serializers.FloatField(),
                "service_distribution": serializers.ListField(),
            },
        )
    )
    def get(self, request):
        now = timezone.localtime()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())

        daily_orders = ServiceRequest.objects.filter(created_at__gte=today_start).count()
        pending_requests = ServiceRequest.objects.filter(
            status__in=[ServiceRequest.Status.CREATED, ServiceRequest.Status.SEARCHING]
        ).count()
        active_drivers = Driver.objects.filter(is_online=True).count()
        completed_jobs = ServiceRequest.objects.filter(
            status=ServiceRequest.Status.COMPLETED
        ).count()

        daily_revenue = Payment.objects.filter(
            created_at__gte=today_start, status=Payment.Status.PAID
        ).aggregate(total=Sum("amount"))["total"] or 0
        weekly_revenue = Payment.objects.filter(
            created_at__gte=week_start, status=Payment.Status.PAID
        ).aggregate(total=Sum("amount"))["total"] or 0

        avg_eta = ServiceRequest.objects.exclude(duration_minutes=0).aggregate(
            avg=Avg("duration_minutes")
        )["avg"] or 0

        service_distribution = list(
            ServiceRequest.objects.values("service_type__name").annotate(total=Count("id"))
        )

        return Response(
            {
                "daily_orders": daily_orders,
                "active_drivers": active_drivers,
                "pending_requests": pending_requests,
                "daily_revenue": float(daily_revenue),
                "weekly_revenue": float(weekly_revenue),
                "completed_jobs": completed_jobs,
                "average_eta_minutes": round(float(avg_eta), 1),
                "service_distribution": service_distribution,
            }
        )


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)
    queryset = AuditLog.objects.select_related("actor")
    filterset_fields = ("action", "actor", "model_name")
    search_fields = ("model_name", "path", "actor__username")
    ordering_fields = ("created_at",)
