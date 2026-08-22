from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.timeline_item import TimelineItem
from app.models.event import Event
from app.models.transit import Transit
from app.models.journey import Journey
from app.schemas.timeline_item import TimelineItemCreate, TimelineItemUpdate, TimelineItemResponse
from uuid import UUID

router = APIRouter(prefix="/api/v1", tags=["Timeline Items"])

@router.post("/journeys/{journey_id}/items", response_model=TimelineItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(journey_id: str, item_in: TimelineItemCreate, db: AsyncSession = Depends(get_db)):
    # Verify journey exists
    journey = await db.get(Journey, journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    db_item = TimelineItem(
        journey_id=journey_id,
        item_type=item_in.item_type,
        order_index=item_in.order_index,
        start_time=item_in.start_time,
        end_time=item_in.end_time
    )
    db.add(db_item)
    await db.flush() # flush to get db_item.id

    if item_in.item_type == "event" and item_in.event:
        db_event = Event(**item_in.event.model_dump(), id=db_item.id)
        db.add(db_event)
    elif item_in.item_type == "transit" and item_in.transit:
        db_transit = Transit(**item_in.transit.model_dump(), id=db_item.id)
        db.add(db_transit)

    await db.commit()
    
    # Reload with relations
    stmt = select(TimelineItem).options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit)).where(TimelineItem.id == db_item.id)
    result = await db.execute(stmt)
    return result.scalars().first()

@router.put("/items/{item_id}", response_model=TimelineItemResponse)
async def update_item(item_id: str, item_in: TimelineItemUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(TimelineItem).options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit)).where(TimelineItem.id == item_id)
    result = await db.execute(stmt)
    db_item = result.scalars().first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item_in.order_index is not None:
        db_item.order_index = item_in.order_index
    if item_in.start_time is not None:
        db_item.start_time = item_in.start_time
    if item_in.end_time is not None:
        db_item.end_time = item_in.end_time

    if db_item.item_type == "event" and item_in.event:
        for k, v in item_in.event.model_dump(exclude_unset=True).items():
            setattr(db_item.event, k, v)
    elif db_item.item_type == "transit" and item_in.transit:
        for k, v in item_in.transit.model_dump(exclude_unset=True).items():
            setattr(db_item.transit, k, v)

    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str, db: AsyncSession = Depends(get_db)):
    db_item = await db.get(TimelineItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(db_item)
    await db.commit()
    return None
