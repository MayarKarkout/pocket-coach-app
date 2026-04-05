import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, HTTPException, Response
import bcrypt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from app.db import SessionLocal
from app.models import Session, User

SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))

router = APIRouter()


def get_db() -> DBSession:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from fastapi import Depends


class LoginRequest(BaseModel):
    email: str
    password: str


class MeResponse(BaseModel):
    id: int
    email: str


def get_current_user(
    session: str | None = Cookie(default=None),
    db: DBSession = Depends(get_db),
) -> User:
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    now = datetime.now(timezone.utc)
    db_session = db.scalar(
        select(Session).where(Session.token == session, Session.expires_at > now)
    )
    if db_session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_session.expires_at = now + timedelta(days=SESSION_TTL_DAYS)
    db.commit()

    return db_session.user


@router.post("/login")
def login(body: LoginRequest, response: Response, db: DBSession = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == body.email))
    if user is None or not bcrypt.checkpw(body.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    db_session = Session(user_id=user.id, token=token, expires_at=expires_at)
    db.add(db_session)
    db.commit()

    response.set_cookie(
        key="session",
        value=token,
        max_age=SESSION_TTL_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return {"ok": True}


@router.post("/logout")
def logout(
    response: Response,
    session: str | None = Cookie(default=None),
    db: DBSession = Depends(get_db),
) -> dict:
    if session is not None:
        db_session = db.scalar(select(Session).where(Session.token == session))
        if db_session is not None:
            db.delete(db_session)
            db.commit()

    response.delete_cookie(key="session")
    return {"ok": True}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(id=current_user.id, email=current_user.email)
