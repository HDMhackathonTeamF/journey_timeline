from datetime import datetime, timezone
from typing import Optional, Union, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Header, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import verify_access_token
from app.models.timeline_item import TimelineItem
from app.models.event import Event
from app.models.transit import Transit
from app.models.journey import Journey
from app.schemas.timeline_item import (
    TimelineItemCreate, TimelineItemUpdate, TimelineItemResponse,
    ItemReorderRequest, ItemReorderItem
)

router = APIRouter(prefix="/api/v1", tags=["Timeline Items"])

def verify_journey_permission(journey: Journey, authorization: Optional[str]) -> None:
    if journey.is_protected:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=403, detail="Authentication required for protected journey")
        token = authorization.split(" ")[1]
        subject = verify_access_token(token)
        if subject != str(journey.id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")

@router.post("/journeys/{journey_id}/items", response_model=TimelineItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    journey_id: str,
    item_in: TimelineItemCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    # Verify journey exists
    journey = await db.get(Journey, journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    verify_journey_permission(journey, authorization)

    # Shift existing items if order_index is specified
    if item_in.order_index is not None:
        stmt = (
            select(TimelineItem)
            .where(TimelineItem.journey_id == journey_id, TimelineItem.order_index >= item_in.order_index)
        )
        existing_items = (await db.execute(stmt)).scalars().all()
        for item in existing_items:
            item.order_index += 1
        target_order = item_in.order_index
    else:
        stmt = select(TimelineItem).where(TimelineItem.journey_id == journey_id)
        existing_items = (await db.execute(stmt)).scalars().all()
        target_order = len(existing_items)

    db_item = TimelineItem(
        journey_id=journey_id,
        item_type=item_in.item_type,
        order_index=target_order,
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

    journey.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    # Reload with relations
    stmt = select(TimelineItem).options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit)).where(TimelineItem.id == db_item.id)
    result = await db.execute(stmt)
    return result.scalars().first()

@router.patch("/journeys/{journey_id}/items/reorder", response_model=list[TimelineItemResponse])
@router.put("/journeys/{journey_id}/items/reorder", response_model=list[TimelineItemResponse])
@router.patch("/journeys/{journey_id}/reorder", response_model=list[TimelineItemResponse])
@router.put("/journeys/{journey_id}/reorder", response_model=list[TimelineItemResponse])
async def reorder_items(
    journey_id: str,
    reorder_data: Union[ItemReorderRequest, List[ItemReorderItem], List[UUID]] = Body(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    journey = await db.get(Journey, journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    verify_journey_permission(journey, authorization)

    stmt = (
        select(TimelineItem)
        .options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit))
        .where(TimelineItem.journey_id == journey_id)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    items_by_id = {str(item.id): item for item in items}

    if isinstance(reorder_data, ItemReorderRequest):
        if reorder_data.item_ids is not None:
            for idx, item_id in enumerate(reorder_data.item_ids):
                item_id_str = str(item_id)
                if item_id_str in items_by_id:
                    items_by_id[item_id_str].order_index = idx
        elif reorder_data.items is not None:
            for idx, item_info in enumerate(reorder_data.items):
                item_id_str = str(item_info.id)
                if item_id_str in items_by_id:
                    items_by_id[item_id_str].order_index = item_info.order_index if item_info.order_index is not None else idx
    elif isinstance(reorder_data, list):
        for idx, entry in enumerate(reorder_data):
            if isinstance(entry, ItemReorderItem):
                item_id_str = str(entry.id)
                if item_id_str in items_by_id:
                    items_by_id[item_id_str].order_index = entry.order_index if entry.order_index is not None else idx
            elif isinstance(entry, (UUID, str)):
                item_id_str = str(entry)
                if item_id_str in items_by_id:
                    items_by_id[item_id_str].order_index = idx

    journey.updated_at = datetime.now(timezone.utc)
    await db.commit()

    stmt = (
        select(TimelineItem)
        .options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit))
        .where(TimelineItem.journey_id == journey_id)
        .order_by(TimelineItem.order_index)
    )
    result = await db.execute(stmt)
    return result.scalars().all()

@router.put("/items/{item_id}", response_model=TimelineItemResponse)
async def update_item(
    item_id: str,
    item_in: TimelineItemUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(TimelineItem)
        .options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit), selectinload(TimelineItem.journey))
        .where(TimelineItem.id == item_id)
    )
    result = await db.execute(stmt)
    db_item = result.scalars().first()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    if db_item.journey:
        verify_journey_permission(db_item.journey, authorization)

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

    if db_item.journey:
        db_item.journey.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(db_item)
    return db_item

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: str,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(TimelineItem)
        .options(selectinload(TimelineItem.journey))
        .where(TimelineItem.id == item_id)
    )
    result = await db.execute(stmt)
    db_item = result.scalars().first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    if db_item.journey:
        verify_journey_permission(db_item.journey, authorization)
        db_item.journey.updated_at = datetime.now(timezone.utc)

    await db.delete(db_item)
    await db.commit()
    return None

