from django.conf import settings
from django.db import models

from apps.requests.models import ServiceRequest


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = "cash", "Nakit"
        CARD = "card", "Kart"

    class Status(models.TextChoices):
        PENDING = "pending", "Bekliyor"
        PAID = "paid", "Ödendi"
        FAILED = "failed", "Başarısız"
        REFUNDED = "refunded", "İade Edildi"

    service_request = models.OneToOneField(
        ServiceRequest, on_delete=models.CASCADE, related_name="payment"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=10, choices=Method.choices, default=Method.CASH)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ödeme #{self.id} - {self.status}"


class PaymentTransaction(models.Model):
    """Bir PayTR iFrame ödeme denemesinin sunucu tarafındaki kaydı.

    Kayıt, token istenmeden ÖNCE oluşturulur: böylece PayTR'nin bildirimi
    (2. Adım) her zaman var olan bir siparişle eşleşir ve tutar, bildirimden
    gelen değerle değil burada saklanan sunucu tarafı tutarla karşılaştırılır.

    `Payment` modeli (nakit/kart özeti) korunur; kart ödemesi onaylandığında
    ilgili talebin `Payment` kaydı da güncellenir.
    """

    class Purpose(models.TextChoices):
        SERVICE_REQUEST = "service_request", "Hizmet Talebi"
        DRIVER_SUBSCRIPTION = "driver_subscription", "Sürücü Paketi"

    class Status(models.TextChoices):
        PENDING = "pending", "Bekliyor"
        PAID = "paid", "Ödendi"
        FAILED = "failed", "Başarısız"
        MISMATCH = "mismatch", "Tutar Uyuşmazlığı"

    merchant_oid = models.CharField(max_length=64, unique=True, db_index=True)
    purpose = models.CharField(max_length=20, choices=Purpose.choices)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="payment_transactions",
    )
    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_transactions",
    )
    driver_subscription = models.ForeignKey(
        "drivers.DriverSubscription",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_transactions",
    )
    # Paket ödemesinde abonelik kaydı, ödeme onaylanınca açılır; plan burada
    # tutulur ki bildirim geldiğinde hangi paketin satıldığı istemciden
    # sorulmak zorunda kalmasın.
    subscription_plan = models.CharField(max_length=20, blank=True)

    # Sunucuda hesaplanan, PayTR'ye gönderilen tutar. Bildirim doğrulamasının
    # referansı budur.
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=5, default="TL")
    test_mode = models.BooleanField(default=True)

    iframe_token = models.CharField(max_length=255, blank=True)
    token_created_at = models.DateTimeField(null=True, blank=True)

    # Bildirimden gelen alanlar
    payment_type = models.CharField(max_length=20, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    installment_count = models.PositiveSmallIntegerField(null=True, blank=True)
    failed_reason_code = models.CharField(max_length=10, blank=True)
    failed_reason_msg = models.CharField(max_length=255, blank=True)
    callback_payload = models.JSONField(null=True, blank=True)
    notified_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "PayTR İşlemi"
        verbose_name_plural = "PayTR İşlemleri"

    def __str__(self):
        return f"{self.merchant_oid} - {self.status}"

    @property
    def is_final(self) -> bool:
        """Bildirim bir kez işlendikten sonra tekrar işlenmez (idempotency)."""
        return self.status in (self.Status.PAID, self.Status.FAILED, self.Status.MISMATCH)
