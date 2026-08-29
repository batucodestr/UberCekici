import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class RequestTrackingConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
            return
        self.request_id = self.scope["url_route"]["kwargs"]["request_id"]
        self.group_name = f"request_{self.request_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def request_update(self, event):
        await self.send(text_data=json.dumps({"kind": event["kind"], "data": event["data"]}))

    async def driver_location(self, event):
        await self.send(text_data=json.dumps({"kind": event["kind"], "data": event["data"]}))
