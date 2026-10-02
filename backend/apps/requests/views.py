from django.db import IntegrityError, transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.geo import geocode
from apps.common.permissions import IsAdminRole, IsCustomer, IsDriver

from .models import Offer, ServiceRequest
from .serializers import (
    OfferCreateSerializer,
    OfferSerializer,
    RateRequestSerializer,
    RequestStatusUpdateSerializer,
    ServiceRequestCreateSerializer,
    ServiceRequestSerializer,
)
from .services import broadcast_offer_update, broadcast_request_update
from .tasks import find_driver_for_request


def _reject_pending_offers(request_id, exclude_offer_id=None):
    pending = Offer.objects.filter(request_id=request_id, status=Offer.Status.PENDING)
    if exclude_offer_id is not None:
        pending = pending.exclude(pk=exclude_offer_id)
    rejected = list(pending.select_related("driver__driver_profile"))
    pending.update(status=Offer.Status.REJECTED, updated_at=timezone.now())
    for offer in rejected:
        offer.status = Offer.Status.REJECTED
    return rejected


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
        rejected_offers = _reject_pending_offers(service_request.id)
        broadcast_request_update(service_request)
        for offer in rejected_offers:
            broadcast_offer_update(offer)
        return Response(ServiceRequestSerializer(service_request).data)


class RequestOffersView(APIView):
    """GET: talebin teklifleri (müşteri/admin tümünü, sürücü kendisininkini görür).
    POST: sürücü talebe teklif verir."""

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(responses=OfferSerializer(many=True))
    def get(self, request, pk):
        service_request = ServiceRequest.objects.filter(pk=pk).first()
        if service_request is None:
            return Response({"detail": "Talep bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        offers = Offer.objects.filter(request=service_request).select_related(
            "driver__driver_profile"
        )
        if user.role == "driver":
            offers = offers.filter(driver=user)
        elif user.role != "admin" and service_request.customer_id != user.id:
            self.permission_denied(request)

        status_filter = request.query_params.get("status")
        if status_filter:
            offers = offers.filter(status=status_filter)
        return Response(OfferSerializer(offers, many=True).data)

    @extend_schema(request=OfferCreateSerializer, responses=OfferSerializer)
    def post(self, request, pk):
        from apps.drivers.models import Driver

        if request.user.role != "driver":
            self.permission_denied(request, message="Yalnızca sürücüler teklif verebilir.")

        profile = Driver.objects.filter(user=request.user).first()
        if profile is None or profile.approval_status != Driver.ApprovalStatus.APPROVED:
            self.permission_denied(
                request, message="Hesabınız onaylanmadan teklif veremezsiniz."
            )

        service_request = ServiceRequest.objects.filter(pk=pk).first()
        if service_request is None:
            return Response({"detail": "Talep bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if (
            service_request.status != ServiceRequest.Status.SEARCHING
            or service_request.driver_id is not None
        ):
            return Response(
                {"detail": "Bu talep artık teklif kabul etmiyor."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OfferCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                offer = serializer.save(request=service_request, driver=request.user)
        except IntegrityError:
            return Response(
                {"detail": "Bu talebe zaten bekleyen bir teklifiniz var."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        broadcast_offer_update(offer)
        return Response(OfferSerializer(offer).data, status=status.HTTP_201_CREATED)


class AcceptOfferView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsCustomer)

    @extend_schema(request=None, responses=ServiceRequestSerializer)
    def post(self, request, pk):
        with transaction.atomic():
            offer = (
                Offer.objects.select_for_update()
                .select_related("request")
                .filter(pk=pk, request__customer=request.user)
                .first()
            )
            if offer is None:
                return Response({"detail": "Teklif bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
            if offer.status != Offer.Status.PENDING:
                return Response(
                    {"detail": "Bu teklif artık geçerli değil."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # CAS: talep hâlâ SEARCHING ve sürücüsüz değilse (başka teklif kabul
            # edilmiş ya da sürücü doğrudan almışsa) hiçbir şey değişmez.
            updated = ServiceRequest.objects.filter(
                pk=offer.request_id,
                status=ServiceRequest.Status.SEARCHING,
                driver__isnull=True,
            ).update(
                status=ServiceRequest.Status.ACCEPTED,
                driver_id=offer.driver_id,
                price=offer.amount,
                updated_at=timezone.now(),
            )
            if not updated:
                return Response(
                    {"detail": "Bu talep artık teklif kabul etmiyor."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            offer.status = Offer.Status.ACCEPTED
            offer.save(update_fields=["status", "updated_at"])
            rejected_offers = _reject_pending_offers(offer.request_id, exclude_offer_id=offer.id)

        service_request = ServiceRequest.objects.select_related(
            "customer", "driver", "vehicle_type", "service_type"
        ).get(pk=offer.request_id)
        broadcast_request_update(service_request)
        broadcast_offer_update(offer)
        for rejected in rejected_offers:
            broadcast_offer_update(rejected)
        return Response(ServiceRequestSerializer(service_request).data)


class RejectOfferView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsCustomer)

    @extend_schema(request=None, responses=OfferSerializer)
    def post(self, request, pk):
        updated = Offer.objects.filter(
            pk=pk, request__customer=request.user, status=Offer.Status.PENDING
        ).update(status=Offer.Status.REJECTED, updated_at=timezone.now())

        offer = (
            Offer.objects.select_related("driver__driver_profile")
            .filter(pk=pk, request__customer=request.user)
            .first()
        )
        if offer is None:
            return Response({"detail": "Teklif bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        if not updated:
            return Response(
                {"detail": "Bu teklif artık geçerli değil."}, status=status.HTTP_400_BAD_REQUEST
            )

        broadcast_offer_update(offer)
        return Response(OfferSerializer(offer).data)


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
        service_request = ServiceRequest.objects.filter(pk=pk).first()
        if service_request is None:
            return Response({"detail": "Talep bulunamadı."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        new_status = request.data.get("status")
        is_owner_cancelling = (new_status == "cancelled" and service_request.customer_id == user.id)
        is_assigned_driver = user.role == "driver" and service_request.driver_id == user.id

        if not (user.role == "admin" or is_owner_cancelling or is_assigned_driver):
            # Atanmamış talep veya başka sürücüye ait talep: 403.
            return Response(
                {"detail": "Bu talebin durumunu değiştirme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RequestStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request.status = serializer.validated_data["status"]
        service_request.save(update_fields=["status"])
        rejected_offers = []
        if service_request.status == ServiceRequest.Status.CANCELLED:
            rejected_offers = _reject_pending_offers(service_request.id)
        broadcast_request_update(service_request)
        for offer in rejected_offers:
            broadcast_offer_update(offer)
        return Response(ServiceRequestSerializer(service_request).data)


class GeocodeView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"detail": "q parametresi gerekli."}, status=status.HTTP_400_BAD_REQUEST)
        result = geocode(query)
        if result is None:
            return Response({"detail": "Adres bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result)
