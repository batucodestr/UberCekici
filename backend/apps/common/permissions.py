from rest_framework.permissions import BasePermission

from apps.users.models import User


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.Role.CUSTOMER)


class IsDriver(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.Role.DRIVER)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.Role.ADMIN)
