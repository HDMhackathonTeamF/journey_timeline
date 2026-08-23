from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), ForeignKey("timeline_items.id", ondelete="CASCADE"), primary_key=True)
    title = Column(String(255), nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    address = Column(String(255), nullable=True)
    memo = Column(Text, nullable=True)

    timeline_item = relationship("TimelineItem", back_populates="event")
