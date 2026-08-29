from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = ("id", "user", "default_address", "loyalty_points", "created_at")
        read_only_fields = ("id", "loyalty_points", "created_at")
