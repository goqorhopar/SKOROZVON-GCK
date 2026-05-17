"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
import enum

from app.models import UserRole, CallStatus, CallDirection


# ============== USER SCHEMAS ==============

class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.AGENT


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    full_name: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


# ============== TOKEN SCHEMAS ==============

class Token(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    """Schema for refreshing access token."""
    refresh_token: str


# ============== CALL SCHEMAS ==============

class CallBase(BaseModel):
    """Base call schema."""
    from_number: str = Field(..., min_length=10, max_length=20)
    to_number: str = Field(..., min_length=10, max_length=20)
    direction: CallDirection = CallDirection.OUTBOUND
    notes: Optional[str] = None


class CallCreate(CallBase):
    """Schema for creating a new call."""
    external_id: Optional[str] = Field(None, max_length=100)
    agent_id: Optional[int] = None


class CallUpdate(BaseModel):
    """Schema for updating a call."""
    status: Optional[CallStatus] = None
    duration_seconds: Optional[int] = Field(None, ge=0)
    recording_url: Optional[str] = None
    transcription: Optional[str] = None
    transcription_status: Optional[str] = None
    notes: Optional[str] = None
    agent_id: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class CallResponse(CallBase):
    """Schema for call response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    external_id: Optional[str] = None
    status: CallStatus
    duration_seconds: Optional[int] = None
    recording_url: Optional[str] = None
    transcription: Optional[str] = None
    transcription_status: Optional[str] = None
    agent_id: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CallListResponse(BaseModel):
    """Schema for paginated call list response."""
    items: List[CallResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ============== CALL ASSIGNMENT SCHEMAS ==============

class CallAssignmentBase(BaseModel):
    """Base call assignment schema."""
    outcome: Optional[str] = Field(None, max_length=255)
    quality_score: Optional[float] = Field(None, ge=0, le=100)


class CallAssignmentCreate(CallAssignmentBase):
    """Schema for creating a call assignment."""
    call_id: int
    agent_id: int


class CallAssignmentResponse(CallAssignmentBase):
    """Schema for call assignment response."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    call_id: int
    agent_id: int
    assigned_at: datetime
    completed_at: Optional[datetime] = None


# ============== ANALYTICS SCHEMAS ==============

class AnalyticsMetric(BaseModel):
    """Schema for analytics metric."""
    metric_name: str
    metric_value: float
    dimension: Optional[str] = None
    date: datetime


class DashboardStats(BaseModel):
    """Schema for dashboard statistics."""
    total_calls: int
    completed_calls: int
    pending_calls: int
    failed_calls: int
    average_duration: float
    total_agents: int
    active_agents: int
    conversion_rate: float


# ============== HEALTH CHECK SCHEMAS ==============

class HealthCheckResponse(BaseModel):
    """Schema for health check response."""
    status: str
    app: str
    environment: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============== ERROR SCHEMAS ==============

class ErrorResponse(BaseModel):
    """Schema for error responses."""
    detail: str
    error_code: Optional[str] = None
    field_errors: Optional[List[dict]] = None
