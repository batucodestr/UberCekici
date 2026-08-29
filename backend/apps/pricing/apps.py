from django.apps import AppConfig


class PricingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.pricing"
    verbose_name = "Fiyatlandırma"

    def ready(self):
        from . import signals  # noqa: F401
