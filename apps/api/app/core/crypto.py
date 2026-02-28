"""加解密工具（用于敏感字段）"""

from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _get_fernet() -> Optional[Fernet]:
    key = settings.LLM_SECRET_KEY
    if not key:
        return None
    return Fernet(key.encode())


def encrypt_secret(value: str) -> str:
    """
    使用 LLM_SECRET_KEY 加密敏感数据。
    未配置密钥时，直接返回原值（兼容迁移期）。
    """
    fernet = _get_fernet()
    if not fernet:
        return value
    return fernet.encrypt(value.encode()).decode()


def decrypt_secret(value: str) -> str:
    """
    使用 LLM_SECRET_KEY 解密敏感数据。
    未配置密钥时，直接返回原值（兼容迁移期）。
    """
    fernet = _get_fernet()
    if not fernet:
        return value
    try:
        return fernet.decrypt(value.encode()).decode()
    except InvalidToken:
        # 兼容未加密数据
        return value
