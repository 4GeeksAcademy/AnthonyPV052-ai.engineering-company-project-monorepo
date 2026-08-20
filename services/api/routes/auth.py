#este archivo contiene las rutas de autenticación para la API, incluyendo inicio de sesión, recuperación de contraseña, cambio de contraseña y obtención de información del usuario autenticado.
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from auth_models import (
    AuthMeResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfilePublic,
    ResetPasswordRequest,
    TokenResponse,
    UserUpdate,
    UserRoleEnum,
)
from email_service import send_password_reset_email
from security import (
    create_access_token,
    create_password_reset_token,
    get_access_token_expire_minutes,
    get_current_user,
    hash_password,
    validate_password_reset_token,
    verify_password,
)
from users_service import (
    consume_password_reset_token,
    create_password_reset_token_record,
    get_profile_by_user_id,
    get_user_by_email,
    update_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = get_user_by_email(payload.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(user_id=user["id"])
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=get_access_token_expire_minutes() * 60,
    )


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, str]:
    """Return the same response whether or not the email belongs to an account."""
    user = get_user_by_email(payload.email.strip())
    if user is not None:
        try:
            token, token_id, expires_at = create_password_reset_token(user_id=user["id"])
            create_password_reset_token_record(token_id=token_id, user_id=user["id"], expires_at=expires_at)
            send_password_reset_email(recipient=user["email"], reset_token=token, expires_at=expires_at)
        except Exception:
            # Do not disclose delivery or account information to the requester.
            logger.exception("Password-reset email delivery failed")

    return {"message": "If that address is registered, you will receive a reset link shortly."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict[str, str]:
    try:
        user_id, token_id = validate_password_reset_token(payload.token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid, expired, or used reset token") from exc

    if not consume_password_reset_token(token_id=token_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid, expired, or used reset token")

    updated_user = update_user(user_id, UserUpdate(), hashed_password=hash_password(payload.new_password))
    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid, expired, or used reset token")
    return {"message": "Password reset successfully"}


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)) -> dict[str, str]:
    if not verify_password(payload.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    update_user(current_user["id"], UserUpdate(), hashed_password=hash_password(payload.new_password))
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=AuthMeResponse)
def me(current_user: dict = Depends(get_current_user)) -> AuthMeResponse:
    profile = get_profile_by_user_id(current_user["id"])
    profile_payload = ProfilePublic(**profile) if profile else None
    return AuthMeResponse(
        id=current_user["id"],
        email=current_user["email"],
        role=UserRoleEnum(current_user["role"]),
        profile=profile_payload,
    )
