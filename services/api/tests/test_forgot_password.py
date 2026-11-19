from datetime import datetime, timezone
from unittest.mock import Mock

from auth_models import ForgotPasswordRequest
from routes import auth as route


GENERIC_MESSAGE = "If that address is registered, you will receive a reset link shortly."


def test_forgot_password_creates_one_time_record_and_sends_email(monkeypatch, user):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: user)
    monkeypatch.setattr(route, "create_password_reset_token", lambda *, user_id: ("signed-token", "jti-1", datetime.now(timezone.utc)))
    record = Mock()
    mail = Mock()
    monkeypatch.setattr(route, "create_password_reset_token_record", record)
    monkeypatch.setattr(route, "send_password_reset_email", mail)

    response = route.forgot_password(ForgotPasswordRequest(email=user["email"]))

    assert response.message == GENERIC_MESSAGE
    record.assert_called_once()
    mail.assert_called_once_with(recipient=user["email"], reset_token="signed-token", expires_at=record.call_args.kwargs["expires_at"])


def test_forgot_password_trims_email_and_unknown_address_is_generic(monkeypatch):
    lookup = Mock(return_value=None)
    mail = Mock()
    monkeypatch.setattr(route, "get_user_by_email", lookup)
    monkeypatch.setattr(route, "send_password_reset_email", mail)

    response = route.forgot_password(ForgotPasswordRequest(email="  nobody@example.com  "))

    assert lookup.call_args.args == ("nobody@example.com",)
    assert response.message == GENERIC_MESSAGE
    mail.assert_not_called()


def test_forgot_password_hides_token_creation_failure(monkeypatch, user):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: user)
    monkeypatch.setattr(route, "create_password_reset_token", Mock(side_effect=RuntimeError("internal detail")))
    mail = Mock()
    monkeypatch.setattr(route, "send_password_reset_email", mail)

    response = route.forgot_password(ForgotPasswordRequest(email=user["email"]))

    assert response.message == GENERIC_MESSAGE
    mail.assert_not_called()


def test_forgot_password_hides_delivery_failure(monkeypatch, user):
    monkeypatch.setattr(route, "get_user_by_email", lambda email: user)
    monkeypatch.setattr(route, "create_password_reset_token", lambda *, user_id: ("token", "jti", datetime.now(timezone.utc)))
    monkeypatch.setattr(route, "create_password_reset_token_record", Mock())
    monkeypatch.setattr(route, "send_password_reset_email", Mock(side_effect=RuntimeError("mail unavailable")))

    assert route.forgot_password(ForgotPasswordRequest(email=user["email"])).message == GENERIC_MESSAGE