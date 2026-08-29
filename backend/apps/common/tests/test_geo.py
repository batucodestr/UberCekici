from unittest.mock import patch

import requests

from apps.common.geo import reverse_geocode


def test_reverse_geocode_returns_display_name_on_success():
    fake_response = type(
        "FakeResponse",
        (),
        {"raise_for_status": lambda self: None, "json": lambda self: {"display_name": "Kadıköy, İstanbul"}},
    )()
    with patch("apps.common.geo.requests.get", return_value=fake_response):
        assert reverse_geocode(40.99, 29.03) == "Kadıköy, İstanbul"


def test_reverse_geocode_falls_back_to_coordinates_on_network_error():
    with patch("apps.common.geo.requests.get", side_effect=requests.ConnectionError):
        result = reverse_geocode(40.99, 29.03)
    assert result == "40.990000, 29.030000"


def test_reverse_geocode_falls_back_when_display_name_missing():
    fake_response = type(
        "FakeResponse", (), {"raise_for_status": lambda self: None, "json": lambda self: {}}
    )()
    with patch("apps.common.geo.requests.get", return_value=fake_response):
        assert reverse_geocode(1.5, 2.5) == "1.500000, 2.500000"
