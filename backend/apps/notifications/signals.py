from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .serializers import NotificationSerializer


@receiver(post_save, sender=Notification)
def _broadcast_new_notification(instance, created, **kwargs):
    if not created:
        return
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"notifications_{instance.recipient_id}",
        {"type": "notification.new", "data": NotificationSerializer(instance).data},
    )
