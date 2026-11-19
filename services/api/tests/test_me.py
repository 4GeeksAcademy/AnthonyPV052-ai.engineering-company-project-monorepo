import pytest
from fastapi import HTTPException

from auth_models import UserRoleEnum
from routes import auth as route
from security import get_current_user


def test_me_happy_path_returns_identity_and_profile(monkeypatch, user):
    profile = {"id": "profile-1", "user_id": user["id"], "name": "Person", "phone": None, "address": None}
    monkeypatch.setattr(route, "get_profile_by_user_id", lambda user_id: profile)

    response = route.me(user)

    assert response.id == user["id"]
    assert response.role is UserRoleEnum.user
    assert response.profile.name == "Person"


def test_me_returns_none_when_profile_is_missing(monkeypatch, user):
    monkeypatch.setattr(route, "get_profile_by_user_id", lambda user_id: None)

    assert route.me(user).profile is None


def test_me_rejects_unknown_stored_role(monkeypatch, user):
    monkeypatch.setattr(route, "get_profile_by_user_id", lambda user_id: None)
    invalid_user = {**user, "role": "superuser"}

    with pytest.raises(ValueError):
        route.me(invalid_user)


@pytest.mark.parametrize("token", ["malformed", ""])
def test_current_user_rejects_malformed_or_missing_token(monkeypatch, token):
    monkeypatch.setattr("security.get_secret_key", lambda: "test-secret")
    with pytest.raises(HTTPException) as exc:
        get_current_user(token)
    assert exc.value.status_code == 401


def test_current_user_rejects_expired_token(monkeypatch):
    from datetime import datetime, timedelta, timezone
    from jose import jwt

    monkeypatch.setattr("security.get_secret_key", lambda: "test-secret")
    token = jwt.encode(
        {"sub": "user-1", "exp": int((datetime.now(timezone.utc) - timedelta(minutes=1)).timestamp())},
        "test-secret",
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as exc:
        get_current_user(token)
    assert exc.value.status_code == 401


def test_current_user_rejects_inactive_and_unknown_users(monkeypatch):
    from datetime import datetime, timedelta, timezone
    from jose import jwt

    monkeypatch.setattr("security.get_secret_key", lambda: "test-secret")
    token = jwt.encode(
        {"sub": "user-1", "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp())},
        "test-secret",
        algorithm="HS256",
    )
    for result in (None, {"id": "user-1", "is_active": False}):
        monkeypatch.setattr("security.get_user_by_id", lambda user_id, result=result: result)
        with pytest.raises(HTTPException) as exc:
            get_current_user(token)
        assert exc.value.status_code == 401