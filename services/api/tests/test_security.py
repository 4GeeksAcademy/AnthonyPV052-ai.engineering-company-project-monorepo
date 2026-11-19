from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

import security


def test_hash_password_round_trip_and_wrong_password():
    encoded = security.hash_password("correct-password")

    assert encoded != "correct-password"
    assert security.verify_password("correct-password", encoded)
    assert not security.verify_password("wrong-password", encoded)


def test_create_access_token_uses_configured_expiration(monkeypatch):
    monkeypatch.setattr(security, "get_secret_key", lambda: "test-secret")
    token = security.create_access_token(user_id="user-1", expires_delta=timedelta(minutes=5))

    claims = jwt.decode(token, "test-secret", algorithms=[security.ALGORITHM])
    assert claims["sub"] == "user-1"
    assert datetime.fromtimestamp(claims["exp"], timezone.utc) > datetime.now(timezone.utc)


def test_create_and_validate_password_reset_token(monkeypatch):
    monkeypatch.setattr(security, "get_secret_key", lambda: "test-secret")
    token, token_id, expires_at = security.create_password_reset_token(user_id="user-1")

    assert expires_at > datetime.now(timezone.utc)
    assert security.validate_password_reset_token(token) == ("user-1", token_id)


@pytest.mark.parametrize(
    "claims",
    [
        {"sub": "user-1", "jti": "jti-1", "purpose": "access"},
        {"sub": "", "jti": "jti-1", "purpose": "password_reset"},
        {"sub": "user-1", "jti": "", "purpose": "password_reset"},
    ],
)
def test_validate_password_reset_token_rejects_wrong_claims(monkeypatch, claims):
    monkeypatch.setattr(security, "get_secret_key", lambda: "test-secret")
    signed = jwt.encode(
        {**claims, "exp": int((datetime.now(timezone.utc) + timedelta(minutes=1)).timestamp())},
        "test-secret",
        algorithm=security.ALGORITHM,
    )

    with pytest.raises(ValueError):
        security.validate_password_reset_token(signed)


def test_validate_password_reset_token_rejects_expired_token(monkeypatch):
    monkeypatch.setattr(security, "get_secret_key", lambda: "test-secret")
    token = jwt.encode(
        {
            "sub": "user-1",
            "jti": "jti-1",
            "purpose": "password_reset",
            "exp": int((datetime.now(timezone.utc) - timedelta(minutes=1)).timestamp()),
        },
        "test-secret",
        algorithm=security.ALGORITHM,
    )

    with pytest.raises(ValueError):
        security.validate_password_reset_token(token)


def test_environment_configuration_defaults_and_invalid_values(monkeypatch):
    monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
    monkeypatch.delenv("ACCESS_TOKEN_EXPIRE_MINUTES", raising=False)
    monkeypatch.delenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", raising=False)

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY is required"):
        security.get_secret_key()
    assert security.get_access_token_expire_minutes() == 30
    assert security.get_password_reset_token_expire_minutes() == 15

    for variable, getter in (
        ("ACCESS_TOKEN_EXPIRE_MINUTES", security.get_access_token_expire_minutes),
        ("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", security.get_password_reset_token_expire_minutes),
    ):
        monkeypatch.setenv(variable, "not-an-integer")
        with pytest.raises(RuntimeError, match="valid integer"):
            getter()
        monkeypatch.setenv(variable, "0")
        with pytest.raises(RuntimeError, match="greater than 0"):
            getter()