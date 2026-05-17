"""
API Router for call management endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, TokenData
from app.models import Call, CallStatus, CallDirection, User
from app.api.schemas import (
    CallCreate,
    CallUpdate,
    CallResponse,
    CallListResponse,
)

router = APIRouter(prefix="/calls", tags=["Calls"])


@router.post("/", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
async def create_call(
    call_data: CallCreate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new call record.
    
    - **from_number**: Originating phone number
    - **to_number**: Destination phone number
    - **direction**: Call direction (INBOUND/OUTBOUND)
    - **notes**: Optional notes
    - **agent_id**: Optional agent assignment
    """
    # Check if external_id already exists
    if call_data.external_id:
        result = await db.execute(
            select(Call).where(Call.external_id == call_data.external_id)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Call with this external_id already exists",
            )
    
    # Verify agent exists if provided
    if call_data.agent_id:
        result = await db.execute(
            select(User).where(User.id == call_data.agent_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Specified agent does not exist",
            )
    
    call = Call(
        external_id=call_data.external_id,
        from_number=call_data.from_number,
        to_number=call_data.to_number,
        direction=call_data.direction,
        notes=call_data.notes,
        agent_id=call_data.agent_id,
        status=CallStatus.PENDING,
    )
    
    db.add(call)
    await db.commit()
    await db.refresh(call)
    
    return call


@router.get("/", response_model=CallListResponse)
async def list_calls(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[CallStatus] = Query(None, alias="status"),
    direction: Optional[CallDirection] = None,
    agent_id: Optional[int] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List calls with filtering and pagination.
    
    - **skip**: Number of records to skip
    - **limit**: Maximum records to return (max 200)
    - **status**: Filter by call status
    - **direction**: Filter by call direction
    - **agent_id**: Filter by assigned agent
    - **from_date**: Filter calls from this date
    - **to_date**: Filter calls until this date
    """
    query = select(Call)
    count_query = select(func.count(Call.id))
    
    # Apply filters
    if status_filter is not None:
        query = query.where(Call.status == status_filter)
        count_query = count_query.where(Call.status == status_filter)
    
    if direction is not None:
        query = query.where(Call.direction == direction)
        count_query = count_query.where(Call.direction == direction)
    
    if agent_id is not None:
        query = query.where(Call.agent_id == agent_id)
        count_query = count_query.where(Call.agent_id == agent_id)
    
    if from_date is not None:
        query = query.where(Call.created_at >= from_date)
        count_query = count_query.where(Call.created_at >= from_date)
    
    if to_date is not None:
        query = query.where(Call.created_at <= to_date)
        count_query = count_query.where(Call.created_at <= to_date)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.order_by(Call.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    calls = result.scalars().all()
    
    pages = (total + limit - 1) // limit if total > 0 else 0
    
    return CallListResponse(
        items=calls,
        total=total,
        page=(skip // limit) + 1,
        page_size=limit,
        pages=pages,
    )


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific call by ID."""
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )
    
    return call


@router.patch("/{call_id}", response_model=CallResponse)
async def update_call(
    call_id: int,
    call_data: CallUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a call record.
    
    Can update status, duration, recording URL, transcription, etc.
    """
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )
    
    # Update fields
    update_data = call_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(call, field, value)
    
    # Auto-set timestamps based on status
    if call_data.status == CallStatus.IN_PROGRESS and not call.started_at:
        call.started_at = datetime.utcnow()
    elif call_data.status in [CallStatus.COMPLETED, CallStatus.FAILED]:
        if not call.ended_at:
            call.ended_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(call)
    
    return call


@router.delete("/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_call(
    call_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a call record."""
    result = await db.execute(select(Call).where(Call.id == call_id))
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Call not found",
        )
    
    await db.delete(call)
    await db.commit()
    
    return None


@router.get("/stats/summary")
async def get_call_statistics(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get summary statistics for calls."""
    # Total calls
    total_query = select(func.count(Call.id))
    total_result = await db.execute(total_query)
    total_calls = total_result.scalar() or 0
    
    # Calls by status
    status_query = select(
        Call.status, func.count(Call.id)
    ).group_by(Call.status)
    status_result = await db.execute(status_query)
    calls_by_status = {row[0].value: row[1] for row in status_result.all()}
    
    # Average duration
    duration_query = select(func.avg(Call.duration_seconds)).where(
        Call.duration_seconds.isnot(None)
    )
    duration_result = await db.execute(duration_query)
    avg_duration = duration_result.scalar() or 0.0
    
    return {
        "total_calls": total_calls,
        "calls_by_status": calls_by_status,
        "average_duration_seconds": float(avg_duration),
    }
