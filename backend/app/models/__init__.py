"""
Database models for SKOROZVON-GCK application.
"""

from datetime import datetime
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    DateTime,
    Float,
    Text,
    ForeignKey,
    Enum as SQLEnum,
    Index,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
    validates,
)
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    MANAGER = "manager"
    AGENT = "agent"
    VIEWER = "viewer"


class CallStatus(str, enum.Enum):
    """Call status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    MISSED = "missed"
    CANCELLED = "cancelled"


class CallDirection(str, enum.Enum):
    """Call direction enumeration."""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.AGENT)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    calls: Mapped[list["Call"]] = relationship("Call", back_populates="agent")
    call_assignments: Mapped[list["CallAssignment"]] = relationship(
        "CallAssignment", back_populates="agent"
    )
    
    @validates("email")
    def validate_email(self, key: str, value: str) -> str:
        if not value or "@" not in value:
            raise ValueError("Invalid email address")
        return value.lower().strip()
    
    __table_args__ = (
        Index("idx_users_role_is_active", "role", "is_active"),
    )


class Call(Base):
    """Call record model for storing call information."""
    
    __tablename__ = "calls"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    direction: Mapped[CallDirection] = mapped_column(
        SQLEnum(CallDirection), default=CallDirection.OUTBOUND
    )
    from_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    to_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[CallStatus] = mapped_column(
        SQLEnum(CallStatus), default=CallStatus.PENDING
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, default=0)
    recording_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcription: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcription_status: Mapped[str | None] = mapped_column(
        String(50), default="pending"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    agent: Mapped["User"] = relationship("User", back_populates="calls")
    assignments: Mapped[list["CallAssignment"]] = relationship(
        "CallAssignment", back_populates="call"
    )
    
    __table_args__ = (
        Index("idx_calls_status_created", "status", "created_at"),
        Index("idx_calls_agent_status", "agent_id", "status"),
    )


class CallAssignment(Base):
    """Model for assigning calls to agents/managers."""
    
    __tablename__ = "call_assignments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    call_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("calls.id"), nullable=False, index=True
    )
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Relationships
    call: Mapped["Call"] = relationship("Call", back_populates="assignments")
    agent: Mapped["User"] = relationship("User", back_populates="call_assignments")
    
    __table_args__ = (
        Index("idx_assignments_agent_date", "agent_id", "assigned_at"),
    )


class Analytics(Base):
    """Model for storing aggregated analytics data."""
    
    __tablename__ = "analytics"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    dimension: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_analytics_metric_date", "metric_name", "date"),
    )
