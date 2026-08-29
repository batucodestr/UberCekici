from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "customer", "Müşteri"
        DRIVER = "driver", "Çekici Sürücü"
        ADMIN = "admin", "Yönetici"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    # Bir e-posta adresi tek bir hesaba (tek role) bağlı olsun — aynı e-posta ile
    # hem müşteri hem sürücü hesabı açılamaz.
    email = models.EmailField("e-posta", unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active_account = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
