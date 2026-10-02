from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsAdminRole

from .models import SupportTicket
from .serializers import (
    AdminSupportTicketSerializer,
    MySupportTicketSerializer,
    SupportTicketCreateSerializer,
)
from .services import (
    apply_admin_status_changes,
    notify_admins_new_ticket,
    notify_customer_ticket_response,
)


class MySupportTicketListCreateView(generics.ListCreateAPIView):
    """Mobil uygulama: kullanıcı kendi şikayet/isteklerini listeler ve yeni kayıt açar."""

    permission_classes = (permissions.IsAuthenticated,)
    throttle_scope = "support"

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SupportTicketCreateSerializer
        return MySupportTicketSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return SupportTicket.objects.none()
        return SupportTicket.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        full_name = user.get_full_name().strip()
        ticket = serializer.save(
            created_by=user,
            source=SupportTicket.Source.MOBILE,
            contact_name=serializer.validated_data.get("contact_name") or full_name or user.username,
            contact_phone=serializer.validated_data.get("contact_phone") or user.phone_number,
            contact_email=serializer.validated_data.get("contact_email") or user.email,
        )
        notify_admins_new_ticket(ticket)


class MySupportTicketDetailView(generics.RetrieveAPIView):
    serializer_class = MySupportTicketSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return SupportTicket.objects.none()
        return SupportTicket.objects.filter(created_by=self.request.user)


class AdminSupportTicketViewSet(viewsets.ModelViewSet):
    """Yönetici paneli: şikayet/istek kayıtlarını görüntüle, yanıtla, durumunu değiştir."""

    queryset = SupportTicket.objects.select_related(
        "created_by", "assigned_to", "resolved_by", "service_request"
    ).order_by("-created_at")
    serializer_class = AdminSupportTicketSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)
    filterset_fields = ("status", "category", "priority", "source", "assigned_to")
    search_fields = (
        "subject",
        "message",
        "contact_name",
        "contact_phone",
        "contact_email",
        "created_by__username",
    )
    ordering_fields = ("created_at", "updated_at", "status", "priority")

    def perform_create(self, serializer):
        # Panelden açılan kayıt (ör. telefonla gelen şikayet).
        serializer.save(source=serializer.validated_data.get("source") or SupportTicket.Source.PANEL)

    def perform_update(self, serializer):
        previous = {
            "status": serializer.instance.status,
            "response": serializer.instance.response,
        }
        ticket = serializer.save()
        changed = apply_admin_status_changes(ticket, previous, self.request.user)
        if changed:
            ticket.save(update_fields=changed)
        if ticket.response and ticket.response != previous["response"]:
            notify_customer_ticket_response(ticket)

    @extend_schema(
        responses=OpenApiResponse(
            inline_serializer(
                "SupportTicketStatsResponse",
                {
                    "total": serializers.IntegerField(),
                    "open": serializers.IntegerField(),
                    "new": serializers.IntegerField(),
                    "in_progress": serializers.IntegerField(),
                    "resolved": serializers.IntegerField(),
                    "rejected": serializers.IntegerField(),
                    "urgent_open": serializers.IntegerField(),
                    "today": serializers.IntegerField(),
                    "last_7_days": serializers.IntegerField(),
                    "by_category": serializers.ListField(),
                },
            )
        )
    )
    @action(detail=False, methods=["get"])
    def stats(self, request):
        now = timezone.localtime()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        tickets = SupportTicket.objects.all()
        counts = tickets.aggregate(
            total=Count("id"),
            new=Count("id", filter=Q(status=SupportTicket.Status.NEW)),
            in_progress=Count("id", filter=Q(status=SupportTicket.Status.IN_PROGRESS)),
            resolved=Count("id", filter=Q(status=SupportTicket.Status.RESOLVED)),
            rejected=Count("id", filter=Q(status=SupportTicket.Status.REJECTED)),
            urgent_open=Count(
                "id",
                filter=Q(
                    priority=SupportTicket.Priority.URGENT,
                    status__in=SupportTicket.OPEN_STATUSES,
                ),
            ),
            today=Count("id", filter=Q(created_at__gte=today_start)),
            last_7_days=Count("id", filter=Q(created_at__gte=today_start - timedelta(days=6))),
        )
        counts["open"] = counts["new"] + counts["in_progress"]
        counts["by_category"] = list(
            tickets.values("category").annotate(total=Count("id")).order_by("-total")
        )
        return Response(counts)
