from uuid import UUID

from fastapi import HTTPException, Request, status

from app.core.security import COOKIE_NAME, session_journey_id
from app.models import TimelineItem
from app.schemas.journey import EventDetail, ItemResponse, TransitDetail


def require_edit_access(request: Request, journey_id: UUID) -> None:
    if session_journey_id(request.cookies.get(COOKIE_NAME)) != journey_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="編集パスワードを入力してください。")


def item_response(item: TimelineItem) -> ItemResponse:
    event = None if item.event is None else EventDetail(title=item.event.title, duration_minutes=item.event.duration_minutes, address=item.event.address, memo=item.event.memo)
    transit = None if item.transit is None else TransitDetail(departure_location=item.transit.departure_location, arrival_location=item.transit.arrival_location, transit_data=item.transit.transit_data)
    return ItemResponse(id=item.id, item_type=item.item_type, order_index=item.order_index, start_time=item.start_time, end_time=item.end_time, event=event, transit=transit)
