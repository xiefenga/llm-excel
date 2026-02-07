from datetime import datetime
import json
from typing import List, Optional
from uuid import UUID
from io import StringIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, check_permission, has_permission
from app.core.database import get_db
from app.core.permissions import Permissions
from app.models.btrack import BTrack
from app.models.user import User
from app.models.thread import ThreadTurn
from app.models.file import File
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/btracks", tags=["btracks"])


class BTrackItem(BaseModel):
    id: str
    reporter_id: str
    reporter_name: str
    created_at: datetime
    steps: list
    generation_prompt: str
    errors: List[str]
    thread_turn_id: str
    cause: Optional[str]
    fixed: bool


class BTrackListResponse(BaseModel):
    items: List[BTrackItem]
    total: int = Field(..., description="总数量")
    limit: int = Field(..., description="每页数量")
    offset: int = Field(..., description="偏移量")


def _parse_errors(raw_errors: str) -> List[str]:
    if not raw_errors:
        return []
    try:
        parsed = json.loads(raw_errors)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
        return [str(parsed)]
    except json.JSONDecodeError:
        return [raw_errors]


@router.get(
    "",
    response_model=ApiResponse[BTrackListResponse],
    summary="获取 BTrack 列表",
    description="获取 BTrack 记录列表（根据权限决定范围）",
)
async def get_btracks(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    fixed: Optional[bool] = Query(None, description="是否已修复"),
    current_user: User = Depends(check_permission(Permissions.BTRACK_READ)),
    db: AsyncSession = Depends(get_db),
):
    """
    获取 BTrack 列表

    权限要求：
    - btrack:read: 查看自己的异常记录
    - btrack:read:all: 查看所有用户的异常记录
    """
    # 检查用户是否有查看所有记录的权限
    can_view_all = await has_permission(
        current_user,
        db,
        Permissions.BTRACK_READ_ALL
    )

    # 根据权限设置筛选条件
    if can_view_all:
        # 可以查看所有用户的记录
        filters = []
    else:
        # 只能查看自己的记录
        filters = [BTrack.reporter_id == current_user.id]

    if fixed is not None:
        filters.append(BTrack.fixed == fixed)

    total_stmt = select(func.count()).select_from(BTrack).where(*filters) if filters else select(func.count()).select_from(BTrack)
    total = await db.scalar(total_stmt)

    stmt = (
        select(BTrack, User.username)
        .join(User, User.id == BTrack.reporter_id)
        .order_by(BTrack.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if filters:
        stmt = stmt.where(*filters)

    result = await db.execute(stmt)
    rows = result.all()

    items = [
        BTrackItem(
            id=str(row[0].id),
            reporter_id=str(row[0].reporter_id),
            reporter_name=row[1],
            created_at=row[0].created_at,
            steps=row[0].steps or [],
            generation_prompt=row[0].generation_prompt,
            errors=_parse_errors(row[0].errors),
            thread_turn_id=str(row[0].thread_turn_id),
            cause=row[0].cause,
            fixed=row[0].fixed,
        )
        for row in rows
    ]

    return ApiResponse(
        code=0,
        data=BTrackListResponse(
            items=items,
            total=total or 0,
            limit=limit,
            offset=offset,
        ),
        msg="获取成功",
    )


@router.get(
    "/export",
    summary="导出 BTrack 数据",
    description="导出所有 BTrack 记录为 JSON 格式（仅管理员/运营）",
)
async def export_btracks(
    fixed: Optional[bool] = Query(None, description="是否已修复"),
    current_user: User = Depends(check_permission(Permissions.BTRACK_EXPORT)),
    db: AsyncSession = Depends(get_db),
):
    """
    导出所有 BTrack 数据为 JSON 格式

    权限要求：btrack:export

    导出格式：
    [
        {
            "btrack_id": "uuid",
            "created_at": "2024-01-01T12:00:00Z",
            "fixed": false,
            "reporter": {...},
            "turn": {...},
            "generation_prompt": "LLM生成提示词",
            "errors": ["错误信息1", "错误信息2"]
        }
    ]
    """
    # 构建筛选条件（不限制用户）
    filters = []
    if fixed is not None:
        filters.append(BTrack.fixed == fixed)

    # 查询所有符合条件的 BTrack 记录
    stmt = (
        select(BTrack, User)
        .join(User, User.id == BTrack.reporter_id)
        .where(*filters) if filters else select(BTrack, User).join(User, User.id == BTrack.reporter_id)
    )
    stmt = stmt.order_by(BTrack.created_at.desc())

    result = await db.execute(stmt)
    rows = result.all()

    # 构建导出数据列表
    export_list = []

    for btrack, user in rows:
        # 查询关联的 ThreadTurn
        turn_stmt = (
            select(ThreadTurn)
            .where(ThreadTurn.id == btrack.thread_turn_id)
        )
        turn_result = await db.execute(turn_stmt)
        turn = turn_result.scalar_one_or_none()

        if not turn:
            # 如果找不到 turn，跳过这条记录
            continue

        # 查询 turn 关联的文件
        files_stmt = (
            select(File)
            .join(ThreadTurn.files)
            .where(ThreadTurn.id == turn.id)
        )
        files_result = await db.execute(files_stmt)
        files = files_result.scalars().all()

        # 构建导出数据
        export_data = {
            "btrack_id": str(btrack.id),
            "created_at": btrack.created_at.isoformat(),
            "fixed": btrack.fixed,
            "reporter": {
                "id": str(user.id),
                "username": user.username,
                "avatar": user.avatar,
            },
            "turn": {
                "id": str(turn.id),
                "thread_id": str(turn.thread_id),
                "turn_number": turn.turn_number,
                "user_query": turn.user_query,
                "status": turn.status,
                "steps": turn.steps,  # 数据库原样数据
                "created_at": turn.created_at.isoformat(),
                "started_at": turn.started_at.isoformat() if turn.started_at else None,
                "completed_at": turn.completed_at.isoformat() if turn.completed_at else None,
                "files": [
                    {
                        "id": str(f.id),
                        "filename": f.filename,
                        "file_size": f.file_size,
                        "md5": f.md5,
                        "mime_type": f.mime_type,
                    }
                    for f in files
                ],
            },
            "generation_prompt": btrack.generation_prompt,
            "errors": _parse_errors(btrack.errors),
        }

        export_list.append(export_data)

    # 生成文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"btracks_export_{timestamp}.json"

    # 返回 JSON 文件
    json_content = json.dumps(export_list, ensure_ascii=False, indent=2)

    return StreamingResponse(
        iter([json_content]),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
