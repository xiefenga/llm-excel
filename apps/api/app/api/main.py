from fastapi import APIRouter

from app.api.routes import excel

api_router = APIRouter()

api_router.include_router(excel.router)

