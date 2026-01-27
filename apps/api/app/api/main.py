from fastapi import APIRouter

from app.api.routes import excel, auth

api_router = APIRouter()

api_router.include_router(excel.router)

api_router.include_router(auth.router)

