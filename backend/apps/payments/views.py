import logging

from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.common.permissions import IsAdminRole, IsCustomer, IsDriver
from apps.drivers.models import Driver
from apps.requests.models import ServiceRequest
from apps.users.models import User

from . import paytr, services
from .models import Payment, PaymentTransaction
from .serializers import (
    PaymentSerializer,
    PaymentTransactionSerializer,
    PayTRInitSerializer,
    SubscriptionPaymentInitSerializer,
)

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminRole()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        user = self.request.user
        base = Payment.objects.select_related("service_request")
        if user.role == "admin":
            return base
        if user.role == "driver":
            return base.filter(service_request__driver=user)
        return base.filter(service_request__customer=user)


# --------------------------------------------------------------------------- #
# PayTR — 1. Adım (token / iFrame açılışı)
# --------------------------------------------------------------------------- #


class _PayTRInitMixin:
    """Ödeme başlatma uçlarının ortak hata yönetimi.

    Hata gövdelerine PayTR'nin ham yanıtı dışında hiçbir yapılandırma değeri
    (anahtar/salt) yazılmaz.
    """

    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "payment"

    def _init_response(self, starter, *args, **kwargs):
        try:
            txn = starter(*args, **kwargs)
        except services.PaymentNotAllowed as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except paytr.PayTRNotConfigured:
            logger.error("PayTR ödeme denemesi: mağaza bilgileri tanımlı değil.")
            return Response(
                {"detail": "Kart ile ödeme şu anda kullanılamıyor. Lütfen daha sonra deneyin."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except paytr.PayTRError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY
            )
        return Response(PayTRInitSerializer(txn).data, status=status.HTTP_201_CREATED)


class ServiceRequestPaymentInitView(_PayTRInitMixin, APIView):
    """Müşteri, kendi hizmet talebi için kart ödemesi başlatır.

    Tutar istemciden alınmaz; talebin sunucuda hesaplanmış ücreti kullanılır.
    """

    permission_classes = (permissions.IsAuthenticated, IsCustomer)

    @extend_schema(request=None, responses=PayTRInitSerializer)
    def post(self, request, pk):
        # Sipariş numarası tahmin edilse bile başka müşterinin talebi için
        # ödeme başlatılamaz: sorgu daima customer=request.user ile daraltılır.
        service_request = ServiceRequest.objects.select_related("service_type").filter(
            pk=pk, customer=request.user
        ).first()
        if service_request is None:
            return Response({"detail": "Talep bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        return self._init_response(
            services.start_service_request_payment, request, service_request
        )


class SubscriptionPaymentInitView(_PayTRInitMixin, APIView):
    """Sürücü, paketini kart ile satın alır. Paket yalnızca bildirimle açılır."""

    permission_classes = (permissions.IsAuthenticated, IsDriver)

    @extend_schema(request=SubscriptionPaymentInitSerializer, responses=PayTRInitSerializer)
    def post(self, request):
        serializer = SubscriptionPaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        driver = Driver.objects.filter(user=request.user).first()
        if driver is None:
            return Response(
                {"detail": "Sürücü profili bulunamadı."}, status=status.HTTP_404_NOT_FOUND
            )
        return self._init_response(
            services.start_subscription_payment,
            request,
            driver,
            serializer.validated_data["plan"],
        )


# --------------------------------------------------------------------------- #
# PayTR — 2. Adım (ödeme bildirimi)
# --------------------------------------------------------------------------- #


@method_decorator(csrf_exempt, name="dispatch")
class PayTRCallbackView(APIView):
    """PayTR'nin sunucudan sunucuya gönderdiği ödeme bildirimi ucu.

    PayTR bu adrese oturum/CSRF olmadan POST eder, bu yüzden:
      - kimlik doğrulama kapatılır (`authentication_classes = ()`),
      - CSRF istisnası YALNIZCA bu uca uygulanır,
      - throttle kapatılır; aksi halde yoğun anlarda gerçek ödeme
        bildirimleri 429 ile reddedilir ve ödeme kaybolur.

    Güvenlik sınırı kimlik doğrulama değil **HMAC-SHA256 imza doğrulamasıdır**
    (bkz. services.process_callback). İmza geçerli olmadan hiçbir sipariş
    alanı değişmez.

    Yanıt gövdesi PayTR'nin beklediği düz metindir: başarıda yalnızca "OK".
    PayTR sonucu gövdeye göre değerlendirdiği için hata durumlarında da
    HTTP 200 + açıklayıcı gövde döndürülür (resmî örnek kodun davranışı).
    """

    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)
    throttle_classes = ()

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(
                response=OpenApiTypes.STR,
                description='Başarıda yalnızca "OK"; aksi halde hatayı açıklayan düz metin.',
            )
        },
        description="PayTR ödeme bildirimi (sunucudan sunucuya). Manuel çağrılmaz.",
    )
    def post(self, request):
        # request.POST: PayTR application/x-www-form-urlencoded gönderir.
        payload = {key: value for key, value in request.POST.items()}
        if not payload and isinstance(request.data, dict):
            payload = {key: str(value) for key, value in request.data.items()}

        body, _accepted = services.process_callback(payload)
        # DRF Response KULLANILMAZ: JSON renderer gövdeyi tırnak içine alır
        # ("OK") ve PayTR gövdede "OK" dışında hiçbir karakter kabul etmez.
        return HttpResponse(body, status=200, content_type="text/plain; charset=utf-8")


# --------------------------------------------------------------------------- #
# Durum sorgulama
# --------------------------------------------------------------------------- #


class PaymentTransactionStatusView(APIView):
    """Ödemenin sunucuda DOĞRULANMIŞ durumunu döndürür.

    Başarı ekranı bu ucu kullanır; yönlendirme sayfasının kendisi hiçbir
    zaman ödeme kanıtı sayılmaz.
    """

    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        parameters=[OpenApiParameter("merchant_oid", str, OpenApiParameter.PATH)],
        responses=PaymentTransactionSerializer,
    )
    def get(self, request, merchant_oid):
        txn = PaymentTransaction.objects.filter(merchant_oid=merchant_oid).first()
        # Sipariş numarası tahmin edilse bile başkasının işlemi okunamaz.
        if txn is None or not (
            request.user.role == User.Role.ADMIN or txn.user_id == request.user.id
        ):
            return Response({"detail": "İşlem bulunamadı."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentTransactionSerializer(txn).data)


class AdminPaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Yönetici panelinde ödeme işlemlerinin izlenmesi/mutabakatı."""

    queryset = PaymentTransaction.objects.select_related(
        "user", "service_request", "driver_subscription"
    ).order_by("-created_at")
    serializer_class = PaymentTransactionSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)
    filterset_fields = ("status", "purpose", "test_mode")
    search_fields = ("merchant_oid", "user__username", "user__email")
    ordering_fields = ("created_at", "amount", "paid_at")
