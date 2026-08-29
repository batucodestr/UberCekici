import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("cekicim")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "cleanup-stale-driver-locations": {
        "task": "apps.drivers.tasks.cleanup_stale_locations",
        "schedule": 60.0,
    },
    "check-request-timeouts": {
        "task": "apps.requests.tasks.check_request_timeouts",
        "schedule": 30.0,
    },
    "cleanup-old-audit-logs": {
        "task": "apps.analytics.tasks.cleanup_old_logs",
        "schedule": 3600.0,
    },
}
