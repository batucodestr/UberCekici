import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class DriverLocationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
            return
        self.group_name = f"driver_{self.scope['user'].id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def location_update(self, event):
        await self.send(text_data=json.dumps(event))

    async def new_request(self, event):
        await self.send(text_data=json.dumps({"kind": event["kind"], "data": event["data"]}))
