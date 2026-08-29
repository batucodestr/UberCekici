from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole

from .models import PriceRule, ServiceType, VehicleType
from .serializers import (
    PriceRuleSerializer,
    QuoteRequestSerializer,
    QuoteResponseSerializer,
    ServiceTypeSerializer,
    VehicleTypeSerializer,
)
from .services import calculate_price


class VehicleTypeViewSet(viewsets.ModelViewSet):
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

    def get_permissions(self):
        # Katalog verisi (fiyat içermiyor) — pazarlama sayfalarında girişsiz gösterilebilsin.
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminRole()]


class ServiceTypeViewSet(viewsets.ModelViewSet):
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsAdminRole()]


class PriceRuleViewSet(viewsets.ModelViewSet):
    queryset = PriceRule.objects.all()
    serializer_class = PriceRuleSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)


class QuoteView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(request=QuoteRequestSerializer, responses=QuoteResponseSerializer)
    def post(self, request):
        serializer = QuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        vehicle_type = VehicleType.objects.filter(id=data["vehicle_type_id"]).first()
        service_type = ServiceType.objects.filter(id=data["service_type_id"]).first()
        if vehicle_type is None or service_type is None:
            return Response(
                {"detail": "Geçersiz araç veya hizmet tipi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        price = calculate_price(
            distance_km=data["distance_km"],
            vehicle_type=vehicle_type,
            service_type=service_type,
            city=data.get("city", ""),
        )
        price["eta_minutes"] = data["duration_minutes"]
        return Response(price)
