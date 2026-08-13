from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from auth_models import AuthMeResponse, LoginRequest, ProfilePublic, TokenResponse, UserRoleEnum
from security import create_access_token, get_access_token_expire_minutes, get_current_user, verify_password
from users_service import get_profile_by_user_id, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


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