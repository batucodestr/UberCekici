from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Driver, DriverLocation


class DriverLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverLocation
        fields = ("latitude", "longitude", "heading", "updated_at")
        read_only_fields = ("updated_at",)


class NearbyDriverSerializer(serializers.ModelSerializer):
    latitude = serializers.DecimalField(source="location.latitude", max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(source="location.longitude", max_digits=9, decimal_places=6)

    class Meta:
        model = Driver
        fields = ("id", "vehicle_model", "latitude", "longitude")


class DriverSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    location = DriverLocationSerializer(read_only=True)

    class Meta:
        model = Driver
        fields = (
            "id",
            "user",
            "is_online",
            "approval_status",
            "vehicle_plate",
            "vehicle_model",
            "total_earnings",
            "rating",
            "location",
            "created_at",
        )
        read_only_fields = ("id", "approval_status", "total_earnings", "rating", "created_at")


class AdminDriverSerializer(DriverSerializer):
    class Meta(DriverSerializer.Meta):
        read_only_fields = ("id", "total_earnings", "rating", "created_at")
