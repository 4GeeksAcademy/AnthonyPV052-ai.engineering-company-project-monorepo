from datetime import datetime, timezone
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from auth_models import UserCreate, UserRoleEnum
from routes import users as route


def test_register_happy_path_hashes_password_and_returns_public_data(monkeypatch):
    created = {
        "id": "user-123",
        "email": "person@example.com",
        "is_active": True,
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    profile = {"id": "profile-1", "user_id": "user-123", "name": "Person", "phone": None, "address": None}
    create = Mock(return_value=(created, profile))
    monkeypatch.setattr(route, "get_user_by_email", lambda email: None)
    monkeypatch.setattr(route, "create_user", create)
    monkeypatch.setattr(route, "hash_password", lambda password: f"hashed:{password}")

    result = route.register_user(UserCreate(email="person@example.com", password="password123", name="Person"))

    assert result.user.id == "user-123"
    assert result.profile.name == "Person"
    assert "hashed_password" not in result.user.model_dump()
    assert create.call_args.kwargs["hashed_password"] == "hashed:password123"
    assert create.call_args.kwargs["role"] is UserRoleEnum.user


def test_register_allows_omitted_optional_profile_fields(monkeypatch):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: None)
    monkeypatch.setattr(route, "hash_password", lambda password: "hash")
    create = Mock(return_value=(
        {"id": "u", "email": "person@example.com", "is_active": True, "role": "user", "created_at": datetime.now(timezone.utc)},
        {"id": "p", "user_id": "u", "name": None, "phone": None, "address": None},
    ))
    monkeypatch.setattr(route, "create_user", create)

    result = route.register_user(UserCreate(email="person@example.com", password="password123"))

    assert result.profile.name is None
    assert create.call_args.kwargs["profile_phone"] is None
    assert create.call_args.kwargs["profile_address"] is None


def test_register_rejects_duplicate_email_without_creating_user(monkeypatch):
    create = Mock()
    monkeypatch.setattr(route, "get_user_by_email", lambda email: {"id": "existing"})
    monkeypatch.setattr(route, "create_user", create)

    with pytest.raises(HTTPException) as exc:
        route.register_user(UserCreate(email="person@example.com", password="password123"))

    assert exc.value.status_code == 409
    create.assert_not_called()


@pytest.mark.parametrize("password", ["", "short"])
def test_register_rejects_empty_or_short_password_at_model_boundary(password):
    with pytest.raises(ValidationError):
        UserCreate(email="person@example.com", password=password)