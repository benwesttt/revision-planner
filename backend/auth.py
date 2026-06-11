import os

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models.user import User

CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")

security = HTTPBearer()
_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        headers = {"Authorization": f"Bearer {CLERK_SECRET_KEY}"} if CLERK_SECRET_KEY else {}
        resp = httpx.get(CLERK_JWKS_URL, headers=headers, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


def _decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.exceptions.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")

    kid = header.get("kid")
    jwks = _get_jwks()

    public_key = None
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
            break

    if public_key is None:
        raise HTTPException(status_code=401, detail="Unable to find matching JWKS key")

    try:
        return jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = _decode_token(credentials.credentials)
    clerk_user_id: str | None = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing sub")

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if not user:
        try:
            resp = httpx.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
                timeout=10,
            )
            resp.raise_for_status()
            clerk_data = resp.json()
            email_addresses = clerk_data.get("email_addresses", [])
            email = (
                email_addresses[0]["email_address"]
                if email_addresses
                else f"{clerk_user_id}@clerk.local"
            )
            first = clerk_data.get("first_name") or ""
            last = clerk_data.get("last_name") or ""
            name = f"{first} {last}".strip() or clerk_user_id
        except httpx.HTTPError:
            raise HTTPException(status_code=401, detail="Could not fetch user from Clerk")

        user = User(clerk_user_id=clerk_user_id, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
