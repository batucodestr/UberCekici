from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import PriceRule
from .services import invalidate_price_rules_cache


@receiver(post_save, sender=PriceRule)
@receiver(post_delete, sender=PriceRule)
def _clear_price_rules_cache(**kwargs):
    invalidate_price_rules_cache()
