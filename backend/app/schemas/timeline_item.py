from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

class ItemTypeEnum(str, Enum):
    event = "event"
    transit = "transit"

class EventBase(BaseModel):
    title: str
    duration_minutes: Optional[int] = None
    address: Optional[str] = None
    memo: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class TransitBase(BaseModel):
    departure_location: str
    arrival_location: str
    transit_data: Optional[dict] = None

class TransitCreate(TransitBase):
    pass

class TransitResponse(TransitBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class TimelineItemBase(BaseModel):
    item_type: ItemTypeEnum
    order_index: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class TimelineItemCreate(TimelineItemBase):
    event: Optional[EventCreate] = None
    transit: Optional[TransitCreate] = None

class TimelineItemUpdate(BaseModel):
    order_index: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    event: Optional[EventCreate] = None
    transit: Optional[TransitCreate] = None

class TimelineItemResponse(TimelineItemBase):
    id: UUID
    event: Optional[EventResponse] = None
    transit: Optional[TransitResponse] = None
    model_config = ConfigDict(from_attributes=True)

class JourneyWithItemsResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    items: list[TimelineItemResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
