"""LLM 配置管理路由"""

import json
import logging
import traceback
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import check_permission
from app.core.database import get_db
from app.core.permissions import Permissions
from app.core.crypto import decrypt_secret, encrypt_secret
from app.engine.llm_providers.registry import ProviderRegistry
from app.engine.llm_types import LLMProviderConfig, LLMRequest
from app.models.llm import (
    LLMProvider,
    LLMModel,
    LLMCredential,
    LLMStageRoute,
    LLMStatus,
)
from app.schemas.response import ApiResponse

logger = logging.getLogger(__name__)

_registry = ProviderRegistry()

router = APIRouter(prefix="/llm", tags=["llm"])


# ==================== Schemas ====================


class ProviderInfo(BaseModel):
    id: str
    name: str
    type: str
    base_url: Optional[str]
    status: int
    capabilities: Dict[str, Any]
    created_at: str
    updated_at: str


class ProviderCreate(BaseModel):
    name: str
    type: str
    base_url: Optional[str] = None
    status: int = Field(default=int(LLMStatus.ENABLED))
    capabilities: Dict[str, Any] = Field(default_factory=dict)


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    base_url: Optional[str] = None
    status: Optional[int] = None
    capabilities: Optional[Dict[str, Any]] = None


class ModelInfo(BaseModel):
    id: str
    provider_id: str
    name: str
    model_id: str
    limits: Dict[str, Any]
    defaults: Dict[str, Any]
    status: int
    created_at: str
    updated_at: str


class ModelCreate(BaseModel):
    provider_id: str
    name: str
    model_id: str
    limits: Dict[str, Any] = Field(default_factory=dict)
    defaults: Dict[str, Any] = Field(default_factory=dict)
    status: int = Field(default=int(LLMStatus.ENABLED))


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    model_id: Optional[str] = None
    limits: Optional[Dict[str, Any]] = None
    defaults: Optional[Dict[str, Any]] = None
    status: Optional[int] = None


class CredentialInfo(BaseModel):
    id: str
    provider_id: str
    secret_type: str
    status: int
    meta: Dict[str, Any]
    has_secret: bool
    secret_masked: Optional[str] = None
    created_at: str
    updated_at: str


class CredentialCreate(BaseModel):
    provider_id: str
    secret_type: str = Field(default="api_key")
    secret_value: str = Field(..., description="原始密钥，将被加密存储")
    status: int = Field(default=int(LLMStatus.ENABLED))
    meta: Dict[str, Any] = Field(default_factory=dict)


class CredentialUpdate(BaseModel):
    secret_type: Optional[str] = None
    secret_value: Optional[str] = Field(default=None, description="可选，提供则覆盖加密存储")
    status: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None


def _mask_secret(encrypted_value: Optional[str]) -> Optional[str]:
    """解密后返回掩码形式，如 sk-abcd****efgh"""
    if not encrypted_value:
        return None
    plain = decrypt_secret(encrypted_value)
    if len(plain) <= 8:
        return "*" * len(plain)
    return plain[:4] + "*" * (len(plain) - 8) + plain[-4:]


class StageRouteInfo(BaseModel):
    stage: str
    provider_id: str
    model_id: str
    is_active: bool
    created_at: str
    updated_at: str


class StageRouteUpsert(BaseModel):
    provider_id: str
    model_id: str
    is_active: bool = True


# ==================== Providers ====================


@router.get(
    "/providers",
    response_model=ApiResponse[List[ProviderInfo]],
    summary="获取 Provider 列表",
)
async def list_providers(
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMProvider).order_by(LLMProvider.created_at.asc()))
    providers = result.scalars().all()

    data = [
        ProviderInfo(
            id=str(p.id),
            name=p.name,
            type=p.type,
            base_url=p.base_url,
            status=int(p.status),
            capabilities=p.capabilities or {},
            created_at=p.created_at.isoformat(),
            updated_at=p.updated_at.isoformat(),
        )
        for p in providers
    ]
    return ApiResponse(code=0, data=data, msg="获取成功")


@router.post(
    "/providers",
    response_model=ApiResponse[ProviderInfo],
    summary="创建 Provider",
)
async def create_provider(
    payload: ProviderCreate,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    provider = LLMProvider(
        name=payload.name,
        type=payload.type,
        base_url=payload.base_url,
        status=payload.status,
        capabilities=payload.capabilities,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)

    return ApiResponse(
        code=0,
        data=ProviderInfo(
            id=str(provider.id),
            name=provider.name,
            type=provider.type,
            base_url=provider.base_url,
            status=int(provider.status),
            capabilities=provider.capabilities or {},
            created_at=provider.created_at.isoformat(),
            updated_at=provider.updated_at.isoformat(),
        ),
        msg="创建成功",
    )


@router.get(
    "/providers/{provider_id}",
    response_model=ApiResponse[ProviderInfo],
    summary="获取 Provider 详情",
)
async def get_provider(
    provider_id: str,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        provider_uuid = UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    return ApiResponse(
        code=0,
        data=ProviderInfo(
            id=str(provider.id),
            name=provider.name,
            type=provider.type,
            base_url=provider.base_url,
            status=int(provider.status),
            capabilities=provider.capabilities or {},
            created_at=provider.created_at.isoformat(),
            updated_at=provider.updated_at.isoformat(),
        ),
        msg="获取成功",
    )


@router.patch(
    "/providers/{provider_id}",
    response_model=ApiResponse[ProviderInfo],
    summary="更新 Provider",
)
async def update_provider(
    provider_id: str,
    payload: ProviderUpdate,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        provider_uuid = UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    if payload.name is not None:
        provider.name = payload.name
    if payload.type is not None:
        provider.type = payload.type
    if payload.base_url is not None:
        provider.base_url = payload.base_url
    if payload.status is not None:
        provider.status = payload.status
    if payload.capabilities is not None:
        provider.capabilities = payload.capabilities

    await db.commit()
    await db.refresh(provider)

    return ApiResponse(
        code=0,
        data=ProviderInfo(
            id=str(provider.id),
            name=provider.name,
            type=provider.type,
            base_url=provider.base_url,
            status=int(provider.status),
            capabilities=provider.capabilities or {},
            created_at=provider.created_at.isoformat(),
            updated_at=provider.updated_at.isoformat(),
        ),
        msg="更新成功",
    )


@router.delete(
    "/providers/{provider_id}",
    response_model=ApiResponse[None],
    summary="删除 Provider",
)
async def delete_provider(
    provider_id: str,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        provider_uuid = UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    await db.delete(provider)
    await db.commit()

    return ApiResponse(code=0, data=None, msg="删除成功")


# ==================== Models ====================


@router.get(
    "/models",
    response_model=ApiResponse[List[ModelInfo]],
    summary="获取 Model 列表",
)
async def list_models(
    provider_id: Optional[str] = None,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LLMModel).order_by(LLMModel.created_at.asc())
    if provider_id:
        try:
            provider_uuid = UUID(provider_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")
        stmt = stmt.where(LLMModel.provider_id == provider_uuid)

    result = await db.execute(stmt)
    models = result.scalars().all()

    data = [
        ModelInfo(
            id=str(m.id),
            provider_id=str(m.provider_id),
            name=m.name,
            model_id=m.model_id,
            limits=m.limits or {},
            defaults=m.defaults or {},
            status=int(m.status),
            created_at=m.created_at.isoformat(),
            updated_at=m.updated_at.isoformat(),
        )
        for m in models
    ]
    return ApiResponse(code=0, data=data, msg="获取成功")


@router.post(
    "/models",
    response_model=ApiResponse[ModelInfo],
    summary="创建 Model",
)
async def create_model(
    payload: ModelCreate,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        provider_uuid = UUID(payload.provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    model = LLMModel(
        provider_id=provider.id,
        name=payload.name,
        model_id=payload.model_id,
        limits=payload.limits,
        defaults=payload.defaults,
        status=payload.status,
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)

    return ApiResponse(
        code=0,
        data=ModelInfo(
            id=str(model.id),
            provider_id=str(model.provider_id),
            name=model.name,
            model_id=model.model_id,
            limits=model.limits or {},
            defaults=model.defaults or {},
            status=int(model.status),
            created_at=model.created_at.isoformat(),
            updated_at=model.updated_at.isoformat(),
        ),
        msg="创建成功",
    )


@router.get(
    "/models/{model_id}",
    response_model=ApiResponse[ModelInfo],
    summary="获取 Model 详情",
)
async def get_model(
    model_id: str,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        model_uuid = UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 model_id")

    model = await db.get(LLMModel, model_uuid)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model 不存在")

    return ApiResponse(
        code=0,
        data=ModelInfo(
            id=str(model.id),
            provider_id=str(model.provider_id),
            name=model.name,
            model_id=model.model_id,
            limits=model.limits or {},
            defaults=model.defaults or {},
            status=int(model.status),
            created_at=model.created_at.isoformat(),
            updated_at=model.updated_at.isoformat(),
        ),
        msg="获取成功",
    )


@router.patch(
    "/models/{model_id}",
    response_model=ApiResponse[ModelInfo],
    summary="更新 Model",
)
async def update_model(
    model_id: str,
    payload: ModelUpdate,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        model_uuid = UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 model_id")

    model = await db.get(LLMModel, model_uuid)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model 不存在")

    if payload.name is not None:
        model.name = payload.name
    if payload.model_id is not None:
        model.model_id = payload.model_id
    if payload.limits is not None:
        model.limits = payload.limits
    if payload.defaults is not None:
        model.defaults = payload.defaults
    if payload.status is not None:
        model.status = payload.status

    await db.commit()
    await db.refresh(model)

    return ApiResponse(
        code=0,
        data=ModelInfo(
            id=str(model.id),
            provider_id=str(model.provider_id),
            name=model.name,
            model_id=model.model_id,
            limits=model.limits or {},
            defaults=model.defaults or {},
            status=int(model.status),
            created_at=model.created_at.isoformat(),
            updated_at=model.updated_at.isoformat(),
        ),
        msg="更新成功",
    )


@router.delete(
    "/models/{model_id}",
    response_model=ApiResponse[None],
    summary="删除 Model",
)
async def delete_model(
    model_id: str,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        model_uuid = UUID(model_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 model_id")

    model = await db.get(LLMModel, model_uuid)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model 不存在")

    await db.delete(model)
    await db.commit()

    return ApiResponse(code=0, data=None, msg="删除成功")


# ==================== Credentials ====================


@router.get(
    "/credentials",
    response_model=ApiResponse[List[CredentialInfo]],
    summary="获取 Credential 列表",
)
async def list_credentials(
    provider_id: Optional[str] = None,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LLMCredential).order_by(LLMCredential.created_at.desc())
    if provider_id:
        try:
            provider_uuid = UUID(provider_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")
        stmt = stmt.where(LLMCredential.provider_id == provider_uuid)

    result = await db.execute(stmt)
    credentials = result.scalars().all()

    data = [
        CredentialInfo(
            id=str(c.id),
            provider_id=str(c.provider_id),
            secret_type=c.secret_type,
            status=int(c.status),
            meta=c.meta or {},
            has_secret=bool(c.secret_value),
            secret_masked=_mask_secret(c.secret_value),
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat(),
        )
        for c in credentials
    ]
    return ApiResponse(code=0, data=data, msg="获取成功")


@router.post(
    "/credentials",
    response_model=ApiResponse[CredentialInfo],
    summary="创建 Credential",
)
async def create_credential(
    payload: CredentialCreate,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        provider_uuid = UUID(payload.provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    credential = LLMCredential(
        provider_id=provider.id,
        secret_type=payload.secret_type,
        secret_value=encrypt_secret(payload.secret_value),
        status=payload.status,
        meta=payload.meta,
    )
    db.add(credential)
    await db.commit()
    await db.refresh(credential)

    return ApiResponse(
        code=0,
        data=CredentialInfo(
            id=str(credential.id),
            provider_id=str(credential.provider_id),
            secret_type=credential.secret_type,
            status=int(credential.status),
            meta=credential.meta or {},
            has_secret=bool(credential.secret_value),
            secret_masked=_mask_secret(credential.secret_value),
            created_at=credential.created_at.isoformat(),
            updated_at=credential.updated_at.isoformat(),
        ),
        msg="创建成功",
    )


@router.patch(
    "/credentials/{credential_id}",
    response_model=ApiResponse[CredentialInfo],
    summary="更新 Credential",
)
async def update_credential(
    credential_id: str,
    payload: CredentialUpdate,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        credential_uuid = UUID(credential_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 credential_id")

    credential = await db.get(LLMCredential, credential_uuid)
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential 不存在")

    if payload.secret_type is not None:
        credential.secret_type = payload.secret_type
    if payload.secret_value is not None:
        credential.secret_value = encrypt_secret(payload.secret_value)
    if payload.status is not None:
        credential.status = payload.status
    if payload.meta is not None:
        credential.meta = payload.meta

    await db.commit()
    await db.refresh(credential)

    return ApiResponse(
        code=0,
        data=CredentialInfo(
            id=str(credential.id),
            provider_id=str(credential.provider_id),
            secret_type=credential.secret_type,
            status=int(credential.status),
            meta=credential.meta or {},
            has_secret=bool(credential.secret_value),
            secret_masked=_mask_secret(credential.secret_value),
            created_at=credential.created_at.isoformat(),
            updated_at=credential.updated_at.isoformat(),
        ),
        msg="更新成功",
    )


@router.delete(
    "/credentials/{credential_id}",
    response_model=ApiResponse[None],
    summary="删除 Credential",
)
async def delete_credential(
    credential_id: str,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        credential_uuid = UUID(credential_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 credential_id")

    credential = await db.get(LLMCredential, credential_uuid)
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential 不存在")

    await db.delete(credential)
    await db.commit()

    return ApiResponse(code=0, data=None, msg="删除成功")


# ==================== Stage Routes ====================


@router.get(
    "/routes",
    response_model=ApiResponse[List[StageRouteInfo]],
    summary="获取阶段路由列表",
)
async def list_stage_routes(
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMStageRoute).order_by(LLMStageRoute.stage.asc()))
    routes = result.scalars().all()

    data = [
        StageRouteInfo(
            stage=r.stage,
            provider_id=str(r.provider_id),
            model_id=str(r.model_id),
            is_active=r.is_active,
            created_at=r.created_at.isoformat(),
            updated_at=r.updated_at.isoformat(),
        )
        for r in routes
    ]
    return ApiResponse(code=0, data=data, msg="获取成功")


@router.put(
    "/routes/{stage}",
    response_model=ApiResponse[StageRouteInfo],
    summary="创建或更新阶段路由",
)
async def upsert_stage_route(
    stage: str,
    payload: StageRouteUpsert,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    try:
        provider_uuid = UUID(payload.provider_id)
        model_uuid = UUID(payload.model_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id 或 model_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    model = await db.get(LLMModel, model_uuid)
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model 不存在")
    if model.provider_id != provider.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model 不属于指定 Provider")

    route = await db.get(LLMStageRoute, stage)
    if route:
        route.provider_id = provider.id
        route.model_id = model.id
        route.is_active = payload.is_active
    else:
        route = LLMStageRoute(
            stage=stage,
            provider_id=provider.id,
            model_id=model.id,
            is_active=payload.is_active,
        )
        db.add(route)

    await db.commit()
    await db.refresh(route)

    return ApiResponse(
        code=0,
        data=StageRouteInfo(
            stage=route.stage,
            provider_id=str(route.provider_id),
            model_id=str(route.model_id),
            is_active=route.is_active,
            created_at=route.created_at.isoformat(),
            updated_at=route.updated_at.isoformat(),
        ),
        msg="保存成功",
    )


@router.delete(
    "/routes/{stage}",
    response_model=ApiResponse[None],
    summary="删除阶段路由",
)
async def delete_stage_route(
    stage: str,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    route = await db.get(LLMStageRoute, stage)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="路由不存在")

    await db.delete(route)
    await db.commit()

    return ApiResponse(code=0, data=None, msg="删除成功")


# ==================== Playground ====================


class PlaygroundRequest(BaseModel):
    model_id: str
    messages: List[Dict[str, str]]
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    stream: bool = True


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post(
    "/providers/{provider_id}/test",
    summary="Playground 测试 Provider",
)
async def test_provider(
    provider_id: str,
    payload: PlaygroundRequest,
    current_user=Depends(check_permission(Permissions.SYSTEM_SETTINGS)),
    db: AsyncSession = Depends(get_db),
):
    # 1. 查询 Provider
    try:
        provider_uuid = UUID(provider_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的 provider_id")

    provider = await db.get(LLMProvider, provider_uuid)
    if not provider:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider 不存在")

    # 2. 查询 Credential (取第一个 ENABLED 的)
    cred_result = await db.execute(
        select(LLMCredential)
        .where(LLMCredential.provider_id == provider.id)
        .where(LLMCredential.status == int(LLMStatus.ENABLED))
        .order_by(LLMCredential.created_at.asc())
        .limit(1)
    )
    credential = cred_result.scalar_one_or_none()
    if not credential or not credential.secret_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该 Provider 没有可用的 Credential，请先配置密钥",
        )

    # 3. 解密 api_key，构造 config
    api_key = decrypt_secret(credential.secret_value)
    provider_config = LLMProviderConfig(
        id=provider.id,
        name=provider.name,
        type=provider.type,
        base_url=provider.base_url,
        api_key=api_key,
        capabilities=provider.capabilities or {},
    )

    # 4. 获取 adapter
    try:
        adapter = _registry.get_adapter(provider_config)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 4.5 查询模型配置获取 defaults
    model_result = await db.execute(
        select(LLMModel)
        .where(LLMModel.provider_id == provider.id)
        .where(LLMModel.model_id == payload.model_id)
    )
    db_model = model_result.scalar_one_or_none()

    model_defaults = db_model.defaults if db_model and db_model.defaults else {}

    # 5. 构造 LLMRequest
    request = LLMRequest(
        model_id=payload.model_id,
        messages=payload.messages,
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        extra_params=model_defaults
    )

    # 6. 根据 stream 模式返回
    if payload.stream:
        return StreamingResponse(
            _stream_generate(adapter, request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        try:
            response = adapter.complete(request)
            return ApiResponse(
                code=0,
                data={
                    "content": response.content,
                    "usage": response.usage,
                },
                msg="完成",
            )
        except Exception as e:
            logger.error(f"Playground complete error: {e}\n{traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(e),
            )


def _stream_generate(adapter, request: LLMRequest):
    """SSE 流式生成器"""
    try:
        full_content = ""
        for chunk in adapter.stream(request):
            full_content = chunk.full_content
            yield _sse_event("delta", {
                "content": chunk.delta,
                "full_content": full_content,
            })
        yield _sse_event("done", {"content": full_content})
    except Exception as e:
        logger.error(f"Playground stream error: {e}\n{traceback.format_exc()}")
        yield _sse_event("error", {"message": str(e)})
