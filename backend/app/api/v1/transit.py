from fastapi import APIRouter, Query
from app.schemas.transit import TransitPlanResponse
from app.services.transit import fetch_transit_plan

router = APIRouter(prefix="/api/v1/transit", tags=["Transit API Proxy"])

@router.get("/plan", response_model=TransitPlanResponse)
async def get_transit_plan(
    from_location: str = Query(..., alias="from_location"),
    to_location: str = Query(..., alias="to_location"),
    time: str | None = None
):
    return await fetch_transit_plan(from_location, to_location, time)
