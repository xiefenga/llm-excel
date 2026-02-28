"""LLM 配置加载（从数据库读取）"""

import logging
from typing import Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import decrypt_secret
from app.engine.llm_types import LLMProviderConfig, LLMModelConfig, LLMStageConfig
from app.models.llm import LLMProvider, LLMModel, LLMCredential, LLMStageRoute, LLMStatus

logger = logging.getLogger(__name__)


class LLMConfigError(RuntimeError):
    """LLM 配置错误"""


async def load_stage_configs(
    db: AsyncSession,
) -> Dict[str, LLMStageConfig]:
    """
    加载阶段路由配置（全局）
    """
    result = await db.execute(
        select(LLMStageRoute).where(LLMStageRoute.is_active.is_(True))
    )
    routes = result.scalars().all()

    if not routes:
        raise LLMConfigError("LLM 路由未配置，请在管理后台配置 llm_stage_routes。")

    stage_configs: Dict[str, LLMStageConfig] = {}

    for route in routes:
        provider = await db.get(LLMProvider, route.provider_id)
        if not provider or provider.status != LLMStatus.ENABLED:
            raise LLMConfigError(f"Provider 不存在或已禁用: {route.provider_id}")

        model = await db.get(LLMModel, route.model_id)
        if not model or model.status != LLMStatus.ENABLED:
            raise LLMConfigError(f"Model 不存在或已禁用: {route.model_id}")

        cred_result = await db.execute(
            select(LLMCredential)
            .where(LLMCredential.provider_id == provider.id)
            .where(LLMCredential.status == LLMStatus.ENABLED)
            .order_by(LLMCredential.updated_at.desc())
            .limit(1)
        )
        credential = cred_result.scalar_one_or_none()
        api_key = None
        if credential and credential.secret_type == "api_key":
            api_key = decrypt_secret(credential.secret_value)

        stage_configs[route.stage] = LLMStageConfig(
            stage=route.stage,
            provider=LLMProviderConfig(
                id=provider.id,
                name=provider.name,
                type=provider.type,
                base_url=provider.base_url,
                api_key=api_key,
                capabilities=provider.capabilities or {},
            ),
            model=LLMModelConfig(
                id=model.id,
                name=model.name,
                model_id=model.model_id,
                defaults=model.defaults or {},
                limits=model.limits or {},
            ),
        )

    return stage_configs
