from rest_framework import serializers

from apps.requests.models import ServiceRequest
from apps.users.serializers import UserSerializer

from .models import SupportTicket


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    """Mobil uygulamadan şikayet/istek açma."""

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "category",
            "subject",
            "message",
            "service_request",
            "contact_name",
            "contact_phone",
            "contact_email",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_service_request(self, value):
        if value is None:
            return value
        user = self.context["request"].user
        # Kullanıcı yalnızca kendi talebini şikayetine bağlayabilir.
        if user.role != "admin" and value.customer_id != user.id and value.driver_id != user.id:
            raise serializers.ValidationError("Bu talep size ait değil.")
        return value


class MySupportTicketSerializer(serializers.ModelSerializer):
    """Şikayeti açan kullanıcının gördüğü hâli — iç notlar dışarıda kalır."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "category",
            "category_display",
            "subject",
            "message",
            "service_request",
            "status",
            "status_display",
            "response",
            "responded_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AdminSupportTicketSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source="created_by", read_only=True)
    assigned_to_username = serializers.CharField(
        source="assigned_to.username", read_only=True, default=None
    )
    resolved_by_username = serializers.CharField(
        source="resolved_by.username", read_only=True, default=None
    )
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    source_display = serializers.CharField(source="get_source_display", read_only=True)
    service_request = serializers.PrimaryKeyRelatedField(
        queryset=ServiceRequest.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "created_by",
            "created_by_detail",
            "service_request",
            "category",
            "category_display",
            "subject",
            "message",
            "contact_name",
            "contact_phone",
            "contact_email",
            "source",
            "source_display",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "assigned_to",
            "assigned_to_username",
            "admin_note",
            "response",
            "responded_at",
            "resolved_at",
            "resolved_by",
            "resolved_by_username",
            "created_at",
            "updated_at",
        )
        # Panelden açılan kayıtlarda konu/mesaj/iletişim bilgisi yazılabilir;
        # zaman damgaları ve "çözen yönetici" sunucu tarafından doldurulur.
        read_only_fields = (
            "id",
            "created_by_detail",
            "responded_at",
            "resolved_at",
            "resolved_by",
            "created_at",
            "updated_at",
        )
