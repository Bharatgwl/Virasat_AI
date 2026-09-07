from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


AccountRole = Literal["seller", "buyer"]


class AccountSignup(BaseModel):
    role: AccountRole
    display_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=10)
    email: str | None = Field(default=None, max_length=180)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("phone")
    @classmethod
    def validate_indian_mobile(cls, value: str) -> str:
        if not value.isdigit() or value[0] not in "6789":
            raise ValueError("Enter a valid 10 digit Indian mobile number.")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if not value:
            return None
        if "@" not in value or "." not in value.rsplit("@", maxsplit=1)[-1]:
            raise ValueError("Enter a valid email.")
        return value.lower()


class AccountLogin(BaseModel):
    role: AccountRole
    identifier: str = Field(min_length=4, max_length=180)
    password: str = Field(min_length=6, max_length=128)


class GoogleAuthRequest(BaseModel):
    role: AccountRole
    access_token: str = Field(min_length=20)


class Account(BaseModel):
    id: UUID
    role: AccountRole
    display_name: str
    phone: str | None = None
    email: str | None = None
    auth_provider: Literal["password", "google"] = "password"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class AccountSession(BaseModel):
    account: Account
    token_type: Literal["app", "supabase"] = "app"
    access_token: str


class AccountCreateRow(BaseModel):
    role: AccountRole
    display_name: str
    phone: str | None = None
    email: str | None = None
    password_hash: str
    auth_provider: Literal["password", "google"] = "password"


class AccountUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=10, max_length=10)
    email: str | None = Field(default=None, max_length=180)


class AuthMe(BaseModel):
    account: Account | None = None


class RoleGuard(BaseModel):
    expected_role: AccountRole
    actual_role: AccountRole

    @model_validator(mode="after")
    def require_matching_role(self) -> "RoleGuard":
        if self.expected_role != self.actual_role:
            raise ValueError("Account role does not match this area.")
        return self
