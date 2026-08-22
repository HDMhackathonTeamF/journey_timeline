from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.helpers import item_response, require_edit_access
from app.core.database import get_session
from app.core.security import COOKIE_NAME, create_edit_session, hash_password, verify_password
from app.models import Journey, TimelineItem
from app.schemas.journey import EditSessionCreate, JourneyCreate, JourneyResponse, JourneySummary, JourneyUpdate

router = APIRouter(prefix="/journeys", tags=["journeys"])


def journey_response(journey: Journey) -> JourneyResponse:
    return JourneyResponse(id=journey.id, title=journey.title, created_at=journey.created_at, updated_at=journey.updated_at, items=[item_response(item) for item in sorted(journey.timeline_items, key=lambda value: value.order_index)])


async def load_journey(session: AsyncSession, journey_id: UUID) -> Journey:
    statement = select(Journey).where(Journey.id == journey_id).options(selectinload(Journey.timeline_items).selectinload(TimelineItem.event), selectinload(Journey.timeline_items).selectinload(TimelineItem.transit))
    journey = await session.scalar(statement)
    if journey is None:
        raise HTTPException(status_code=404, detail="旅程が見つかりませんでした。")
    return journey


@router.get("", response_model=list[JourneySummary])
async def list_journeys(session: AsyncSession = Depends(get_session)) -> list[JourneySummary]:
    statement = select(Journey).options(selectinload(Journey.timeline_items)).order_by(Journey.updated_at.desc())
    journeys = (await session.scalars(statement)).unique().all()
    result = []
    for journey in journeys:
        dates = sorted(item.start_time for item in journey.timeline_items if item.start_time is not None)
        result.append(JourneySummary(id=journey.id, title=journey.title, start_date=dates[0] if dates else None, end_date=dates[-1] if dates else None, updated_at=journey.updated_at, item_count=len(journey.timeline_items)))
    return result


@router.post("", response_model=JourneyResponse, status_code=status.HTTP_201_CREATED)
async def create_journey(body: JourneyCreate, response: Response, session: AsyncSession = Depends(get_session)) -> JourneyResponse:
    journey = Journey(title=body.title, edit_token=hash_password(body.password))
    session.add(journey)
    await session.commit()
    await session.refresh(journey)
    journey.timeline_items = []
    response.set_cookie(COOKIE_NAME, create_edit_session(journey.id), httponly=True, samesite="lax", max_age=60 * 60 * 8, path="/api/v1")
    return journey_response(journey)


@router.get("/{journey_id}", response_model=JourneyResponse)
async def get_journey(journey_id: UUID, session: AsyncSession = Depends(get_session)) -> JourneyResponse:
    return journey_response(await load_journey(session, journey_id))


@router.patch("/{journey_id}", response_model=JourneyResponse)
async def update_journey(journey_id: UUID, body: JourneyUpdate, request: Request, session: AsyncSession = Depends(get_session)) -> JourneyResponse:
    require_edit_access(request, journey_id)
    journey = await load_journey(session, journey_id)
    journey.title = body.title
    journey.updated_at = datetime.now().astimezone()
    await session.commit()
    return journey_response(journey)


@router.delete("/{journey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journey(journey_id: UUID, request: Request, session: AsyncSession = Depends(get_session)) -> Response:
    require_edit_access(request, journey_id)
    journey = await load_journey(session, journey_id)
    await session.delete(journey)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{journey_id}/edit-session", status_code=status.HTTP_204_NO_CONTENT)
async def start_edit_session(journey_id: UUID, body: EditSessionCreate, response: Response, session: AsyncSession = Depends(get_session)) -> Response:
    journey = await session.get(Journey, journey_id)
    if journey is None:
        raise HTTPException(status_code=404, detail="旅程が見つかりませんでした。")
    if not verify_password(body.password, journey.edit_token):
        raise HTTPException(status_code=401, detail="パスワードが違います。")
    response.set_cookie(COOKIE_NAME, create_edit_session(journey.id), httponly=True, samesite="lax", max_age=60 * 60 * 8, path="/api/v1")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
