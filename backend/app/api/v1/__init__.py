from fastapi import APIRouter
from app.api.v1 import journeys, items, transit

api_router = APIRouter()
api_router.include_router(journeys.router)
api_router.include_router(items.router)
api_router.include_router(transit.router)
