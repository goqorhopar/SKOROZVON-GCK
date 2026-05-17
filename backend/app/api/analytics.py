"""
API Router for analytics and dashboard endpoints.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user, TokenData
from app.models import Call, CallStatus, User, Analytics
from app.api.schemas import DashboardStats, AnalyticsMetric

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    days: int = Query(7, ge=1, le=90),
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard statistics for the specified period.
    
    - **days**: Number of days to include (default: 7, max: 90)
    """
    from_date = datetime.utcnow() - timedelta(days=days)
    
    # Total calls in period
    total_query = select(func.count(Call.id)).where(Call.created_at >= from_date)
    total_result = await db.execute(total_query)
    total_calls = total_result.scalar() or 0
    
    # Completed calls
    completed_query = select(func.count(Call.id)).where(
        and_(Call.status == CallStatus.COMPLETED, Call.created_at >= from_date)
    )
    completed_result = await db.execute(completed_query)
    completed_calls = completed_result.scalar() or 0
    
    # Pending calls
    pending_query = select(func.count(Call.id)).where(
        and_(Call.status == CallStatus.PENDING, Call.created_at >= from_date)
    )
    pending_result = await db.execute(pending_query)
    pending_calls = pending_result.scalar() or 0
    
    # Failed calls
    failed_query = select(func.count(Call.id)).where(
        and_(Call.status == CallStatus.FAILED, Call.created_at >= from_date)
    )
    failed_result = await db.execute(failed_query)
    failed_calls = failed_result.scalar() or 0
    
    # Average duration
    duration_query = select(func.avg(Call.duration_seconds)).where(
        and_(Call.duration_seconds.isnot(None), Call.created_at >= from_date)
    )
    duration_result = await db.execute(duration_query)
    avg_duration = duration_result.scalar() or 0.0
    
    # Total agents
    agents_query = select(func.count(User.id)).where(User.role.in_(["agent", "manager"]))
    agents_result = await db.execute(agents_query)
    total_agents = agents_result.scalar() or 0
    
    # Active agents (logged in last 7 days)
    active_agents_query = select(func.count(User.id)).where(
        and_(
            User.role.in_(["agent", "manager"]),
            User.last_login_at >= datetime.utcnow() - timedelta(days=7),
        )
    )
    active_agents_result = await db.execute(active_agents_query)
    active_agents = active_agents_result.scalar() or 0
    
    # Conversion rate (completed / total * 100)
    conversion_rate = (completed_calls / total_calls * 100) if total_calls > 0 else 0.0
    
    return DashboardStats(
        total_calls=total_calls,
        completed_calls=completed_calls,
        pending_calls=pending_calls,
        failed_calls=failed_calls,
        average_duration=float(avg_duration),
        total_agents=total_agents,
        active_agents=active_agents,
        conversion_rate=round(conversion_rate, 2),
    )


@router.get("/calls/daily")
async def get_daily_call_metrics(
    days: int = Query(30, ge=1, le=90),
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get daily call metrics for the specified period."""
    from_date = datetime.utcnow() - timedelta(days=days)
    
    query = select(
        func.date(Call.created_at).label("date"),
        func.count(Call.id).label("total"),
        func.sum(func.case((Call.status == CallStatus.COMPLETED, 1))).label("completed"),
        func.sum(func.case((Call.status == CallStatus.FAILED, 1))).label("failed"),
    ).where(Call.created_at >= from_date).group_by(func.date(Call.created_at))
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "date": row[0].isoformat() if row[0] else None,
            "total_calls": row[1] or 0,
            "completed_calls": row[2] or 0,
            "failed_calls": row[3] or 0,
        }
        for row in rows
    ]


@router.get("/agents/performance")
async def get_agent_performance(
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(50, ge=1, le=200),
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get agent performance metrics."""
    from_date = datetime.utcnow() - timedelta(days=days)
    
    query = select(
        User.id,
        User.full_name,
        User.email,
        func.count(Call.id).label("total_calls"),
        func.sum(func.case((Call.status == CallStatus.COMPLETED, 1))).label("completed"),
        func.avg(Call.duration_seconds).label("avg_duration"),
    ).join(Call, User.id == Call.agent_id, isouter=True).where(
        Call.created_at >= from_date
    ).group_by(User.id, User.full_name, User.email).order_by(
        func.count(Call.id).desc()
    ).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        {
            "agent_id": row[0],
            "name": row[1],
            "email": row[2],
            "total_calls": row[3] or 0,
            "completed_calls": row[4] or 0,
            "average_duration": float(row[5]) if row[5] else 0.0,
        }
        for row in rows
    ]


@router.get("/metrics")
async def get_custom_metrics(
    metric_name: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get custom analytics metrics."""
    query = select(Analytics)
    
    if metric_name:
        query = query.where(Analytics.metric_name == metric_name)
    if start_date:
        query = query.where(Analytics.date >= start_date)
    if end_date:
        query = query.where(Analytics.date <= end_date)
    
    query = query.order_by(Analytics.date.desc()).limit(1000)
    
    result = await db.execute(query)
    metrics = result.scalars().all()
    
    return [
        AnalyticsMetric(
            metric_name=m.metric_name,
            metric_value=m.metric_value,
            dimension=m.dimension,
            date=m.date,
        )
        for m in metrics
    ]
