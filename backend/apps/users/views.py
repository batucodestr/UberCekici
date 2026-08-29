from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.common.permissions import IsAdminRole

from .models import User
from .serializers import (
    AdminSetPasswordSerializer,
    AdminUserSerializer,
    ChangePasswordSerializer,
    RegisterSerializer,
    RoleAwareTokenObtainPairSerializer,
    UserSerializer,
)

REFRESH_COOKIE_MAX_AGE = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
REFRESH_COOKIE_PATH = "/api/auth/"


def _set_refresh_cookie(response, refresh_token: str) -> None:
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.SITE_USES_HTTPS,
        samesite="Lax",
        path=REFRESH_COOKIE_PATH,
    )


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_scope = "auth"


class LoginView(TokenObtainPairView):
    serializer_class = RoleAwareTokenObtainPairSerializer
    permission_classes = (permissions.AllowAny,)
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        refresh_token = response.data.pop("refresh", None)
        if refresh_token:
            _set_refresh_cookie(response, refresh_token)
        return response


class RefreshView(TokenRefreshView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response({"detail": "Oturum bulunamadı."}, status=401)

        serializer = self.get_serializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response({"detail": "Oturum geçersiz, tekrar giriş yapın."}, status=401)
            response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
            return response

        data = dict(serializer.validated_data)
        new_refresh_token = data.pop("refresh", None)
        response = Response(data, status=200)
        if new_refresh_token:
            _set_refresh_cookie(response, new_refresh_token)
        return response


class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        refresh_token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        response = Response(status=204)
        response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
        return response


class ProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=UserSerializer, responses=UserSerializer)
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(request=ChangePasswordSerializer, responses=None)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return Response(status=204)


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = AdminUserSerializer
    permission_classes = (permissions.IsAuthenticated, IsAdminRole)
    filterset_fields = ("role", "is_active_account", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name", "phone_number")
    ordering_fields = ("date_joined", "username", "role")

    @extend_schema(request=AdminSetPasswordSerializer, responses=None)
    @action(detail=True, methods=["post"], url_path="set-password")
    def set_password(self, request, pk=None):
        user = self.get_object()
        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        return Response(status=204)
