from rest_framework import serializers

from apps.drivers.models import SUBSCRIPTION_PLANS

from . import paytr
from .models import Payment, PaymentTransaction


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ("id", "service_request", "amount", "method", "status", "created_at")
        read_only_fields = ("id", "created_at")


class SubscriptionPaymentInitSerializer(serializers.Serializer):
    """Paket ödemesi isteği.

    Bilinçli olarak YALNIZCA plan alır: tutar sunucudaki sabit paket
    tablosundan okunur, istemci fiyat gönderemez.
    """

    plan = serializers.ChoiceField(choices=["three_day", "weekly", "daily"])

    def validate_plan(self, value):
        from apps.drivers.models import PLAN_ALIASES

        plan = PLAN_ALIASES.get(value, value)
        if plan not in SUBSCRIPTION_PLANS:
            raise serializers.ValidationError("Geçerli bir paket seçin: three_day veya weekly.")
        return plan


class PayTRInitSerializer(serializers.ModelSerializer):
    """Ödeme başlatma yanıtı: iFrame'i açmak için gereken asgari bilgi.

    `iframe_token` istemciye verilir çünkü ödeme formu bu token ile açılır;
    mağaza anahtarı/salt'ı hiçbir koşulda yanıta girmez.
    """

    iframe_url = serializers.SerializerMethodField()
    payment_page_path = serializers.SerializerMethodField()

    class Meta:
        model = PaymentTransaction
        fields = (
            "merchant_oid",
            "purpose",
            "amount",
            "currency",
            "status",
            "test_mode",
            "iframe_token",
            "iframe_url",
            "payment_page_path",
            "created_at",
        )
        read_only_fields = fields

    def get_iframe_url(self, obj) -> str:
        return paytr.iframe_url(obj.iframe_token) if obj.iframe_token else ""

    def get_payment_page_path(self, obj) -> str:
        """Sitenin kendi ödeme ekranı (iFrame'i barındıran sayfa)."""
        return f"/odeme/{obj.iframe_token}" if obj.iframe_token else ""


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Doğrulanmış işlem durumu. Token ve ham bildirim gövdesi dışarı verilmez."""

    class Meta:
        model = PaymentTransaction
        fields = (
            "id",
            "merchant_oid",
            "purpose",
            "status",
            "amount",
            "currency",
            "total_amount",
            "payment_type",
            "installment_count",
            "test_mode",
            "service_request",
            "driver_subscription",
            "subscription_plan",
            "failed_reason_code",
            "failed_reason_msg",
            "paid_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
