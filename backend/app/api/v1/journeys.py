from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.journey import Journey
from app.models.timeline_item import TimelineItem
from app.schemas.journey import JourneyCreate, JourneyResponse
from app.schemas.timeline_item import JourneyWithItemsResponse

router = APIRouter(prefix="/api/v1/journeys", tags=["Journeys"])

@router.post("", response_model=JourneyResponse, status_code=status.HTTP_201_CREATED)
async def create_journey(journey_in: JourneyCreate, db: AsyncSession = Depends(get_db)):
    db_journey = Journey(**journey_in.model_dump())
    db.add(db_journey)
    await db.commit()
    await db.refresh(db_journey)
    return db_journey

@router.get("/{journey_id}", response_model=JourneyWithItemsResponse)
async def get_journey(journey_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Journey)
        .options(
            selectinload(Journey.timeline_items).selectinload(TimelineItem.event),
            selectinload(Journey.timeline_items).selectinload(TimelineItem.transit)
        )
        .where(Journey.id == journey_id)
    )
    result = await db.execute(stmt)
    db_journey = result.scalars().first()
    if not db_journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return db_journey
