from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class JourneyBase(BaseModel):
    title: str
    edit_token: Optional[str] = None

class JourneyCreate(JourneyBase):
    pass

class JourneyResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    # Note: edit_token is omitted from response for security

    model_config = ConfigDict(from_attributes=True)
