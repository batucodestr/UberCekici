import json

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AdminLiveConsumer(AsyncJsonWebsocketConsumer):
    GROUP_NAME = "admin_live"

    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous or getattr(user, "role", None) != "admin":
            await self.close()
            return
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def driver_location(self, event):
        await self.send(text_data=json.dumps({"kind": event["kind"], "data": event["data"]}))

    async def request_update(self, event):
        await self.send(text_data=json.dumps({"kind": event["kind"], "data": event["data"]}))
