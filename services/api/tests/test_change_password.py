from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from auth_models import ChangePasswordRequest
from routes import auth as route


def test_change_password_happy_path_updates_hashed_password(monkeypatch, user):
    monkeypatch.setattr(route, "verify_password", lambda plain, hashed: plain == "current-password")
    monkeypatch.setattr(route, "hash_password", lambda password: f"hash:{password}")
    update = Mock()
    monkeypatch.setattr(route, "update_user", update)

    result = route.change_password(
        ChangePasswordRequest(current_password="current-password", new_password="newpass8"), user
    )

    assert result.message == "Password changed successfully"
    assert update.call_args.args[0] == user["id"]
    assert update.call_args.kwargs["hashed_password"] == "hash:newpass8"


def test_change_password_accepts_minimum_and_rejects_short_new_password():
    assert ChangePasswordRequest(current_password="", new_password="12345678").new_password == "12345678"
    with pytest.raises(ValidationError):
        ChangePasswordRequest(current_password="current", new_password="1234567")


def test_change_password_rejects_incorrect_current_password_without_update(monkeypatch, user):
    monkeypatch.setattr(route, "verify_password", lambda plain, hashed: False)
    update = Mock()
    monkeypatch.setattr(route, "update_user", update)

    with pytest.raises(HTTPException) as exc:
        route.change_password(ChangePasswordRequest(current_password="wrong", new_password="newpass8"), user)

    assert exc.value.status_code == 400
    update.assert_not_called()