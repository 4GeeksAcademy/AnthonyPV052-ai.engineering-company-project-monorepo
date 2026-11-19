from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from auth_models import ResetPasswordRequest
from routes import auth as route


def test_reset_password_happy_path_consumes_token_and_saves_hash(monkeypatch):
    monkeypatch.setattr(route, "validate_password_reset_token", lambda token: ("user-123", "jti-1"))
    consume = Mock(return_value=True)
    update = Mock(return_value={"id": "user-123"})
    monkeypatch.setattr(route, "consume_password_reset_token", consume)
    monkeypatch.setattr(route, "hash_password", lambda password: f"hash:{password}")
    monkeypatch.setattr(route, "update_user", update)

    response = route.reset_password(ResetPasswordRequest(token="signed", new_password="newpass8"))

    assert response.message == "Password reset successfully"
    consume.assert_called_once_with(token_id="jti-1", user_id="user-123")
    assert update.call_args.kwargs["hashed_password"] == "hash:newpass8"


def test_reset_password_accepts_minimum_password_length(monkeypatch):
    monkeypatch.setattr(route, "validate_password_reset_token", lambda token: ("u", "j"))
    monkeypatch.setattr(route, "consume_password_reset_token", lambda **kwargs: True)
    monkeypatch.setattr(route, "hash_password", lambda password: "hash")
    monkeypatch.setattr(route, "update_user", lambda *args, **kwargs: {"id": "u"})

    assert route.reset_password(ResetPasswordRequest(token="t", new_password="12345678")).message == "Password reset successfully"
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="t", new_password="1234567")
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="", new_password="12345678")


@pytest.mark.parametrize("failure", ["malformed", "expired"])
def test_reset_password_rejects_invalid_or_expired_tokens(monkeypatch, failure):
    monkeypatch.setattr(route, "validate_password_reset_token", Mock(side_effect=ValueError(failure)))
    consume = Mock()
    monkeypatch.setattr(route, "consume_password_reset_token", consume)

    with pytest.raises(HTTPException) as exc:
        route.reset_password(ResetPasswordRequest(token="bad-token", new_password="newpass8"))

    assert exc.value.status_code == 400
    consume.assert_not_called()


@pytest.mark.parametrize("consumed,updated", [(False, {"id": "u"}), (True, None)])
def test_reset_password_rejects_used_token_or_missing_user(monkeypatch, consumed, updated):
    monkeypatch.setattr(route, "validate_password_reset_token", lambda token: ("u", "j"))
    monkeypatch.setattr(route, "consume_password_reset_token", lambda **kwargs: consumed)
    monkeypatch.setattr(route, "hash_password", lambda password: "hash")
    update = Mock(return_value=updated)
    monkeypatch.setattr(route, "update_user", update)

    with pytest.raises(HTTPException) as exc:
        route.reset_password(ResetPasswordRequest(token="token", new_password="newpass8"))

    assert exc.value.status_code == 400
    if not consumed:
        update.assert_not_called()