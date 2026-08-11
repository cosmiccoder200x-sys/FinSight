"""Auth and user schemas."""

from __future__ import annotations

from pydantic import ConfigDict, BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_admin: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    monthly_income: float | None = Field(default=None, ge=0)
    monthly_debt_payments: float | None = Field(default=None, ge=0)
    emergency_fund: float | None = Field(default=None, ge=0)
    risk_tolerance: str | None = Field(default=None, max_length=20)
    currency: str | None = Field(default=None, max_length=8)


class ProfileOut(BaseModel):
    currency: str
    monthly_income: float
    monthly_debt_payments: float
    emergency_fund: float
    risk_tolerance: str

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    detail: str
