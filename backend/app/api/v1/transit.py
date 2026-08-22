from fastapi import APIRouter, Query, Request
from app.schemas.transit import TransitPlanResponse
from app.services.transit import fetch_transit_plan
from app.core.limiter import limiter

router = APIRouter(prefix="/api/v1/transit", tags=["Transit API Proxy"])

@router.get("/plan", response_model=TransitPlanResponse)
@limiter.limit("30/minute")
async def get_transit_plan(
    request: Request,
    from_location: str = Query(..., alias="from_location"),
    to_location: str = Query(..., alias="to_location"),
    time: str | None = None,
    date: str | None = None,
    type: str | None = None,
    allowModes: str | None = None,
    avoidModes: str | None = None,
    via: str | None = None,
    maxTransfers: int | None = None,
    avoidWalk: bool | None = None
):
    return await fetch_transit_plan(
        from_location, to_location, time, date, type, 
        allowModes, avoidModes, via, maxTransfers, avoidWalk
    )
