from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class Transit(Base):
    __tablename__ = "transits"

    id = Column(UUID(as_uuid=True), ForeignKey("timeline_items.id", ondelete="CASCADE"), primary_key=True)
    departure_location = Column(String(255), nullable=False)
    arrival_location = Column(String(255), nullable=False)
    transit_data = Column(JSONB, nullable=True)

    timeline_item = relationship("TimelineItem", back_populates="transit")
