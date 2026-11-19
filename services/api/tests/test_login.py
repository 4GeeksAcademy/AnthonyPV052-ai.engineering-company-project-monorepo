from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from auth_models import LoginRequest
from routes import auth as route


def test_login_happy_path_returns_token_and_configured_expiry(monkeypatch, user):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: user)
    verify = Mock(return_value=True)
    monkeypatch.setattr(route, "verify_password", verify)
    monkeypatch.setattr(route, "create_access_token", lambda *, user_id: f"jwt:{user_id}")
    monkeypatch.setattr(route, "get_access_token_expire_minutes", lambda: 20)

    response = route.login(LoginRequest(email=user["email"], password="correct-horse"))

    assert response.access_token == "jwt:user-123"
    assert response.token_type == "bearer"
    assert response.expires_in == 1200
    verify.assert_called_once_with("correct-horse", "hashed-password")


def test_login_rejects_empty_password_as_invalid_credentials(monkeypatch, user):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: user)
    monkeypatch.setattr(route, "verify_password", lambda plain, hashed: False)

    with pytest.raises(HTTPException) as exc:
        route.login(LoginRequest(email=user["email"], password=""))

    assert exc.value.status_code == 401


def test_login_rejects_unknown_email(monkeypatch):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: None)
    verify = Mock()
    monkeypatch.setattr(route, "verify_password", verify)

    with pytest.raises(HTTPException) as exc:
        route.login(LoginRequest(email="missing@example.com", password="password123"))

    assert exc.value.status_code == 401
    verify.assert_not_called()


def test_login_rejects_incorrect_password(monkeypatch, user):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: user)
    monkeypatch.setattr(route, "verify_password", lambda plain, hashed: False)

    with pytest.raises(HTTPException) as exc:
        route.login(LoginRequest(email=user["email"], password="wrong-password"))

    assert exc.value.status_code == 401