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


def broadcast_offer_update(offer):
    """Teklif olayını talebin takip kanalına (müşteri) ve teklifi veren sürücüye iletir."""
    from .serializers import OfferSerializer

    channel_layer = get_channel_layer()
    payload = OfferSerializer(offer).data
    async_to_sync(channel_layer.group_send)(
        f"request_{offer.request_id}",
        {"type": "request.update", "kind": "offer", "data": payload},
    )
    # Sürücü consumer'ı yalnızca location.update / new.request tiplerini karşılıyor;
    # new.request olayı "kind" alanını olduğu gibi ilettiği için onu kullanıyoruz.
    async_to_sync(channel_layer.group_send)(
        f"driver_{offer.driver_id}",
        {"type": "new.request", "kind": "offer", "data": payload},
    )
