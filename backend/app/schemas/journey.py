from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class EventDetail(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    duration_minutes: int | None = Field(default=None, ge=0)
    address: str | None = Field(default=None, max_length=255)
    memo: str | None = None


class TransitDetail(BaseModel):
    departure_location: str = Field(min_length=1, max_length=255)
    arrival_location: str = Field(min_length=1, max_length=255)
    transit_data: dict[str, Any]


class ItemWrite(BaseModel):
    item_type: Literal["event", "transit"]
    order_index: int | None = Field(default=None, ge=0)
    start_time: datetime | None = None
    end_time: datetime | None = None
    event: EventDetail | None = None
    transit: TransitDetail | None = None

    @model_validator(mode="after")
    def detail_matches_type(self) -> "ItemWrite":
        if self.item_type == "event" and (self.event is None or self.transit is not None):
            raise ValueError("event detail is required for event items")
        if self.item_type == "transit" and (self.transit is None or self.event is not None):
            raise ValueError("transit detail is required for transit items")
        return self


class ItemResponse(BaseModel):
    id: UUID
    item_type: Literal["event", "transit"]
    order_index: int
    start_time: datetime | None
    end_time: datetime | None
    event: EventDetail | None
    transit: TransitDetail | None


class JourneyCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


class JourneyUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class EditSessionCreate(BaseModel):
    password: str = Field(min_length=1, max_length=255)


class JourneyResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    items: list[ItemResponse]


class JourneySummary(BaseModel):
    id: UUID
    title: str
    start_date: datetime | None
    end_date: datetime | None
    updated_at: datetime
    item_count: int


class ReorderRequest(BaseModel):
    item_ids: list[UUID]
