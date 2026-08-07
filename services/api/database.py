from __future__ import annotations

from pathlib import Path

from tinydb import TinyDB

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SUPPLIERS_DB_FILE = DATA_DIR / "suppliers.json"
USERS_DB_FILE = DATA_DIR / "users.json"
PROFILES_DB_FILE = DATA_DIR / "profiles.json"


def _open_db(file_path: Path) -> TinyDB:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return TinyDB(file_path)


def get_db() -> TinyDB:
    return _open_db(SUPPLIERS_DB_FILE)


def get_users_db() -> TinyDB:
    return _open_db(USERS_DB_FILE)


def get_profiles_db() -> TinyDB:
    return _open_db(PROFILES_DB_FILE)
