from pydantic import BaseModel
from typing import List, Optional

class TransitLeg(BaseModel):
    line_name: str
    platform: Optional[str] = None
    from_station: str
    to_station: str
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None

class TransitRoute(BaseModel):
    summary: str
    strategy_type: Optional[str] = None
    tags: List[str] = []
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    duration_minutes: int
    transfers_count: int
    total_fare: int
    legs: List[TransitLeg]

class TransitPlanResponse(BaseModel):
    routes: List[TransitRoute]
