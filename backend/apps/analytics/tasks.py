from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from .models import AuditLog


@shared_task
def cleanup_old_logs():
    threshold = timezone.now() - timedelta(days=90)
    AuditLog.objects.filter(created_at__lt=threshold).delete()
