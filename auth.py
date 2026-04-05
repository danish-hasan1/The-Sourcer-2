from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import config

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=config.TOKEN_EXPIRE_MINS),
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)


def decode_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        return int(payload.get("sub"))
    except (JWTError, ValueError):
        return None


def login_user(email: str, password: str):
    """Returns (user, token) or raises ValueError."""
    from db import get_session, User
    db = get_session()
    try:
        user = db.query(User).filter_by(email=email, active=True).first()
        if not user or not verify_password(password, user.hashed_pw):
            raise ValueError("Invalid email or password")
        token = create_token(user.id)
        return user, token
    finally:
        db.close()


def signup_user(name: str, email: str, password: str, company: str = ""):
    """Returns (user, token) or raises ValueError."""
    from db import get_session, User
    db = get_session()
    try:
        if db.query(User).filter_by(email=email).first():
            raise ValueError("Email already registered")
        user = User(name=name, email=email, company=company, hashed_pw=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_token(user.id)
        return user, token
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_user_from_session():
    """Get current user from Streamlit session state."""
    import streamlit as st
    from db import get_session, User
    token = st.session_state.get("token")
    if not token:
        return None
    user_id = decode_token(token)
    if not user_id:
        return None
    db = get_session()
    try:
        return db.query(User).filter_by(id=user_id, active=True).first()
    finally:
        db.close()
