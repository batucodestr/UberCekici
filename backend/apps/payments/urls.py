from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentTransactionStatusView,
    PaymentViewSet,
    PayTRCallbackView,
    ServiceRequestPaymentInitView,
    SubscriptionPaymentInitView,
)

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [
    # 1. Adım — token alma / iFrame açılışı
    path(
        "payments/paytr/requests/<int:pk>/init/",
        ServiceRequestPaymentInitView.as_view(),
        name="paytr-init-request",
    ),
    path(
        "payments/paytr/subscription/init/",
        SubscriptionPaymentInitView.as_view(),
        name="paytr-init-subscription",
    ),
    # 2. Adım — PayTR'nin sunucudan sunucuya bildirim ucu.
    # PayTR Mağaza Paneli'ndeki "Bildirim URL" alanına bu adres yazılır.
    path("payments/paytr/callback/", PayTRCallbackView.as_view(), name="paytr-callback"),
    # Doğrulanmış ödeme durumu (başarı/hata ekranı bunu sorar)
    path(
        "payments/paytr/transactions/<str:merchant_oid>/",
        PaymentTransactionStatusView.as_view(),
        name="paytr-transaction-status",
    ),
    path("", include(router.urls)),
]

# Yönetici uçları projedeki alışkanlığa uygun olarak apps/analytics/urls.py
# altında /api/admin/ ön ekiyle toplanır (AdminPaymentTransactionViewSet).
