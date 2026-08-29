from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole, IsCustomer, IsDriver

from .models import ServiceRequest
from .serializers import (
    RateRequestSerializer,
    RequestStatusUpdateSerializer,
    ServiceRequestCreateSerializer,
    ServiceRequestSerializer,
)
from .services import broadcast_request_update
from .tasks import find_driver_for_request


class CreateServiceRequestView(generics.CreateAPIView):
    serializer_class = ServiceRequestCreateSerializer
    permission_classes = (permissions.IsAuthenticated, IsCustomer)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        service_request = ServiceRequest.objects.get(id=response.data["id"])
        service_request.status = ServiceRequest.Status.SEARCHING
        service_request.save(update_fields=["status"])
        broadcast_request_update(service_request)
        find_driver_for_request.delay(service_request.id)
        return Response(
            ServiceRequestSerializer(service_request).data, status=status.HTTP_201_CREATED
        )


class ServiceRequestDetailView(generics.RetrieveAPIView):
    queryset = ServiceRequest.objects.select_related(
        "customer", "driver", "vehicle_type", "service_type"
    )
    serializer_class = ServiceRequestSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if user.role == "admin" or obj.customer_id == user.id or obj.driver_id == user.id:
            return obj
        self.permission_denied(self.request)


class MyServiceRequestsView(generics.ListAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ServiceRequest.objects.none()
        user = self.request.user
        base = ServiceRequest.objects.select_related(
            "customer", "driver", "vehicle_type", "service_type"
        )
        if user.role == "driver":
            return base.filter(driver=user)
        return base.filter(customer=user)


class OpenServiceRequestsView(generics.ListAPIView):
    serializer_class = ServiceRequestSerializer
    permission_classes = (permissions.IsAuthenticated, IsDriver)

    def get_queryset(self):
        return ServiceRequest.objects.select_related(
            "customer", "driver", "vehicle_type", "service_type"
        ).filter(status=ServiceRequest.Status.SEARCHING, driver__isnull=True)


class AcceptRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsDriver)

    @extend_schema(request=None, responses=ServiceRequestSerializer)
    def post(self, request, pk):
        # Conditional update (CAS): only succeeds if the request is still
        # SEARCHING at the DB level, so two drivers accepting the same
        # request concurrently can't both "win" (last write silently
        # overwriting the first).
        updated = ServiceRequest.objects.filter(
            pk=pk, status=ServiceRequest.Status.SEARCHING
        ).update(driver=request.user, status=ServiceRequest.Status.DRIVER_FOUND)

        if not updated:
            return Response(
                {"detail": "Bu talep artık uygun değil."}, status=status.HTTP_400_BAD_REQUEST
            )

        service_request = ServiceRequest.objects.select_related(
            "customer", "driver", "vehicle_type", "service_type"
        ).get(pk=pk)
        broadcast_request_update(service_request)
        return Response(ServiceRequestSerializer(service_request).data)


class RateRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsCustomer)

    @extend_schema(request=RateRequestSerializer, responses=ServiceRequestSerializer)
    def post(self, request, pk):
        from django.db.models import Avg

        from apps.drivers.models import Driver

        service_request = ServiceRequest.objects.select_related("driver").filter(
            pk=pk, customer=request.user
        ).first()
        if service_request is None:
            return Response({"detail": "Talep bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if service_request.status != ServiceRequest.Status.COMPLETED:
            return Response(
                {"detail": "Yalnızca tamamlanmış talepler değerlendirilebilir."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if service_request.driver_id is None:
            return Response(
                {"detail": "Bu talebe atanmış bir sürücü yok."}, status=status.HTTP_400_BAD_REQUEST
            )
        if service_request.rating is not None:
            return Response(
                {"detail": "Bu talep zaten değerlendirildi."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = RateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service_request.rating = serializer.validated_data["rating"]
        service_request.rating_comment = serializer.validated_data["comment"]
        service_request.save(update_fields=["rating", "rating_comment"])

        driver = Driver.objects.get(user_id=service_request.driver_id)
        avg = ServiceRequest.objects.filter(
            driver_id=service_request.driver_id, rating__isnull=False
        ).aggregate(avg=Avg("rating"))["avg"]
        driver.rating = round(avg, 2) if avg is not None else driver.rating
        driver.save(update_fields=["rating"])

        return Response(ServiceRequestSerializer(service_request).data)


class AdminServiceRequestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ServiceRequest.objects.select_related(
        "customer", "driver", "vehicle_type", "service_type"
    ).order_by("-created_at")
    serializer_class = ServiceRequestSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)
    filterset_fields = ("status", "vehicle_type", "service_type")
    search_fields = ("customer__username", "driver__username", "contact_name", "contact_phone")
    ordering_fields = ("created_at", "price", "distance_km")


class UpdateRequestStatusView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(request=RequestStatusUpdateSerializer, responses=ServiceRequestSerializer)
    def post(self, request, pk):
        service_request = ServiceRequest.objects.get(pk=pk)
        user = request.user
        if user.role not in ("admin", "driver") and service_request.driver_id != user.id:
            self.permission_denied(request)

        serializer = RequestStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request.status = serializer.validated_data["status"]
        service_request.save(update_fields=["status"])
        broadcast_request_update(service_request)
        return Response(ServiceRequestSerializer(service_request).data)
