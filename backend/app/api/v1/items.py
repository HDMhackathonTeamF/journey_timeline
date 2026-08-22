from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.helpers import item_response, require_edit_access
from app.core.database import get_session
from app.models import Event, Journey, TimelineItem, Transit
from app.schemas.journey import ItemResponse, ItemWrite, ReorderRequest

router = APIRouter(tags=["timeline-items"])


async def load_item(session: AsyncSession, item_id: UUID) -> TimelineItem:
    statement = select(TimelineItem).where(TimelineItem.id == item_id).options(selectinload(TimelineItem.event), selectinload(TimelineItem.transit))
    item = await session.scalar(statement)
    if item is None:
        raise HTTPException(status_code=404, detail="タイムライン項目が見つかりませんでした。")
    return item


async def ordered_items(session: AsyncSession, journey_id: UUID) -> list[TimelineItem]:
    return list((await session.scalars(select(TimelineItem).where(TimelineItem.journey_id == journey_id).order_by(TimelineItem.order_index))).all())


async def assign_order(session: AsyncSession, items: list[TimelineItem]) -> None:
    for index, item in enumerate(items):
        item.order_index = 10000 + index
    await session.flush()
    for index, item in enumerate(items):
        item.order_index = index


@router.post("/journeys/{journey_id}/items", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(journey_id: UUID, body: ItemWrite, request: Request, session: AsyncSession = Depends(get_session)) -> ItemResponse:
    require_edit_access(request, journey_id)
    journey = await session.get(Journey, journey_id)
    if journey is None:
        raise HTTPException(status_code=404, detail="旅程が見つかりませんでした。")
    items = await ordered_items(session, journey_id)
    index = min(body.order_index if body.order_index is not None else len(items), len(items))
    for offset, existing in enumerate(items):
        existing.order_index = 10000 + offset
    await session.flush()
    item = TimelineItem(journey_id=journey_id, item_type=body.item_type, order_index=20000, start_time=body.start_time, end_time=body.end_time)
    if body.event:
        item.event = Event(title=body.event.title, duration_minutes=body.event.duration_minutes, address=body.event.address, memo=body.event.memo)
    if body.transit:
        item.transit = Transit(departure_location=body.transit.departure_location, arrival_location=body.transit.arrival_location, transit_data=body.transit.transit_data)
    session.add(item)
    await session.flush()
    items.insert(index, item)
    await assign_order(session, items)
    journey.updated_at = datetime.now().astimezone()
    await session.commit()
    return item_response(item)


@router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: UUID, body: ItemWrite, request: Request, session: AsyncSession = Depends(get_session)) -> ItemResponse:
    item = await load_item(session, item_id)
    require_edit_access(request, item.journey_id)
    if item.item_type != body.item_type:
        raise HTTPException(status_code=400, detail="項目種別は変更できません。")
    item.start_time, item.end_time = body.start_time, body.end_time
    if body.event and item.event:
        item.event.title, item.event.duration_minutes, item.event.address, item.event.memo = body.event.title, body.event.duration_minutes, body.event.address, body.event.memo
    if body.transit and item.transit:
        item.transit.departure_location, item.transit.arrival_location, item.transit.transit_data = body.transit.departure_location, body.transit.arrival_location, body.transit.transit_data
    journey = await session.get(Journey, item.journey_id)
    if journey:
        journey.updated_at = datetime.now().astimezone()
    await session.commit()
    return item_response(item)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: UUID, request: Request, session: AsyncSession = Depends(get_session)) -> Response:
    item = await load_item(session, item_id)
    require_edit_access(request, item.journey_id)
    journey_id = item.journey_id
    await session.delete(item)
    await session.flush()
    await assign_order(session, await ordered_items(session, journey_id))
    journey = await session.get(Journey, journey_id)
    if journey:
        journey.updated_at = datetime.now().astimezone()
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/journeys/{journey_id}/items/reorder", response_model=list[ItemResponse])
async def reorder_items(journey_id: UUID, body: ReorderRequest, request: Request, session: AsyncSession = Depends(get_session)) -> list[ItemResponse]:
    require_edit_access(request, journey_id)
    items = await ordered_items(session, journey_id)
    by_id = {item.id: item for item in items}
    if len(body.item_ids) != len(items) or set(body.item_ids) != set(by_id):
        raise HTTPException(status_code=400, detail="旅程内の全アイテムIDを重複なく指定してください。")
    reordered = [by_id[item_id] for item_id in body.item_ids]
    await assign_order(session, reordered)
    journey = await session.get(Journey, journey_id)
    if journey:
        journey.updated_at = datetime.now().astimezone()
    await session.commit()
    for item in reordered:
        await session.refresh(item, attribute_names=["event", "transit"])
    return [item_response(item) for item in reordered]
