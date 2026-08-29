from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_request_update(service_request):
    from .serializers import ServiceRequestSerializer

    channel_layer = get_channel_layer()
    payload = ServiceRequestSerializer(service_request).data
    async_to_sync(channel_layer.group_send)(
        f"request_{service_request.id}",
        {"type": "request.update", "kind": "request", "data": payload},
    )
    async_to_sync(channel_layer.group_send)(
        "admin_live",
        {"type": "request.update", "kind": "request", "data": payload},
    )
