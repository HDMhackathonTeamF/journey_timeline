from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

class JourneyBase(BaseModel):
    title: str
    edit_token: Optional[str] = None

class JourneyCreate(JourneyBase):
    password: Optional[str] = None

class JourneyUpdate(BaseModel):
    title: str

class JourneyResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    is_protected: bool = False
    # Note: edit_token is omitted from response for security

    model_config = ConfigDict(from_attributes=True)

class JourneyVerifyRequest(BaseModel):
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
