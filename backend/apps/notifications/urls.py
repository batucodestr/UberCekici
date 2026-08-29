from django.urls import path

from .views import MarkNotificationReadView, MyNotificationsView

urlpatterns = [
    path("notifications/", MyNotificationsView.as_view(), name="notifications-mine"),
    path(
        "notifications/<int:pk>/read/",
        MarkNotificationReadView.as_view(),
        name="notification-read",
    ),
]
