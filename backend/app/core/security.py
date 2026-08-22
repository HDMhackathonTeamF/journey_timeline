import base64
import hashlib
import hmac
import json
import secrets
import time
from uuid import UUID

from app.core.config import get_settings

COOKIE_NAME = "journey_edit_session"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, salt_text, digest_text = encoded.split("$", 2)
        actual = hashlib.scrypt(password.encode(), salt=base64.urlsafe_b64decode(salt_text), n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, base64.urlsafe_b64decode(digest_text))
    except (ValueError, TypeError):
        return False


def create_edit_session(journey_id: UUID, lifetime_seconds: int = 60 * 60 * 8) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"journey_id": str(journey_id), "exp": int(time.time()) + lifetime_seconds}, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(get_settings().session_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def session_journey_id(token: str | None) -> UUID | None:
    if not token:
        return None
    try:
        payload, signature = token.rsplit(".", 1)
        expected = hmac.new(get_settings().session_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        padded = payload + "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded))
        if data["exp"] < time.time():
            return None
        return UUID(data["journey_id"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None
