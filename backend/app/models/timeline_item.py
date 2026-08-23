from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class TimelineItem(Base):
    __tablename__ = "timeline_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journey_id = Column(UUID(as_uuid=True), ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(Enum("event", "transit", name="item_type_enum"), nullable=False)
    order_index = Column(Integer, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)

    journey = relationship("Journey", back_populates="timeline_items")
    event = relationship("Event", back_populates="timeline_item", uselist=False, cascade="all, delete-orphan")
    transit = relationship("Transit", back_populates="timeline_item", uselist=False, cascade="all, delete-orphan")
