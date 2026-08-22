import httpx
from fastapi import APIRouter, HTTPException, Query

from app.services.transit import search_transit

router = APIRouter(prefix="/transit", tags=["transit"])


@router.get("/plan")
async def plan(from_location: str = Query(min_length=1), to_location: str = Query(min_length=1), time: str | None = None) -> dict:
    try:
        return {"routes": await search_transit(from_location, to_location, time)}
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="経路検索サービスとの通信に失敗しました。") from exc
