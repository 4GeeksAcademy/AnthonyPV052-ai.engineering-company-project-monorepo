from __future__ import annotations

import logging
import os
import smtplib
import ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from urllib.parse import quote

logger = logging.getLogger(__name__)


def send_password_reset_email(*, recipient: str, reset_token: str, expires_at: datetime) -> None:
    smtp_host = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_login = os.getenv("SMTP_LOGIN")
    # Accept the user's existing SMPT_KEY spelling as a fallback; SMTP_KEY is
    # the canonical name for new configurations.
    smtp_key = os.getenv("SMTP_KEY") or os.getenv("SMPT_KEY")
    sender = os.getenv("SMTP_FROM_EMAIL")
    app_base_url = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")

    missing = [
        name
        for name, value in (
            ("SMTP_LOGIN", smtp_login),
            ("SMTP_KEY (or legacy SMPT_KEY)", smtp_key),
            ("SMTP_FROM_EMAIL", sender),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing SMTP configuration: {', '.join(missing)}")

    reset_url = f"{app_base_url}/reset-password?token={quote(reset_token, safe='')}"
    remaining_minutes = max(1, round((expires_at - datetime.now(timezone.utc)).total_seconds() / 60))
    message = EmailMessage()
    message["Subject"] = "Restablece tu contraseña de Brasaland"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        "Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"Abre este enlace para continuar: {reset_url}\n\n"
        f"Este enlace caduca en {remaining_minutes} minutos y solo puede utilizarse una vez."
    )
    message.add_alternative(
        "<p>Recibimos una solicitud para restablecer tu contraseña.</p>"
        f'<p><a href="{reset_url}">Restablecer contraseña</a></p>'
        f"<p>Este enlace caduca en {remaining_minutes} minutos y solo puede utilizarse una vez.</p>",
        subtype="html",
    )

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            smtp.login(smtp_login, smtp_key)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        logger.warning("Could not send password-reset email through Brevo SMTP: %s", exc)
        raise RuntimeError("Could not send password reset email") from exc
