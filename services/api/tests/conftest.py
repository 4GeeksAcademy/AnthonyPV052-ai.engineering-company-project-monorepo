from __future__ import annotations

import pytest


@pytest.fixture
def user() -> dict:
    return {
        "id": "user-123",
        "email": "person@example.com",
        "hashed_password": "hashed-password",
        "role": "user",
        "is_active": True,
    }