"""JWT 工具函数"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(
    user_id: UUID,
    username: str,
    roles: list[str],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """创建访问令牌"""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "username": username,
        "roles": roles,
        "exp": expire,
        "iat": now,
        "type": "access",
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    user_id: UUID,
    token_id: UUID,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """创建刷新令牌"""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "token_id": str(token_id),
        "exp": expire,
        "iat": now,
        "type": "refresh",
    }
    encoded_jwt = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """解码令牌"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """验证令牌"""
    payload = decode_token(token)
    if not payload:
        return None

    # 检查令牌类型
    if payload.get("type") != token_type:
        return None

    # 检查是否过期（jwt.decode 已经检查了，这里只是额外验证）
    exp = payload.get("exp")
    if exp and datetime.now(timezone.utc).timestamp() > exp:
        return None

    return payload
