from fastapi import APIRouter, Depends, HTTPException, status, Header, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, verify_access_token
from app.core.limiter import limiter
from app.models.journey import Journey
from app.models.timeline_item import TimelineItem
from app.schemas.journey import JourneyCreate, JourneyUpdate, JourneyResponse, JourneySummaryResponse, JourneyVerifyRequest, TokenResponse
from app.schemas.timeline_item import JourneyWithItemsResponse

router = APIRouter(prefix="/api/v1/journeys", tags=["Journeys"])

@router.get("", response_model=list[JourneySummaryResponse])
async def list_journeys(
    q: Optional[str] = Query(None, description="Search query for title"),
    title_like: Optional[str] = Query(None, description="Search by title (legacy parameter)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Journey).options(selectinload(Journey.timeline_items)).order_by(Journey.created_at.desc())
    search_term = q or title_like
    if search_term:
        stmt = stmt.where(Journey.title.ilike(f"%{search_term}%"))
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    journeys = result.scalars().all()
    return [
        {
            "id": journey.id,
            "title": journey.title,
            "created_at": journey.created_at,
            "updated_at": journey.updated_at,
            "is_protected": journey.is_protected,
            "start_date": min((item.start_time for item in journey.timeline_items if item.start_time), default=None),
            "end_date": max((item.end_time or item.start_time for item in journey.timeline_items if item.end_time or item.start_time), default=None),
            "item_count": len(journey.timeline_items),
        }
        for journey in journeys
    ]

@router.post("", response_model=JourneyResponse, status_code=status.HTTP_201_CREATED)
async def create_journey(journey_in: JourneyCreate, db: AsyncSession = Depends(get_db)):
    journey_data = journey_in.model_dump(exclude={"password"})
    db_journey = Journey(**journey_data)
    if journey_in.password:
        db_journey.password_hash = get_password_hash(journey_in.password)
    db.add(db_journey)
    await db.commit()
    await db.refresh(db_journey)
    return db_journey

@router.get("/{journey_id}", response_model=JourneyWithItemsResponse)
async def get_journey(journey_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Journey)
        .options(
            selectinload(Journey.timeline_items).selectinload(TimelineItem.event),
            selectinload(Journey.timeline_items).selectinload(TimelineItem.transit)
        )
        .where(Journey.id == journey_id)
    )
    result = await db.execute(stmt)
    db_journey = result.scalars().first()
    if not db_journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    
    return {
        "id": db_journey.id,
        "title": db_journey.title,
        "created_at": db_journey.created_at,
        "updated_at": db_journey.updated_at,
        "is_protected": db_journey.is_protected,
        "items": db_journey.timeline_items
    }

@router.post("/{journey_id}/verify", response_model=TokenResponse)
@limiter.limit("5/minute")
async def verify_journey_password(
    request: Request,
    journey_id: str,
    req: JourneyVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Journey).where(Journey.id == journey_id)
    result = await db.execute(stmt)
    db_journey = result.scalars().first()
    
    if not db_journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if not db_journey.is_protected:
        # If not protected, you shouldn't need a token, but we can issue one anyway or just return error.
        raise HTTPException(status_code=400, detail="Journey is not password protected")
        
    if not verify_password(req.password, db_journey.password_hash):
        raise HTTPException(status_code=403, detail="Incorrect password")
        
    access_token = create_access_token(subject=str(db_journey.id))
    return {"access_token": access_token, "token_type": "bearer"}

@router.patch("/{journey_id}", response_model=JourneyResponse)
@router.put("/{journey_id}", response_model=JourneyResponse)
async def update_journey(
    journey_id: str,
    journey_in: JourneyUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Journey).where(Journey.id == journey_id)
    result = await db.execute(stmt)
    db_journey = result.scalars().first()
    if not db_journey:
        raise HTTPException(status_code=404, detail="Journey not found")
        
    if db_journey.is_protected:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=403, detail="Authentication required for protected journey")
        token = authorization.split(" ")[1]
        subject = verify_access_token(token)
        if subject != str(db_journey.id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")

    if journey_in.title is not None:
        db_journey.title = journey_in.title
    if journey_in.password is not None:
        db_journey.password_hash = get_password_hash(journey_in.password)

    await db.commit()
    await db.refresh(db_journey)
    return db_journey

@router.delete("/{journey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journey(
    journey_id: str,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Journey).where(Journey.id == journey_id)
    result = await db.execute(stmt)
    db_journey = result.scalars().first()
    if not db_journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    if db_journey.is_protected:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=403, detail="Authentication required for protected journey")
        token = authorization.split(" ")[1]
        subject = verify_access_token(token)
        if subject != str(db_journey.id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")

    await db.delete(db_journey)
    await db.commit()
    return None

