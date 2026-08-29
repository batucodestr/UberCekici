from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import Driver, DriverLocation


@shared_task
def cleanup_stale_locations():
    threshold = timezone.now() - timedelta(minutes=10)
    stale_driver_ids = DriverLocation.objects.filter(updated_at__lt=threshold).values_list(
        "driver_id", flat=True
    )
    Driver.objects.filter(id__in=list(stale_driver_ids)).update(is_online=False)
